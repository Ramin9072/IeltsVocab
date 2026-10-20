import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { Redis as IORedis } from "ioredis";
import { addWord, closeTestRedis, U1, U2, useTestRedis } from "./helpers";
import { buildSession, submitAnswer } from "@/lib/practice";
import { deleteVocab, getOwned, updateVocab } from "@/lib/vocab-repo";
import { getDashboard } from "@/lib/stats";
import { createCollection } from "@/lib/collections-repo";
import { createUser } from "@/lib/users-repo";
import { sessionSchema } from "@/lib/schemas";
import { K } from "@/lib/keys";
import { word } from "./helpers";

let io: IORedis;
beforeEach(async () => {
  io = await useTestRedis();
});
afterAll(closeTestRedis);

const ans = (vocabId: string, answer: string, kind: "en-fa" | "fa-en" | "def-en" | "type" = "type", requestId = randomUUID()) => ({
  requestId, vocabId, kind, answer,
});
const NOW = Date.UTC(2026, 9, 19, 12, 0, 0);

describe("practice counters", () => {
  it("a correct answer increases the count by exactly one and records everything", async () => {
    const w = await addWord(U1, "resilient", { persian: "مقاوم" });
    const res = await submitAnswer(U1, ans(w.id, "Resilient"), NOW);
    expect(res).toMatchObject({ correct: true, practiceCount: 1, correctCount: 1, incorrectCount: 0, replayed: false });
    const got = await getOwned(U1, w.id);
    expect(got).toMatchObject({ practiceCount: 1, correctCount: 1, incorrectCount: 0, lastPracticedAt: NOW, level: 1 });
    expect(got.nextReviewAt).toBe(NOW + 86_400_000);
    expect(await io.sismember(K.newIdx(U1), w.id)).toBe(0);
    expect(await io.zscore(K.practiceIdx(U1), w.id)).toBe("1");
    expect(await io.zscore(K.reviewQueue(U1), w.id)).toBe(String(NOW + 86_400_000));
    expect(await io.hgetall(K.stats(U1))).toMatchObject({ attempts: "1", correct: "1" });
    expect(await io.llen(K.history(U1))).toBe(1);
    expect(JSON.parse((await io.lindex(K.history(U1), 0))!)).toMatchObject({ vocabId: w.id, correct: true, at: NOW });
  });

  it("an incorrect answer counts as an attempt, schedules early review and marks the word difficult", async () => {
    const w = await addWord(U1, "ubiquitous", { persian: "همه جا حاضر" });
    const res = await submitAnswer(U1, ans(w.id, "wrong"), NOW);
    expect(res).toMatchObject({ correct: false, correctAnswer: "ubiquitous", practiceCount: 1, incorrectCount: 1, correctCount: 0 });
    const got = await getOwned(U1, w.id);
    expect(got.nextReviewAt).toBe(NOW + 10 * 60_000);
    expect(await io.zscore(K.hardIdx(U1), w.id)).not.toBeNull();
    expect(await io.hgetall(K.stats(U1))).toMatchObject({ attempts: "1", incorrect: "1" });
  });

  it("different attempts each count once", async () => {
    const w = await addWord(U1, "alpha", { persian: "آ" });
    for (let i = 0; i < 3; i++) await submitAnswer(U1, ans(w.id, "alpha"), NOW + i);
    await submitAnswer(U1, ans(w.id, "nope"), NOW + 10);
    expect(await getOwned(U1, w.id)).toMatchObject({ practiceCount: 4, correctCount: 3, incorrectCount: 1 });
  });

  it("does not count a retried request (same request id)", async () => {
    const w = await addWord(U1, "retry", { persian: "ر" });
    const body = ans(w.id, "retry");
    const first = await submitAnswer(U1, body, NOW);
    const second = await submitAnswer(U1, body, NOW + 5);
    expect(second.replayed).toBe(true);
    expect(second.practiceCount).toBe(first.practiceCount);
    expect(await getOwned(U1, w.id)).toMatchObject({ practiceCount: 1, correctCount: 1 });
    expect(await io.llen(K.history(U1))).toBe(1);
  });

  it("counts once when the same request is sent concurrently (double-click)", async () => {
    const w = await addWord(U1, "double", { persian: "د" });
    const body = ans(w.id, "double");
    const results = await Promise.all(Array.from({ length: 8 }, () => submitAnswer(U1, body, NOW)));
    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
    expect(await getOwned(U1, w.id)).toMatchObject({ practiceCount: 1, correctCount: 1 });
    expect(await io.hget(K.stats(U1), "attempts")).toBe("1");
  });

  it("counts every distinct concurrent answer exactly once", async () => {
    const w = await addWord(U1, "parallel", { persian: "پ" });
    await Promise.all(Array.from({ length: 6 }, () => submitAnswer(U1, ans(w.id, "parallel"), NOW)));
    expect(await getOwned(U1, w.id)).toMatchObject({ practiceCount: 6, correctCount: 6 });
  });

  it("starting a session and listing words do not change any counters", async () => {
    const w = await addWord(U1, "quiet", { persian: "آرام" });
    await addWord(U1, "loud", { persian: "بلند" });
    await buildSession(U1, sessionSchema.parse({ mode: "multiple-choice", count: 5 }));
    expect(await getOwned(U1, w.id)).toMatchObject({ practiceCount: 0, lastPracticedAt: null });
    expect(await io.exists(K.stats(U1))).toBe(0);
    expect(await io.llen(K.history(U1))).toBe(0);
  });

  it("survives an edit that lands between reading and writing an answer", async () => {
    const w = await addWord(U1, "race", { persian: "ر" });
    await submitAnswer(U1, ans(w.id, "race"), NOW);
    await updateVocab(U1, w.id, word("race", { persian: "رقابت" }));
    await submitAnswer(U1, ans(w.id, "race"), NOW + 1);
    expect(await getOwned(U1, w.id)).toMatchObject({ practiceCount: 2, persian: "رقابت" });
  });

  it("refuses to record an answer for someone else's word, or a deleted one", async () => {
    const theirs = await addWord(U2, "theirs", { persian: "ت" });
    await expect(submitAnswer(U1, ans(theirs.id, "theirs"))).rejects.toMatchObject({ status: 404 });
    expect(await getOwned(U2, theirs.id)).toMatchObject({ practiceCount: 0 });
    const mine = await addWord(U1, "mine", { persian: "م" });
    await deleteVocab(U1, mine.id);
    await expect(submitAnswer(U1, ans(mine.id, "mine"))).rejects.toMatchObject({ status: 404 });
    expect(await io.exists(K.stats(U1))).toBe(0);
  });

  it("removes a deleted word from the review queue and practice indexes", async () => {
    const w = await addWord(U1, "bye", { persian: "خ" });
    await submitAnswer(U1, ans(w.id, "nope"), NOW);
    await deleteVocab(U1, w.id);
    for (const key of [K.reviewQueue(U1), K.hardIdx(U1), K.recentIdx(U1), K.practiceIdx(U1)]) expect(await io.zcard(key)).toBe(0);
  });
});

