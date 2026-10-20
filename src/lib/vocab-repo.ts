import { randomUUID } from "node:crypto";
import { getRedis } from "./redis/client";
import { atomic, guarded } from "./redis/atomic";
import type { Cmd, RedisClient } from "./redis/types";
import { K } from "./keys";
import { DuplicateError, HttpError, NotFoundError } from "./errors";
import { alphaScore, normalizeEnglish, normalizeTag, normalizeTags, tokenize } from "./text";
import { editableToFlat, parseVocab, vocabToFlat, type VocabFields, type VocabItem, type VocabView } from "./types";
import type { ListQuery, VocabInput } from "./schemas";
import { reviewStatus } from "./srs";
import { assertCollectionOwned } from "./collections-repo";

export const view = (item: VocabItem, now = Date.now()): VocabView => ({ ...item, status: reviewStatus(item, now) });

const foldPersian = (s: string) => s.replace(/[يى]/g, "ی").replace(/ك/g, "ک");

export function cleanInput(input: VocabInput): VocabFields {
  return {
    ...input,
    english: input.english.trim(),
    persian: foldPersian(input.persian),
    tags: normalizeTags(input.tags),
    synonyms: [...new Set(input.synonyms)],
    antonyms: [...new Set(input.antonyms)],
  };
}

const searchTokens = (v: VocabFields) => tokenize(v.english, v.persian, ...v.tags);

/** Indexes that depend on editable fields. Removed and re-added whenever those fields change. */
function attrAdd(uid: string, id: string, v: VocabFields): Cmd[] {
  return [
    ["ZADD", K.alpha(uid), alphaScore(normalizeEnglish(v.english)), id],
    ["SADD", K.diffIdx(uid, v.difficulty), id],
    ...(v.collectionId ? [["SADD", K.collectionItems(uid, v.collectionId), id] as Cmd] : []),
    ...v.tags.flatMap((t): Cmd[] => [["SADD", K.tagIdx(uid, t), id], ["HINCRBY", K.tagCounts(uid), t, 1]]),
    ...searchTokens(v).map((tok): Cmd => ["ZADD", K.tokens(uid), 0, `${tok}|${id}`]),
  ];
}

function attrRemove(uid: string, id: string, v: VocabFields): Cmd[] {
  return [
    ["ZREM", K.alpha(uid), id],
    ["SREM", K.diffIdx(uid, "easy"), id],
    ["SREM", K.diffIdx(uid, "medium"), id],
    ["SREM", K.diffIdx(uid, "hard"), id],
    ...(v.collectionId ? [["SREM", K.collectionItems(uid, v.collectionId), id] as Cmd] : []),
    ...v.tags.flatMap((t): Cmd[] => [["SREM", K.tagIdx(uid, t), id], ["HINCRBY", K.tagCounts(uid), t, -1]]),
    ...searchTokens(v).map((tok): Cmd => ["ZREM", K.tokens(uid), `${tok}|${id}`]),
  ];
}

/** Indexes driven by practice state, removed only when a word is deleted. */
function stateRemove(uid: string, id: string): Cmd[] {
  return [
    ["ZREM", K.vocabIndex(uid), id],
    ["ZREM", K.practiceIdx(uid), id],
    ["ZREM", K.recentIdx(uid), id],
    ["ZREM", K.hardIdx(uid), id],
    ["ZREM", K.reviewQueue(uid), id],
    ["SREM", K.newIdx(uid), id],
    ["SREM", K.masteredIdx(uid), id],
  ];
}

export async function getOwned(uid: string, id: string, r: RedisClient = getRedis()): Promise<VocabItem> {
  const [flat, member] = await r.pipeline([["HGETALL", K.vocab(id)], ["ZSCORE", K.vocabIndex(uid), id]]);
  const item = parseVocab(flat);
  // Ownership is enforced twice: the record's owner AND membership in the caller's own index.
  if (!item || item.ownerId !== uid || member === null) throw new NotFoundError("Word");
  return item;
}

export async function getMany(uid: string, ids: string[]): Promise<VocabItem[]> {
  if (ids.length === 0) return [];
  const replies = await getRedis().pipeline(ids.map((id) => ["HGETALL", K.vocab(id)]));
  return replies.map(parseVocab).filter((v): v is VocabItem => v !== null && v.ownerId === uid);
}

