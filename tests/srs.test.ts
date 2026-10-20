import { describe, expect, it } from "vitest";
import { LADDER_DAYS, nextReview, reviewStatus, struggleScore } from "@/lib/srs";

const DAY = 86_400_000;
const NOW = 1_700_000_000_000;

describe("review scheduling", () => {
  it("moves up the ladder on correct answers and lengthens the interval", () => {
    let s = { level: 0, recent: "" };
    const intervals: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = nextReview(s, true, NOW);
      intervals.push(r.intervalDays);
      s = { level: r.level, recent: r.recent };
    }
    expect(intervals).toEqual([1, 3, 7, 14]);
  });

  it("caps at the top of the ladder", () => {
    const r = nextReview({ level: 6, recent: "111111" }, true, NOW);
    expect(r.level).toBe(6);
    expect(r.intervalDays).toBe(LADDER_DAYS[6]);
  });

  it("schedules an incorrect answer soon and drops two levels", () => {
    const r = nextReview({ level: 4, recent: "1111" }, false, NOW);
    expect(r.level).toBe(2);
    expect(r.nextReviewAt).toBe(NOW + 10 * 60_000);
  });

  it("never goes below level 0", () => {
    expect(nextReview({ level: 1, recent: "" }, false, NOW).level).toBe(0);
  });

  it("halves the interval for words that were recently missed twice", () => {
    const r = nextReview({ level: 2, recent: "0110" }, true, NOW); // recent becomes 01101 -> 2 wrong in last 5
    expect(r.level).toBe(3);
    expect(r.intervalDays).toBe(3.5);
    expect(r.nextReviewAt).toBe(NOW + 3.5 * DAY);
  });

  it("keeps only the last 10 results", () => {
    const r = nextReview({ level: 0, recent: "0000000000" }, true, NOW);
    expect(r.recent).toBe("0000000001");
  });

  it("derives review status", () => {
    expect(reviewStatus({ practiceCount: 0, level: 0, nextReviewAt: null }, NOW)).toBe("new");
    expect(reviewStatus({ practiceCount: 2, level: 2, nextReviewAt: NOW - 1 }, NOW)).toBe("due");
    expect(reviewStatus({ practiceCount: 2, level: 2, nextReviewAt: NOW + DAY }, NOW)).toBe("learning");
    expect(reviewStatus({ practiceCount: 9, level: 5, nextReviewAt: NOW + DAY }, NOW)).toBe("mastered");
  });

  it("scores struggling words above zero only when mistakes dominate", () => {
    expect(struggleScore(0, 2)).toBeGreaterThan(0);
    expect(struggleScore(10, 1)).toBeLessThan(0);
  });
});