describe("practice sessions", () => {
  it("asks for words that are due before others and honours the question count", async () => {
    const due = await addWord(U1, "due word", { persian: "سررسید" });
    for (const n of ["a1", "a2", "a3", "a4", "a5", "a6"]) await addWord(U1, n, { persian: `پ${n}` });
    await submitAnswer(U1, ans(due.id, "wrong"), NOW - 3_600_000); // due again 10 minutes later
    const { questions } = await buildSession(U1, sessionSchema.parse({ mode: "typing", count: 3 }), NOW);
    expect(questions).toHaveLength(3);
    expect(questions.map((q) => q.vocabId)).toContain(due.id);
  });

  it("builds multiple-choice questions whose options contain the answer once and never the answer key", async () => {
    for (const [e, p] of [["cat", "گربه"], ["dog", "سگ"], ["bird", "پرنده"], ["fish", "ماهی"], ["cow", "گاو"]]) await addWord(U1, e, { persian: p });
    const { questions } = await buildSession(U1, sessionSchema.parse({ mode: "en-fa", count: 5 }));
    expect(questions).toHaveLength(5);
    for (const q of questions) {
      expect(q.kind).toBe("en-fa");
      expect(q.options!.length).toBe(4);
      expect(new Set(q.options).size).toBe(4);
      expect(Object.keys(q)).not.toContain("answer");
    }
  });

  it("falls back to typing when too few unambiguous options exist", async () => {
    await addWord(U1, "solo", { persian: "تنها" });
    const { questions } = await buildSession(U1, sessionSchema.parse({ mode: "en-fa", count: 5 }));
    expect(questions[0].kind).toBe("type");
    expect(questions[0].options).toBeUndefined();
  });

  it("limits to a collection and to selected words, ignoring foreign ids", async () => {
    const c = await createCollection(U1, "C");
    const inC = await addWord(U1, "inside", { persian: "درون", collectionId: c.id });
    await addWord(U1, "outside", { persian: "بیرون" });
    const foreign = await addWord(U2, "foreign", { persian: "خارجی" });
    const byCollection = await buildSession(U1, sessionSchema.parse({ mode: "typing", count: 10, collectionId: c.id }));
    expect(byCollection.questions.map((q) => q.vocabId)).toEqual([inC.id]);
    const selected = await buildSession(U1, sessionSchema.parse({ mode: "typing", count: 10, ids: [inC.id, foreign.id] }));
    expect(selected.questions.map((q) => q.vocabId)).toEqual([inC.id]);
    await expect(buildSession(U1, sessionSchema.parse({ mode: "typing", count: 5, collectionId: randomUUID() }))).rejects.toMatchObject({ status: 400 });
  });

  it("filters new vs previously practiced words and explains when nothing is available", async () => {
    const a = await addWord(U1, "practiced", { persian: "الف" });
    const b = await addWord(U1, "fresh", { persian: "ب" });
    await submitAnswer(U1, ans(a.id, "practiced"), NOW);
    const fresh = await buildSession(U1, sessionSchema.parse({ mode: "typing", wordFilter: "new" }));
    expect(fresh.questions.map((q) => q.vocabId)).toEqual([b.id]);
    const old = await buildSession(U1, sessionSchema.parse({ mode: "typing", wordFilter: "practiced" }));
    expect(old.questions.map((q) => q.vocabId)).toEqual([a.id]);
    await io.flushall();
    await expect(buildSession(U1, sessionSchema.parse({ mode: "typing" }))).rejects.toMatchObject({ status: 422, code: "nothing_to_practice" });
  });

  it("difficult-word review only uses difficult or due words", async () => {
    const hard = await addWord(U1, "hardword", { persian: "سخت" });
    await addWord(U1, "easyword", { persian: "آسان" });
    await submitAnswer(U1, ans(hard.id, "nope"));
    const { questions } = await buildSession(U1, sessionSchema.parse({ mode: "difficult", count: 5 }), Date.now() + 3_600_000);
    expect(questions.map((q) => q.vocabId)).toEqual([hard.id]);
  });

  it("skips words that lack the data a mode needs and reports how many", async () => {
    await addWord(U1, "nodef", { persian: "ب" });
    await addWord(U1, "hasdef", { definition: "a definition" });
    const res = await buildSession(U1, sessionSchema.parse({ mode: "definition", count: 5 }));
    expect(res.questions).toHaveLength(1);
    expect(res.skipped).toBe(1);
  });
});

