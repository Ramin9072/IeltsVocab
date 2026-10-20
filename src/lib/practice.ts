import { randomUUID } from "node:crypto";
import { getRedis } from "./redis/client";
import { guarded } from "./redis/atomic";
import type { Cmd } from "./redis/types";
import { K } from "./keys";
import { HttpError } from "./errors";
import { dayKey } from "./text";
import { MASTERED_LEVEL, nextReview, reviewStatus, struggleScore } from "./srs";
import { getMany, getOwned } from "./vocab-repo";
import { getUser } from "./users-repo";
import { assertCollectionOwned } from "./collections-repo";
import { availableKinds, buildOptions, judge, modeKinds, promptFor, shuffle, type Question, type QuestionKind } from "./questions";
import type { answerSchema, sessionSchema } from "./schemas";
import type { z } from "zod";
import type { VocabItem } from "./types";

type SessionInput = z.infer<typeof sessionSchema>;
type AnswerInput = z.infer<typeof answerSchema>;

export interface SessionResult {
  questions: Question[];
  skipped: number; // candidate words that lacked the data this mode needs
}

/**
 * Picks words with Redis set algebra (never loads the whole library):
 * overdue words first, then difficult ones, then random others.
 * An explicit selection of words is used as-is.
 */
export async function buildSession(
  uid: string,
  p: SessionInput,
  now = Date.now(),
  rng: () => number = Math.random,
): Promise<SessionResult> {
  const r = getRedis();
  const temps: string[] = [];
  const tmp = () => {
    const k = K.tmp(uid, randomUUID());
    temps.push(k);
    return k;
  };
  try {
    let pool: string = K.vocabIndex(uid);
    if (p.ids?.length) {
      const sel = tmp();
      pool = tmp();
      await r.pipeline([
        ["SADD", sel, ...p.ids],
        // intersecting with the caller's own index guarantees foreign ids are ignored
        ["ZINTERSTORE", pool, 2, K.vocabIndex(uid), sel, "WEIGHTS", 1, 0],
      ]);
    } else if (p.collectionId) {
      await assertCollectionOwned(uid, p.collectionId);
      // Materialize as a ZSET (collection items are a plain SET); intersecting with the user's index also enforces ownership.
      pool = tmp();
      await r.exec(["ZINTERSTORE", pool, 2, K.vocabIndex(uid), K.collectionItems(uid, p.collectionId), "WEIGHTS", 1, 0]);
    }
    if (p.wordFilter !== "any") {
      const out = tmp();
      await r.exec(
        p.wordFilter === "new"
          ? ["ZINTERSTORE", out, 2, pool, K.newIdx(uid), "WEIGHTS", 1, 0]
          : ["ZDIFFSTORE", out, 2, pool, K.newIdx(uid)],
      );
      pool = out;
    }
    if (p.mode === "difficult") {
      const hardOrDue = tmp();
      const dueOnly = tmp();
      const out = tmp();
      await r.pipeline([
        ["ZUNIONSTORE", dueOnly, 1, K.reviewQueue(uid)],
        ["ZREMRANGEBYSCORE", dueOnly, `(${now}`, "+inf"],
        ["ZUNIONSTORE", hardOrDue, 2, K.hardIdx(uid), dueOnly, "WEIGHTS", 0, 0],
        ["ZINTERSTORE", out, 2, pool, hardOrDue, "WEIGHTS", 1, 0],
      ]);
      pool = out;
    }

    const wanted = Math.min(p.count * 2, 100); // over-fetch: some words may lack the data this mode needs
    let ids: string[];
    if (p.ids?.length) {
      ids = await r.exec<string[]>(["ZRANGE", pool, 0, -1]);
    } else {
      const due = tmp();
      const hard = tmp();
      const [, , dueIds] = (await r.pipeline([
        ["ZINTERSTORE", due, 2, pool, K.reviewQueue(uid), "WEIGHTS", 0, 1],
        ["ZREMRANGEBYSCORE", due, `(${now}`, "+inf"],
        ["ZRANGE", due, 0, wanted - 1],
        ["ZINTERSTORE", hard, 2, pool, K.hardIdx(uid), "WEIGHTS", 0, 1],
      ])) as [unknown, unknown, string[], unknown];
      const hardList = (await r.exec<string[]>(["ZRANGE", hard, 0, wanted - 1, "REV"])) ?? [];
      const random = (await r.exec<string[] | null>(["ZRANDMEMBER", pool, wanted])) ?? [];
      ids = [...new Set([...(dueIds ?? []), ...hardList, ...random])].slice(0, wanted);
    }
    if (ids.length === 0) {
      throw new HttpError(422, "nothing_to_practice", "There are no words to practice with these settings");
    }

    const allowed = modeKinds(p.mode);
    const candidates = await getMany(uid, ids);
    const usable = candidates.filter((c) => availableKinds(c).some((k) => allowed.includes(k)));
    const skipped = candidates.length - usable.length;
    if (usable.length === 0) {
      throw new HttpError(422, "nothing_to_practice", "None of these words have the details this practice mode needs");
    }
    const chosen = p.ids?.length ? shuffle(usable, rng).slice(0, p.count) : shuffle(usable.slice(0, p.count), rng);

    // Distractors come from a random sample of the user's own vocabulary.
    const sampleIds = (await r.exec<string[] | null>(["ZRANDMEMBER", K.vocabIndex(uid), 60])) ?? [];
    const sample = await getMany(uid, sampleIds);
    const distractorPool = [...new Map([...sample, ...chosen].map((v) => [v.id, v])).values()];

    const questions = chosen.map((item) => makeQuestion(item, p.mode, distractorPool, rng));
    return { questions, skipped };
  } finally {
    if (temps.length) await r.exec(["DEL", ...temps]).catch(() => undefined);
  }
}