export async function createVocab(uid: string, raw: VocabInput, now = Date.now()): Promise<VocabItem> {
  const r = getRedis();
  const fields = cleanInput(raw);
  await assertCollectionOwned(uid, fields.collectionId);
  const norm = normalizeEnglish(fields.english);
  if (!norm) throw new HttpError(400, "validation", "English text is required");
  const id = randomUUID();
  // Atomic claim of the normalized text: this is what prevents duplicates, even under concurrent requests.
  const claimed = await r.exec<number>(["HSETNX", K.normMap(uid), norm, id]);
  if (Number(claimed) !== 1) {
    throw new DuplicateError(await r.exec<string | null>(["HGET", K.normMap(uid), norm]));
  }
  const item: VocabItem = {
    ...fields,
    id,
    ownerId: uid,
    createdAt: now,
    updatedAt: now,
    practiceCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    lastPracticedAt: null,
    nextReviewAt: null,
    level: 0,
    intervalDays: 0,
    recent: "",
    version: 1,
  };
  try {
    await atomic(r, [
      ["HSET", K.vocab(id), ...vocabToFlat(item)],
      ["ZADD", K.vocabIndex(uid), now, id],
      ["ZADD", K.practiceIdx(uid), 0, id],
      ["SADD", K.newIdx(uid), id],
      ...attrAdd(uid, id, fields),
    ]);
  } catch (e) {
    await r.exec(["HDEL", K.normMap(uid), norm]).catch(() => undefined);
    throw e;
  }
  return item;
}

export async function updateVocab(uid: string, id: string, raw: VocabInput, now = Date.now()): Promise<VocabItem> {
  const r = getRedis();
  const fields = cleanInput(raw);
  await assertCollectionOwned(uid, fields.collectionId);
  const newNorm = normalizeEnglish(fields.english);
  if (!newNorm) throw new HttpError(400, "validation", "English text is required");

  for (let attempt = 0; attempt < 4; attempt++) {
    const old = await getOwned(uid, id, r);
    const oldNorm = normalizeEnglish(old.english);
    const renamed = newNorm !== oldNorm;
    if (renamed) {
      const claimed = await r.exec<number>(["HSETNX", K.normMap(uid), newNorm, id]);
      if (Number(claimed) !== 1) {
        throw new DuplicateError(await r.exec<string | null>(["HGET", K.normMap(uid), newNorm]));
      }
    }
    const next: VocabItem = { ...old, ...fields, updatedAt: now, version: old.version + 1 };
    const res = await guarded(r, {
      key: K.vocab(id),
      expectedVersion: old.version,
      cmds: [
        ...attrRemove(uid, id, old),
        ["HSET", K.vocab(id), ...editableToFlat(fields), "updatedAt", now, "version", next.version],
        ...attrAdd(uid, id, fields),
        ...(renamed ? [["HDEL", K.normMap(uid), oldNorm] as Cmd] : []),
      ],
    });
    if (res.status === "ok") return next;
    if (renamed) await r.exec(["HDEL", K.normMap(uid), newNorm]).catch(() => undefined);
    if (res.status === "missing") throw new NotFoundError("Word");
    // "conflict": someone (a practice answer, another tab) changed the word since we read it. Re-read and retry.
  }
  throw new HttpError(409, "conflict", "This word was changed elsewhere. Reload and try again.");
}

export async function deleteVocab(uid: string, id: string): Promise<void> {
  const r = getRedis();
  for (let attempt = 0; attempt < 4; attempt++) {
    const old = await getOwned(uid, id, r);
    const res = await guarded(r, {
      key: K.vocab(id),
      expectedVersion: old.version,
      cmds: [
        ...attrRemove(uid, id, old),
        ...stateRemove(uid, id),
        ["HDEL", K.normMap(uid), normalizeEnglish(old.english)],
        ["DEL", K.vocab(id)],
      ],
    });
    if (res.status === "ok") return;
    if (res.status === "missing") throw new NotFoundError("Word");
  }
  throw new HttpError(409, "conflict", "This word was changed elsewhere. Reload and try again.");
}

export async function countVocab(uid: string): Promise<number> {
  return Number(await getRedis().exec(["ZCARD", K.vocabIndex(uid)]));
}

