import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { Redis as IORedis } from "ioredis";
import { addWord, closeTestRedis, U1, U2, useTestRedis } from "./helpers";
import { PASS_SCORE, scoreSpeech, speechWords } from "@/lib/speech-score";
import { availableKinds, judge, speakTarget } from "@/lib/questions";
import { buildSession, submitAnswer } from "@/lib/practice";
import { getOwned } from "@/lib/vocab-repo";
import { answerSchema, sessionSchema } from "@/lib/schemas";
import { K } from "@/lib/keys";

describe("pronunciation scoring", () => {
  const target = "She is a resilient person who never gives up.";

  it("ignores case and punctuation when splitting words", () => {
    expect(speechWords("Don't stop -- right now!")).toEqual(["don't", "stop", "right", "now"]);
    expect(speechWords("It’s “fine”")).toEqual(["it's", "fine"]);
    expect(speechWords("")).toEqual([]);
  });

  it("scores a perfect reading as 100% and marks every word ok", () => {
    const r = scoreSpeech(target, "she is a resilient person who never gives up");
    expect(r.score).toBe(1);
    expect(r.correct).toBe(true);
    expect(r.words.every((w) => w.ok)).toBe(true);
    expect(r.words.map((w) => w.word)).toHaveLength(9);
  });

  it("flags only the words that were not understood and keeps the rest aligned", () => {
    const r = scoreSpeech(target, "she is a resilient man who never gives up");
    expect(r.words.filter((w) => !w.ok).map((w) => w.word)).toEqual(["person"]);
    expect(r.score).toBeCloseTo(8 / 9);
    expect(r.correct).toBe(true); // 89% >= pass mark
  });

  it("handles skipped and extra words without shifting the alignment", () => {
    const skipped = scoreSpeech(target, "she is a person who never gives up");
    expect(skipped.words.filter((w) => !w.ok).map((w) => w.word)).toEqual(["resilient"]);
    const extra = scoreSpeech(target, "well she is a really resilient person who never ever gives up");
    expect(extra.score).toBe(1);
  });

  it("fails below the pass mark, on silence and on an empty target", () => {
    expect(PASS_SCORE).toBe(0.8);
    const bad = scoreSpeech(target, "hello there");
    expect(bad).toMatchObject({ score: 0, correct: false });
    expect(scoreSpeech(target, "").correct).toBe(false);
    expect(scoreSpeech("", "anything")).toEqual({ score: 0, correct: false, words: [] });
    expect(scoreSpeech(target, "she is a resilient").correct).toBe(false); // 4/9
  });

  it("counts repeated words individually", () => {
    const r = scoreSpeech("go go go", "go");
    expect(r.words.filter((w) => w.ok)).toHaveLength(1);
  });
});

describe("sentence choice and judging", () => {
  const base = { id: "x", ownerId: "u", persian: "", definition: "", example: "", partOfSpeech: "", synonyms: [], antonyms: [], pronunciation: "", tags: [], collectionId: null, notes: "", difficulty: "medium" as const, createdAt: 0, updatedAt: 0, practiceCount: 0, correctCount: 0, incorrectCount: 0, lastPracticedAt: null, nextReviewAt: null, level: 0, intervalDays: 0, recent: "", version: 1 };
  it("reads the example sentence, or the saved phrase itself when it has 3+ words", () => {
    expect(speakTarget({ ...base, english: "resilient", example: " She is resilient. " })).toBe("She is resilient.");
    expect(speakTarget({ ...base, english: "look forward to hearing" })).toBe("look forward to hearing");
    expect(speakTarget({ ...base, english: "resilient" })).toBe("");
    expect(speakTarget({ ...base, english: "take off" })).toBe("");
  });
  it("offers the speaking kind only when there is something to read", () => {
    expect(availableKinds({ ...base, english: "resilient" })).not.toContain("speak");
    expect(availableKinds({ ...base, english: "resilient", example: "She is resilient." })).toContain("speak");
  });
  it("judges on the server and returns the per-word result", () => {
    const item = { ...base, english: "resilient", example: "She is a resilient person" };
    const ok = judge(item, "speak", "she is a resilient person");
    expect(ok).toMatchObject({ correct: true, correctAnswer: "She is a resilient person" });
    expect(ok.speech?.words).toHaveLength(5);
    expect(judge(item, "speak", "nothing like it").correct).toBe(false);
  });
});

