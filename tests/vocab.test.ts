import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Redis as IORedis } from "ioredis";
import { addWord, closeTestRedis, U1, U2, useTestRedis, word } from "./helpers";
import { createVocab, deleteVocab, getOwned, listVocab, tagCounts, updateVocab } from "@/lib/vocab-repo";
import { createCollection, deleteCollection, listCollections, renameCollection } from "@/lib/collections-repo";
import { listQuerySchema } from "@/lib/schemas";
import { K } from "@/lib/keys";
import { DuplicateError, NotFoundError } from "@/lib/errors";

let io: IORedis;
beforeEach(async () => {
  io = await useTestRedis();
});
afterAll(closeTestRedis);

const q = (o: Record<string, unknown> = {}) => listQuerySchema.parse(o);

describe("vocabulary creation", () => {
  it("stores every field and starts with zeroed practice data", async () => {
    const v = await createVocab(
      U1,
      word("Resilient", { persian: "مقاوم", definition: "able to recover", tags: ["Adjective", " adjective "], difficulty: "hard", notes: "n" }),
    );
    const got = await getOwned(U1, v.id);
    expect(got).toMatchObject({
      english: "Resilient", persian: "مقاوم", ownerId: U1, tags: ["adjective"], difficulty: "hard",
      practiceCount: 0, correctCount: 0, incorrectCount: 0, lastPracticedAt: null, nextReviewAt: null,
    });
    expect(got.createdAt).toBeGreaterThan(0);
    expect(await io.sismember(K.newIdx(U1), v.id)).toBe(1);
    expect(await io.zscore(K.vocabIndex(U1), v.id)).not.toBeNull();
  });

  it("allows optional fields to be empty", async () => {
    const v = await addWord(U1, "ubiquitous");
    expect(v.persian).toBe("");
    expect(v.synonyms).toEqual([]);
  });

  it("rejects duplicates by normalized English text within one user", async () => {
    const a = await addWord(U1, "Take off");
    await expect(addWord(U1, "  take   OFF. ")).rejects.toBeInstanceOf(DuplicateError);
    const err = await addWord(U1, "TAKE OFF").catch((e) => e);
    expect(err.existingId).toBe(a.id);
    expect(await io.zcard(K.vocabIndex(U1))).toBe(1);
  });

  it("lets two different users save the same word", async () => {
    await addWord(U1, "resilient");
    await expect(addWord(U2, "resilient")).resolves.toBeTruthy();
  });

  it("creates exactly one word when the same word is submitted concurrently", async () => {
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => addWord(U1, "concurrent")));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await io.zcard(K.vocabIndex(U1))).toBe(1);
  });

  it("rejects a collection that is not the user's own", async () => {
    const c = await createCollection(U2, "Theirs");
    await expect(addWord(U1, "x", { collectionId: c.id })).rejects.toMatchObject({ status: 400 });
  });
});