export async function tagCounts(uid: string): Promise<{ tag: string; count: number }[]> {
  const flat = await getRedis().exec<string[]>(["HGETALL", K.tagCounts(uid)]);
  const out: { tag: string; count: number }[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const count = Number(flat[i + 1]);
    if (count > 0) out.push({ tag: flat[i], count });
  }
  return out.sort((a, b) => a.tag.localeCompare(b.tag));
}

/** Prefix search over indexed tokens. Only matching tokens are read, never the whole library. */
async function searchIds(r: RedisClient, uid: string, query: string): Promise<string[]> {
  const toks = tokenize(query).slice(0, 4);
  if (toks.length === 0) return [];
  const lists = await r.pipeline(
    toks.map((t) => ["ZRANGEBYLEX", K.tokens(uid), `[${t}`, `[${t}\u{10FFFF}`, "LIMIT", 0, 2000]),
  );
  let acc: string[] | null = null;
  for (const list of lists as string[][]) {
    const ids = new Set(list.map((m) => m.slice(m.lastIndexOf("|") + 1)));
    acc = acc === null ? [...ids] : acc.filter((x) => ids.has(x));
  }
  return acc ?? [];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export async function listVocab(uid: string, q: ListQuery, now = Date.now()): Promise<Page<VocabView>> {
  const r = getRedis();
  const temps: string[] = [];
  const tmp = () => {
    const k = K.tmp(uid, randomUUID());
    temps.push(k);
    return k;
  };
  const empty: Page<VocabView> = { items: [], total: 0, page: q.page, pageSize: q.pageSize, pages: 0 };
  try {
    const filters: string[] = [];
    if (q.collection) {
      if ((await r.exec(["ZSCORE", K.collections(uid), q.collection])) === null) return empty;
      filters.push(K.collectionItems(uid, q.collection));
    }
    if (q.tag) filters.push(K.tagIdx(uid, normalizeTag(q.tag)));
    if (q.difficulty) filters.push(K.diffIdx(uid, q.difficulty));
    if (q.status === "new") filters.push(K.newIdx(uid));
    else if (q.status === "difficult") filters.push(K.hardIdx(uid));
    else if (q.status === "mastered") filters.push(K.masteredIdx(uid));
    else if (q.status === "due") {
      const due = tmp();
      await r.pipeline([
        ["ZUNIONSTORE", due, 1, K.reviewQueue(uid)],
        ["ZREMRANGEBYSCORE", due, `(${now}`, "+inf"],
        ["EXPIRE", due, 60],
      ]);
      filters.push(due);
    }
    if (q.q) {
      const ids = await searchIds(r, uid, q.q);
      if (ids.length === 0) return empty;
      const s = tmp();
      const cmds: Cmd[] = [];
      for (let i = 0; i < ids.length; i += 500) cmds.push(["SADD", s, ...ids.slice(i, i + 500)]);
      cmds.push(["EXPIRE", s, 60]);
      await r.pipeline(cmds);
      filters.push(s);
    }

    const base = q.sort === "alpha" ? K.alpha(uid) : q.sort === "practice" ? K.practiceIdx(uid) : K.vocabIndex(uid);
    const rev = q.sort === "newest" || q.sort === "practice";
    let source = base;
    if (filters.length > 0) {
      source = tmp();
      await r.pipeline([
        // WEIGHTS 1 0 0...: keep the base index's score (date / alpha / count), ignore the filter sets' scores.
        ["ZINTERSTORE", source, 1 + filters.length, base, ...filters, "WEIGHTS", 1, ...filters.map(() => 0)],
        ["EXPIRE", source, 60],
      ]);
    }
    const total = Number(await r.exec(["ZCARD", source]));
    const start = (q.page - 1) * q.pageSize;
    const ids = await r.exec<string[]>(["ZRANGE", source, start, start + q.pageSize - 1, ...(rev ? ["REV"] : [])]);
    const items = (await getMany(uid, ids)).map((v) => view(v, now));
    return { items, total, page: q.page, pageSize: q.pageSize, pages: Math.ceil(total / q.pageSize) };
  } finally {
    if (temps.length) await r.exec(["DEL", ...temps]).catch(() => undefined);
  }
}
