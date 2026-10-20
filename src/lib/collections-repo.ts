import { randomUUID } from "node:crypto";
import { getRedis } from "./redis/client";
import { atomic } from "./redis/atomic";
import { K } from "./keys";
import { DuplicateError, HttpError, NotFoundError } from "./errors";
import { flatToRecord, toNum, type Collection } from "./types";

const nameKey = (name: string) => name.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

function parseCollection(flat: unknown): Collection | null {
  const h = flatToRecord(flat);
  if (!h.id || !h.ownerId) return null;
  return { id: h.id, ownerId: h.ownerId, name: h.name ?? "", createdAt: toNum(h.createdAt), updatedAt: toNum(h.updatedAt) };
}

/** Returns the collection only if it belongs to `uid` (ownership is checked on every call). */
export async function getCollection(uid: string, id: string): Promise<Collection> {
  const r = getRedis();
  const [flat, member] = await r.pipeline([["HGETALL", K.collection(id)], ["ZSCORE", K.collections(uid), id]]);
  const c = parseCollection(flat);
  if (!c || c.ownerId !== uid || member === null) throw new NotFoundError("Collection");
  return c;
}

export async function assertCollectionOwned(uid: string, id: string | null) {
  if (!id) return;
  const r = getRedis();
  const member = await r.exec(["ZSCORE", K.collections(uid), id]);
  if (member === null) throw new HttpError(400, "validation", "That collection does not exist");
}

export async function createCollection(uid: string, name: string, now = Date.now()): Promise<Collection> {
  const r = getRedis();
  const id = randomUUID();
  const nk = nameKey(name);
  const claimed = await r.exec<number>(["HSETNX", K.collectionNames(uid), nk, id]);
  if (Number(claimed) !== 1) {
    const existing = await r.exec<string | null>(["HGET", K.collectionNames(uid), nk]);
    throw new DuplicateError(existing, "A collection with this name");
  }
  const c: Collection = { id, ownerId: uid, name, createdAt: now, updatedAt: now };
  try {
    await atomic(r, [
      ["HSET", K.collection(id), "id", id, "ownerId", uid, "name", name, "createdAt", now, "updatedAt", now],
      ["ZADD", K.collections(uid), now, id],
    ]);
  } catch (e) {
    await r.exec(["HDEL", K.collectionNames(uid), nk]).catch(() => undefined);
    throw e;
  }
  return c;
}

export async function findOrCreateCollection(uid: string, name: string): Promise<string> {
  const r = getRedis();
  const existing = await r.exec<string | null>(["HGET", K.collectionNames(uid), nameKey(name)]);
  if (existing) return existing;
  try {
    return (await createCollection(uid, name)).id;
  } catch (e) {
    if (e instanceof DuplicateError && e.existingId) return e.existingId;
    throw e;
  }
}

export async function listCollections(uid: string): Promise<(Collection & { count: number })[]> {
  const r = getRedis();
  const ids = await r.exec<string[]>(["ZRANGE", K.collections(uid), 0, -1]);
  if (ids.length === 0) return [];
  const replies = await r.pipeline(ids.flatMap((id) => [["HGETALL", K.collection(id)], ["SCARD", K.collectionItems(uid, id)]]));
  const out: (Collection & { count: number })[] = [];
  ids.forEach((_, i) => {
    const c = parseCollection(replies[i * 2]);
    if (c && c.ownerId === uid) out.push({ ...c, count: Number(replies[i * 2 + 1]) });
  });
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function renameCollection(uid: string, id: string, name: string, now = Date.now()): Promise<Collection> {
  const r = getRedis();
  const old = await getCollection(uid, id);
  const oldKey = nameKey(old.name);
  const newKey = nameKey(name);
  if (newKey !== oldKey) {
    const claimed = await r.exec<number>(["HSETNX", K.collectionNames(uid), newKey, id]);
    if (Number(claimed) !== 1) {
      const existing = await r.exec<string | null>(["HGET", K.collectionNames(uid), newKey]);
      throw new DuplicateError(existing, "A collection with this name");
    }
  }
  try {
    await atomic(r, [
      ["HSET", K.collection(id), "name", name, "updatedAt", now],
      ...(newKey !== oldKey ? [["HDEL", K.collectionNames(uid), oldKey]] : []),
    ]);
  } catch (e) {
    if (newKey !== oldKey) await r.exec(["HDEL", K.collectionNames(uid), newKey]).catch(() => undefined);
    throw e;
  }
  return { ...old, name, updatedAt: now };
}

// Unassigns words only if they still exist, so a concurrent delete cannot leave a stray hash behind.
const UNASSIGN = `
for i = 2, #ARGV do
  if redis.call('EXISTS', ARGV[i]) == 1 then
    redis.call('HSET', ARGV[i], 'collectionId', '', 'updatedAt', ARGV[1])
    redis.call('HINCRBY', ARGV[i], 'version', 1)
  end
end
return #ARGV - 1
`;

/** Deleting a collection never deletes words: they are moved to "no collection". */
export async function deleteCollection(uid: string, id: string, now = Date.now()): Promise<{ unassigned: number }> {
  const r = getRedis();
  const c = await getCollection(uid, id);
  const itemsKey = K.collectionItems(uid, id);
  let cursor = "0";
  let unassigned = 0;
  do {
    const [next, members] = await r.exec<[string, string[]]>(["SSCAN", itemsKey, cursor, "COUNT", 200]);
    cursor = String(next);
    if (members.length) {
      await r.exec(["EVAL", UNASSIGN, 0, String(now), ...members.map((m) => K.vocab(m))]);
      unassigned += members.length;
    }
  } while (cursor !== "0");
  await atomic(r, [
    ["DEL", itemsKey],
    ["DEL", K.collection(id)],
    ["ZREM", K.collections(uid), id],
    ["HDEL", K.collectionNames(uid), nameKey(c.name)],
  ]);
  return { unassigned };
}
