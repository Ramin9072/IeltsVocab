import { describe, expect, it } from "vitest";
import { buildOptions, judge, availableKinds } from "@/lib/questions";
import type { VocabItem } from "@/lib/types";

let n = 0;
const item = (english: string, persian: string, extra: Partial<VocabItem> = {}): VocabItem => ({
  id: `id-${++n}`, ownerId: "u", english, persian, definition: "", example: "", partOfSpeech: "", synonyms: [], antonyms: [],
  pronunciation: "", tags: [], collectionId: null, notes: "", difficulty: "medium", createdAt: 0, updatedAt: 0,
  practiceCount: 0, correctCount: 0, incorrectCount: 0, lastPracticedAt: null, nextReviewAt: null, level: 0,
  intervalDays: 0, recent: "", version: 1, ...extra,
});

describe("answer options", () => {
  const happy = item("happy", "شاد، خوشحال", { synonyms: ["glad"] });
  const glad = item("glad", "خوشحال");
  const sad = item("sad", "غمگین");
  const angry = item("angry", "عصبانی");
  const tired = item("tired", "خسته");
  const pool = [happy, glad, sad, angry, tired];

  it("includes the correct answer exactly once", () => {
    const opts = buildOptions(happy, "en-fa", pool)!;
    expect(opts.filter((o) => o === happy.persian)).toHaveLength(1);
  });

  it("never offers a distractor that shares a meaning with the answer", () => {
    for (let i = 0; i < 40; i++) {
      const enFa = buildOptions(happy, "en-fa", pool)!;
      expect(enFa).not.toContain("خوشحال"); // glad's translation overlaps happy's second meaning
      const faEn = buildOptions(happy, "fa-en", pool)!;
      expect(faEn).not.toContain("glad");
    }
  });

  it("has no duplicate options", () => {
    const dup = [item("one", "یک"), item("uno", "یک"), item("two", "دو"), item("three", "سه")];
    const opts = buildOptions(dup[0], "en-fa", dup)!;
    expect(new Set(opts).size).toBe(opts.length);
  });

  it("returns null when no unambiguous distractor exists", () => {
    expect(buildOptions(happy, "en-fa", [happy, glad])).toBeNull();
  });

  it("only offers kinds the word has data for", () => {
    expect(availableKinds(item("a", ""))).toEqual([]);
    expect(availableKinds(item("a", "ب"))).toEqual(["en-fa", "fa-en", "type"]);
    expect(availableKinds(item("a", "", { definition: "d" }))).toEqual(["def-en", "type"]);
  });
});

describe("judging answers", () => {
  const w = item("take off", "بلند شدن، برخاستن");
  it("accepts any listed Persian meaning and ignores half-space/space differences", () => {
    expect(judge(w, "en-fa", "بلند شدن، برخاستن").correct).toBe(true);
    expect(judge(w, "en-fa", "برخاستن").correct).toBe(true);
    expect(judge(w, "en-fa", "پرواز").correct).toBe(false);
  });
  it("normalizes case, spacing and trailing punctuation for English typing", () => {
    expect(judge(w, "type", "  Take   OFF. ").correct).toBe(true);
    expect(judge(w, "type", "take").correct).toBe(false);
    expect(judge(w, "type", "").correct).toBe(false);
  });
  it("accepts a missing leading 'to'", () => {
    expect(judge(item("to improve", "بهبود"), "type", "improve").correct).toBe(true);
  });
  it("returns the stored answer for feedback", () => {
    expect(judge(w, "fa-en", "nope").correctAnswer).toBe("take off");
    expect(judge(w, "en-fa", "nope").correctAnswer).toBe(w.persian);
  });
});
