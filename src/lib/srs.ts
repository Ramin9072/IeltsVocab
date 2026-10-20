/**
 * Spaced repetition (a small Leitner-style ladder, documented in README).
 *
 *   level:      0    1    2    3    4     5     6
 *   interval:   —    1d   3d   7d   14d   30d   60d
 *
 * - Correct answer  -> level + 1 (max 6); next review = now + ladder interval.
 *                      If 2+ of the last 5 answers were wrong the interval is halved.
 * - Wrong answer    -> level - 2 (min 0); next review in 10 minutes.
 * - Mastered        -> level >= 5.
 */
export const LADDER_DAYS = [0, 1, 3, 7, 14, 30, 60] as const;
export const RELEARN_MINUTES = 10;
export const MASTERED_LEVEL = 5;
export const MAX_LEVEL = LADDER_DAYS.length - 1;
const DAY_MS = 86_400_000;

export type ReviewStatus = "new" | "due" | "learning" | "mastered";

export interface SrsState {
  level: number;
  recent: string; // last 10 results, oldest first: "1" correct, "0" wrong
}

export interface SrsResult {
  level: number;
  recent: string;
  intervalDays: number;
  nextReviewAt: number;
}

export function nextReview(state: SrsState, correct: boolean, now: number): SrsResult {
  const level = correct ? Math.min(state.level + 1, MAX_LEVEL) : Math.max(0, state.level - 2);
  const recent = (state.recent + (correct ? "1" : "0")).slice(-10);
  if (!correct) {
    return { level, recent, intervalDays: 0, nextReviewAt: now + RELEARN_MINUTES * 60_000 };
  }
  let days: number = LADDER_DAYS[level];
  const wrongLately = recent.slice(-5).split("").filter((c) => c === "0").length;
  if (wrongLately >= 2) days = days / 2;
  return { level, recent, intervalDays: days, nextReviewAt: now + Math.round(days * DAY_MS) };
}

export function reviewStatus(
  item: { practiceCount: number; level: number; nextReviewAt: number | null },
  now: number,
): ReviewStatus {
  if (item.practiceCount === 0) return "new";
  if (item.nextReviewAt !== null && item.nextReviewAt <= now) return "due";
  return item.level >= MASTERED_LEVEL ? "mastered" : "learning";
}

/** Higher = more of a struggle. Items with a score > 0 live in the "difficult" index. */
export function struggleScore(correct: number, incorrect: number): number {
  return incorrect - 0.5 * correct;
}