function makeQuestion(item: VocabItem, mode: SessionInput["mode"], pool: VocabItem[], rng: () => number): Question {
  const kinds = availableKinds(item).filter((k) => modeKinds(mode).includes(k));
  let kind: QuestionKind;
  if (mode === "difficult" && item.level >= 2 && kinds.includes("type")) kind = "type";
  else if (mode === "difficult") kind = shuffle(kinds.filter((k) => k !== "type").length ? kinds.filter((k) => k !== "type") : kinds, rng)[0];
  else kind = shuffle(kinds, rng)[0];

  let options: string[] | undefined;
  if (kind !== "type") {
    const built = buildOptions(item, kind, pool, rng);
    if (built) options = built;
    else kind = "type"; // not enough unambiguous options: ask for typing instead
  }
  return { id: randomUUID(), vocabId: item.id, kind, prompt: promptFor(item, kind), ...(options ? { options } : {}) };
}

export interface AnswerResult {
  correct: boolean;
  correctAnswer: string;
  vocabId: string;
  practiceCount: number;
  correctCount: number;
  incorrectCount: number;
  nextReviewAt: number;
  intervalDays: number;
  level: number;
  status: string;
  replayed: boolean;
}

/**
 * Records ONE completed attempt. Exactly-once semantics come from three things done in a single Lua script:
 *   1. the idempotency key (requestId) is checked first, so retries/double-clicks replay the stored result;
 *   2. the word's version must match what we computed from, so concurrent writers can't double-count;
 *   3. counters, indexes, stats and history are updated together or not at all.
 */
export async function submitAnswer(uid: string, input: AnswerInput, now = Date.now()): Promise<AnswerResult> {
  const r = getRedis();
  const idemKey = K.idem(uid, input.requestId);
  const prev = await r.exec<string | null>(["GET", idemKey]);
  if (prev) return { ...(JSON.parse(prev) as AnswerResult), replayed: true };
  const tz = (await getUser(uid))?.timezone ?? "UTC";

  for (let attempt = 0; attempt < 12; attempt++) {
    if (attempt > 0) await new Promise((res) => setTimeout(res, 5 + Math.random() * 25 * attempt)); // jittered backoff under contention
    const item = await getOwned(uid, input.vocabId, r);
    const { correct, correctAnswer } = judge(item, input.kind, input.answer);
    const srs = nextReview(item, correct, now);
    const count = item.practiceCount + 1;
    const right = item.correctCount + (correct ? 1 : 0);
    const wrong = item.incorrectCount + (correct ? 0 : 1);
    const score = struggleScore(right, wrong);
    const day = dayKey(now, tz);
    const result: AnswerResult = {
      correct,
      correctAnswer,
      vocabId: item.id,
      practiceCount: count,
      correctCount: right,
      incorrectCount: wrong,
      nextReviewAt: srs.nextReviewAt,
      intervalDays: srs.intervalDays,
      level: srs.level,
      status: reviewStatus({ practiceCount: count, level: srs.level, nextReviewAt: srs.nextReviewAt }, now),
      replayed: false,
    };
    const id = item.id;
    const cmds: Cmd[] = [
      ["HINCRBY", K.vocab(id), "practiceCount", 1],
      ["HINCRBY", K.vocab(id), correct ? "correctCount" : "incorrectCount", 1],
      ["HSET", K.vocab(id), "lastPracticedAt", now, "nextReviewAt", srs.nextReviewAt, "level", srs.level,
        "intervalDays", srs.intervalDays, "recent", srs.recent, "version", item.version + 1],
      ["ZADD", K.practiceIdx(uid), count, id],
      ["ZADD", K.recentIdx(uid), now, id],
      ["ZADD", K.reviewQueue(uid), srs.nextReviewAt, id],
      ["SREM", K.newIdx(uid), id],
      score > 0 ? ["ZADD", K.hardIdx(uid), score, id] : ["ZREM", K.hardIdx(uid), id],
      srs.level >= MASTERED_LEVEL ? ["SADD", K.masteredIdx(uid), id] : ["SREM", K.masteredIdx(uid), id],
      ["HINCRBY", K.stats(uid), "attempts", 1],
      ["HINCRBY", K.stats(uid), correct ? "correct" : "incorrect", 1],
      ["HINCRBY", K.daily(uid), day, 1],
      ...(correct ? [["HINCRBY", K.dailyCorrect(uid), day, 1] as Cmd] : []),
      ["SADD", K.practicedOn(uid, day), id],
      ["EXPIRE", K.practicedOn(uid, day), 100 * 86_400],
      ["LPUSH", K.history(uid), JSON.stringify({ requestId: input.requestId, vocabId: id, english: item.english, kind: input.kind, correct, at: now })],
      ["LTRIM", K.history(uid), 0, 999],
    ];
    const res = await guarded(r, {
      key: K.vocab(id),
      expectedVersion: item.version,
      cmds,
      idemKey,
      idemValue: JSON.stringify(result),
    });
    if (res.status === "ok") return result;
    if (res.status === "replay") return { ...(JSON.parse(res.value) as AnswerResult), replayed: true };
    if (res.status === "missing") throw new HttpError(404, "not_found", "Word not found");
    // conflict: the word changed under us (edit or another answer); recompute from fresh state
  }
  throw new HttpError(409, "conflict", "Please try submitting that answer again");
}
