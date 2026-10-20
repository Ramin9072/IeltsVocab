import { getRedis } from "./redis/client";
import { K } from "./keys";
import { dayKey } from "./text";
import { getMany, view } from "./vocab-repo";
import { flatToRecord, toNum, type VocabView } from "./types";

export interface DayActivity {
  day: string;
  attempts: number;
  correct: number;
}

export interface Dashboard {
  totalVocab: number;
  attempts: number;
  correct: number;
  incorrect: number;
  accuracy: number | null; // percent, null until the first attempt
  practicedToday: number;
  dailyGoal: number;
  streak: number;
  dueCount: number;
  newCount: number;
  due: VocabView[];
  recentlyAdded: VocabView[];
  mostPracticed: VocabView[];
  mostDifficult: VocabView[];
  recentlyPracticed: VocabView[];
  activity: DayActivity[]; // last 14 days, oldest first
}

const DAY = 86_400_000;

/** Last `n` local calendar days ending today, newest first. */
export function lastDays(now: number, tz: string, n: number): string[] {
  const out: string[] = [];
  for (let i = 0; out.length < n && i < n + 3; i++) {
    const d = dayKey(now - i * DAY, tz);
    if (!out.includes(d)) out.push(d);
  }
  return out;
}

export function computeStreak(days: string[], counts: number[]): number {
  // days/counts are newest first. Today may still be empty without breaking the streak.
  let i = counts[0] > 0 ? 0 : 1;
  let streak = 0;
  while (i < counts.length && counts[i] > 0) {
    streak++;
    i++;
  }
  return streak;
}

export async function getDashboard(uid: string, tz: string, dailyGoal: number, now = Date.now()): Promise<Dashboard> {
  const r = getRedis();
  const days = lastDays(now, tz, 60);
  const today = days[0];
  const [stats, practicedToday, total, newCount, dueCount, practiced, hard, recent, added, due, daily, dailyCorrect] =
    (await r.pipeline([
      ["HGETALL", K.stats(uid)],
      ["SCARD", K.practicedOn(uid, today)],
      ["ZCARD", K.vocabIndex(uid)],
      ["SCARD", K.newIdx(uid)],
      ["ZCOUNT", K.reviewQueue(uid), "-inf", now],
      ["ZRANGE", K.practiceIdx(uid), "+inf", "(0", "BYSCORE", "REV", "LIMIT", 0, 5],
      ["ZRANGE", K.hardIdx(uid), 0, 4, "REV"],
      ["ZRANGE", K.recentIdx(uid), 0, 4, "REV"],
      ["ZRANGE", K.vocabIndex(uid), 0, 4, "REV"],
      ["ZRANGE", K.reviewQueue(uid), "-inf", now, "BYSCORE", "LIMIT", 0, 5],
      ["HMGET", K.daily(uid), ...days],
      ["HMGET", K.dailyCorrect(uid), ...days],
    ])) as [unknown, number, number, number, number, string[], string[], string[], string[], string[], (string | null)[], (string | null)[]];

  const s = flatToRecord(stats);
  const attempts = toNum(s.attempts);
  const correct = toNum(s.correct);
  const counts = daily.map((v) => toNum(v ?? undefined));
  const correctCounts = dailyCorrect.map((v) => toNum(v ?? undefined));

  const allIds = [...new Set([...practiced, ...hard, ...recent, ...added, ...due])];
  const byId = new Map((await getMany(uid, allIds)).map((v) => [v.id, view(v, now)]));
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((v): v is VocabView => Boolean(v));

  const activity: DayActivity[] = days
    .slice(0, 14)
    .map((day, i) => ({ day, attempts: counts[i], correct: correctCounts[i] }))
    .reverse();

  return {
    totalVocab: Number(total),
    attempts,
    correct,
    incorrect: toNum(s.incorrect),
    accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : null,
    practicedToday: Number(practicedToday),
    dailyGoal,
    streak: computeStreak(days, counts),
    dueCount: Number(dueCount),
    newCount: Number(newCount),
    due: pick(due),
    recentlyAdded: pick(added),
    mostPracticed: pick(practiced),
    mostDifficult: pick(hard),
    recentlyPracticed: pick(recent),
    activity,
  };
}