let io: IORedis;
beforeEach(async () => { io = await useTestRedis(); });
afterAll(closeTestRedis);
const NOW = Date.UTC(2026, 9, 19, 12, 0, 0);
const ex = "She is a resilient person who never gives up";

describe("pronunciation practice sessions and tracking", () => {
  it("only asks for words that have a sentence, and reports how many were left out", async () => {
    const a = await addWord(U1, "resilient", { example: ex });
    const b = await addWord(U1, "I look forward to hearing from you");
    await addWord(U1, "plain", { persian: "ساده" });
    const { questions, skipped } = await buildSession(U1, sessionSchema.parse({ mode: "speaking", count: 5 }));
    expect(questions.map((q) => q.vocabId).sort()).toEqual([a.id, b.id].sort());
    for (const q of questions) {
      expect(q.kind).toBe("speak");
      expect(q.options).toBeUndefined();
    }
    expect(questions.find((q) => q.vocabId === a.id)?.prompt).toBe(ex);
    expect(skipped).toBe(1);
  });

  it("explains when nothing can be read aloud", async () => {
    await addWord(U1, "plain", { persian: "ساده" });
    await expect(buildSession(U1, sessionSchema.parse({ mode: "speaking" }))).rejects.toMatchObject({ status: 422, code: "nothing_to_practice" });
  });

  it("counts a good reading as one correct attempt and schedules the review", async () => {
    const w = await addWord(U1, "resilient", { example: ex });
    const res = await submitAnswer(U1, answerSchema.parse({ requestId: randomUUID(), vocabId: w.id, kind: "speak", answer: ex.toLowerCase() }), NOW);
    expect(res).toMatchObject({ correct: true, score: 100, practiceCount: 1, correctCount: 1, replayed: false });
    expect(res.words).toHaveLength(9);
    expect(res.heard).toBe(ex.toLowerCase());
    expect(await getOwned(U1, w.id)).toMatchObject({ practiceCount: 1, correctCount: 1, level: 1 });
  });

  it("counts a poor reading as one incorrect attempt, with the missed words flagged", async () => {
    const w = await addWord(U1, "resilient", { example: ex });
    const res = await submitAnswer(U1, answerSchema.parse({ requestId: randomUUID(), vocabId: w.id, kind: "speak", answer: "she is a" }), NOW);
    expect(res.correct).toBe(false);
    expect(res.score).toBe(33);
    expect(res.words?.filter((x) => !x.ok).map((x) => x.word)).toEqual(["resilient", "person", "who", "never", "gives", "up"]);
    expect(await getOwned(U1, w.id)).toMatchObject({ practiceCount: 1, incorrectCount: 1 });
    expect(await io.zscore(K.hardIdx(U1), w.id)).not.toBeNull();
  });

  it("does not double count a retried or double-clicked check", async () => {
    const w = await addWord(U1, "resilient", { example: ex });
    const body = answerSchema.parse({ requestId: randomUUID(), vocabId: w.id, kind: "speak", answer: ex });
    const results = await Promise.all(Array.from({ length: 5 }, () => submitAnswer(U1, body, NOW)));
    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
    expect((await getOwned(U1, w.id)).practiceCount).toBe(1);
  });

  it("will not score a word that has nothing to read, or someone else's word", async () => {
    const plain = await addWord(U1, "plain");
    const none = await submitAnswer(U1, answerSchema.parse({ requestId: randomUUID(), vocabId: plain.id, kind: "speak", answer: "plain" }), NOW);
    expect(none.correct).toBe(false);
    const theirs = await addWord(U2, "resilient", { example: ex });
    await expect(submitAnswer(U1, answerSchema.parse({ requestId: randomUUID(), vocabId: theirs.id, kind: "speak", answer: ex }))).rejects.toMatchObject({ status: 404 });
  });
});