describe("dashboard statistics (real stored data)", () => {
  it("is empty and honest for a brand new user", async () => {
    const d = await getDashboard(U1, "UTC", 10, NOW);
    expect(d).toMatchObject({ totalVocab: 0, attempts: 0, correct: 0, incorrect: 0, accuracy: null, practicedToday: 0, streak: 0, dueCount: 0 });
    expect(d.mostPracticed).toEqual([]);
    expect(d.activity).toHaveLength(14);
  });

  it("reflects practice, accuracy, streak and rankings", async () => {
    const a = await addWord(U1, "alpha", { persian: "آ" });
    const b = await addWord(U1, "beta", { persian: "ب" });
    const DAY = 86_400_000;
    await submitAnswer(U1, ans(a.id, "alpha"), NOW - DAY);
    await submitAnswer(U1, ans(a.id, "alpha"), NOW);
    await submitAnswer(U1, ans(b.id, "bad"), NOW);
    const d = await getDashboard(U1, "UTC", 10, NOW);
    expect(d).toMatchObject({ totalVocab: 2, attempts: 3, correct: 2, incorrect: 1, accuracy: 67, practicedToday: 2, streak: 2 });
    expect(d.mostPracticed[0].id).toBe(a.id);
    expect(d.mostDifficult.map((v) => v.id)).toEqual([b.id]);
    expect(d.recentlyPracticed).toHaveLength(2);
    expect(d.activity.at(-1)).toMatchObject({ attempts: 2, correct: 1 });
    expect(d.dueCount).toBe(0);
    const later = await getDashboard(U1, "UTC", 10, NOW + 4 * DAY);
    expect(later.dueCount).toBe(2);
    expect(later.streak).toBe(0);
  });

  it("buckets days in the user's time zone", async () => {
    const user = await createUser({ email: "t@example.com", name: "T", password: "password123", timezone: "Asia/Tehran" });
    const a = await addWord(user.id, "tz", { persian: "ت" });
    const lateUtc = Date.UTC(2026, 9, 19, 22, 0, 0); // already Oct 20 in Tehran (UTC+3:30)
    await submitAnswer(user.id, ans(a.id, "tz"), lateUtc);
    expect(await io.hkeys(K.daily(user.id))).toEqual(["2026-10-20"]);
    const d = await getDashboard(user.id, "Asia/Tehran", 10, lateUtc);
    expect(d).toMatchObject({ practicedToday: 1, streak: 1 });
  });
});