describe("editing and deleting", () => {
  it("updates fields and moves the word between indexes", async () => {
    const c1 = await createCollection(U1, "One");
    const c2 = await createCollection(U1, "Two");
    const v = await addWord(U1, "alpha", { tags: ["a"], collectionId: c1.id, difficulty: "easy" });
    const u = await updateVocab(U1, v.id, word("alpha", { tags: ["b"], collectionId: c2.id, difficulty: "hard", persian: "آلفا" }));
    expect(u.version).toBe(v.version + 1);
    expect(await io.sismember(K.collectionItems(U1, c1.id), v.id)).toBe(0);
    expect(await io.sismember(K.collectionItems(U1, c2.id), v.id)).toBe(1);
    expect(await io.sismember(K.tagIdx(U1, "a"), v.id)).toBe(0);
    expect(await io.sismember(K.tagIdx(U1, "b"), v.id)).toBe(1);
    expect(await io.sismember(K.diffIdx(U1, "easy"), v.id)).toBe(0);
    expect(await io.sismember(K.diffIdx(U1, "hard"), v.id)).toBe(1);
    expect(await tagCounts(U1)).toEqual([{ tag: "b", count: 1 }]);
    expect((await getOwned(U1, v.id)).persian).toBe("آلفا");
  });

  it("re-keys the duplicate guard when the English text changes", async () => {
    const v = await addWord(U1, "old");
    await updateVocab(U1, v.id, word("new"));
    await expect(addWord(U1, "new")).rejects.toBeInstanceOf(DuplicateError);
    await expect(addWord(U1, "old")).resolves.toBeTruthy(); // the old text is free again
  });

  it("refuses to rename onto another word of the same user", async () => {
    await addWord(U1, "one");
    const two = await addWord(U1, "two");
    await expect(updateVocab(U1, two.id, word("ONE"))).rejects.toBeInstanceOf(DuplicateError);
    expect((await getOwned(U1, two.id)).english).toBe("two");
  });

  it("deletes the word from the record, every index and the review queue", async () => {
    const c = await createCollection(U1, "C");
    const v = await addWord(U1, "gone", { tags: ["t"], collectionId: c.id, persian: "رفته" });
    await io.zadd(K.reviewQueue(U1), 5, v.id);
    await io.zadd(K.hardIdx(U1), 3, v.id);
    await deleteVocab(U1, v.id);
    expect(await io.exists(K.vocab(v.id))).toBe(0);
    for (const key of [K.vocabIndex(U1), K.alpha(U1), K.practiceIdx(U1), K.reviewQueue(U1), K.hardIdx(U1), K.tokens(U1)]) {
      expect(await io.zcard(key)).toBe(0);
    }
    expect(await io.scard(K.newIdx(U1))).toBe(0);
    expect(await io.scard(K.collectionItems(U1, c.id))).toBe(0);
    expect(await io.hlen(K.normMap(U1))).toBe(0);
    await expect(getOwned(U1, v.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(addWord(U1, "gone")).resolves.toBeTruthy();
  });
});

describe("user data isolation", () => {
  it("never lets another user read, edit or delete a word", async () => {
    const mine = await addWord(U1, "private", { notes: "secret" });
    await expect(getOwned(U2, mine.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(updateVocab(U2, mine.id, word("hacked"))).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteVocab(U2, mine.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await getOwned(U1, mine.id)).english).toBe("private");
    expect((await listVocab(U2, q())).total).toBe(0);
    expect((await listVocab(U1, q())).total).toBe(1);
  });

  it("does not expose another user's collection through filters or listings", async () => {
    const theirs = await createCollection(U2, "Theirs");
    await addWord(U2, "theirword", { collectionId: theirs.id });
    expect((await listVocab(U1, q({ collection: theirs.id }))).total).toBe(0);
    expect(await listCollections(U1)).toEqual([]);
    await expect(renameCollection(U1, theirs.id, "mine now")).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteCollection(U1, theirs.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await listCollections(U2)).toHaveLength(1);
  });

  it("ignores a foreign word id even if the record exists", async () => {
    const theirs = await addWord(U2, "theirs");
    // plant the foreign id in U1's own index: ownerId must still block access
    await io.zadd(K.vocabIndex(U1), 1, theirs.id);
    await expect(getOwned(U1, theirs.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await listVocab(U1, q())).items).toEqual([]);
  });
});

describe("listing, search, filters, sorting, pagination", () => {
  beforeEach(async () => {
    const c = await createCollection(U1, "IELTS");
    await addWord(U1, "banana", { persian: "موز", tags: ["fruit"], difficulty: "easy", collectionId: c.id }, 1000);
    await addWord(U1, "apple", { persian: "سیب", tags: ["fruit", "red"], difficulty: "medium" }, 2000);
    await addWord(U1, "cherry tomato", { persian: "گوجه گیلاسی", tags: ["red"], difficulty: "hard", collectionId: c.id }, 3000);
    await addWord(U1, "drive", { persian: "رانندگی کردن", difficulty: "medium" }, 4000);
  });

  const names = async (query: Record<string, unknown>) => (await listVocab(U1, q(query))).items.map((i) => i.english);

  it("sorts newest, oldest, alphabetically and by practice count", async () => {
    expect(await names({ sort: "newest" })).toEqual(["drive", "cherry tomato", "apple", "banana"]);
    expect(await names({ sort: "oldest" })).toEqual(["banana", "apple", "cherry tomato", "drive"]);
    expect(await names({ sort: "alpha" })).toEqual(["apple", "banana", "cherry tomato", "drive"]);
    const apple = (await listVocab(U1, q())).items.find((i) => i.english === "apple")!;
    await io.zadd(K.practiceIdx(U1), 5, apple.id);
    expect((await names({ sort: "practice" }))[0]).toBe("apple");
  });

  it("filters by collection, tag and difficulty, and combines them", async () => {
    const [c] = await listCollections(U1);
    expect((await names({ collection: c.id, sort: "alpha" }))).toEqual(["banana", "cherry tomato"]);
    expect((await names({ tag: "red", sort: "alpha" }))).toEqual(["apple", "cherry tomato"]);
    expect((await names({ difficulty: "medium", sort: "alpha" }))).toEqual(["apple", "drive"]);
    expect((await names({ collection: c.id, tag: "red" }))).toEqual(["cherry tomato"]);
  });

  it("searches English and Persian by prefix, across words, without loading the library", async () => {
    expect(await names({ q: "app" })).toEqual(["apple"]);
    expect(await names({ q: "tom" })).toEqual(["cherry tomato"]);
    expect(await names({ q: "cherry tom" })).toEqual(["cherry tomato"]);
    expect(await names({ q: "موز" })).toEqual(["banana"]);
    expect(await names({ q: "red", sort: "alpha" })).toEqual(["apple", "cherry tomato"]); // matches tags too
    expect(await names({ q: "zzz" })).toEqual([]);
    expect(await names({ q: "app", tag: "fruit" })).toEqual(["apple"]);
    expect(await names({ q: "app", tag: "red", difficulty: "hard" })).toEqual([]);
  });

  it("filters by review status", async () => {
    const all = (await listVocab(U1, q())).items;
    const [a, b] = all;
    const now = Date.now();
    await io.srem(K.newIdx(U1), a.id, b.id);
    await io.zadd(K.reviewQueue(U1), now - 1000, a.id);
    await io.zadd(K.reviewQueue(U1), now + 1_000_000, b.id);
    await io.sadd(K.masteredIdx(U1), b.id);
    await io.zadd(K.hardIdx(U1), 2, a.id);
    expect((await names({ status: "new" })).length).toBe(2);
    expect(await names({ status: "due" })).toEqual([a.english]);
    expect(await names({ status: "mastered" })).toEqual([b.english]);
    expect(await names({ status: "difficult" })).toEqual([a.english]);
  });

  it("paginates with a correct total and leaves no temporary keys behind", async () => {
    const p1 = await listVocab(U1, q({ sort: "alpha", pageSize: 3, page: 1, tag: "red" }));
    expect(p1.total).toBe(2);
    const big = await listVocab(U1, q({ sort: "alpha", pageSize: 3, page: 1 }));
    const second = await listVocab(U1, q({ sort: "alpha", pageSize: 3, page: 2 }));
    expect(big.items.map((i) => i.english)).toEqual(["apple", "banana", "cherry tomato"]);
    expect(second.items.map((i) => i.english)).toEqual(["drive"]);
    expect(big.pages).toBe(2);
    expect(await io.keys("tmp:*")).toEqual([]);
  });
});

describe("collections", () => {
  it("enforces unique names (case-insensitive), renames and deletes without deleting words", async () => {
    const c = await createCollection(U1, "Academic");
    await expect(createCollection(U1, " academic ")).rejects.toBeInstanceOf(DuplicateError);
    const w = await addWord(U1, "thesis", { collectionId: c.id });
    await renameCollection(U1, c.id, "Academic words");
    await expect(createCollection(U1, "Academic")).resolves.toBeTruthy(); // old name is free
    expect((await listCollections(U1)).find((x) => x.id === c.id)).toMatchObject({ name: "Academic words", count: 1 });
    const res = await deleteCollection(U1, c.id);
    expect(res.unassigned).toBe(1);
    const after = await getOwned(U1, w.id);
    expect(after.collectionId).toBeNull();
    expect(await io.exists(K.collection(c.id))).toBe(0);
  });
});
