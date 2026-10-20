export const PASS_SCORE = 0.8;

export interface SpeechWord {
  word: string;
  ok: boolean;
}

export interface SpeechScore {
  score: number; // 0..1: share of the target's words the recognizer heard, in order
  correct: boolean;
  words: SpeechWord[];
}

/** Lower-cased words without punctuation ("Don't stop!" -> ["don't", "stop"]). */
export function speechWords(s: string): string[] {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter(Boolean);
}

/**
 * Compares what the speech recognizer heard with the sentence the learner was asked to read.
 * Words are aligned with a longest-common-subsequence, so one missed word does not shift the rest.
 * This measures whether the recognizer understood each word; it is a guide, not a phonetic exam.
 */
export function scoreSpeech(target: string, heard: string): SpeechScore {
  const t = speechWords(target);
  const h = speechWords(heard);
  if (t.length === 0) return { score: 0, correct: false, words: [] };

  const lcs: number[][] = Array.from({ length: t.length + 1 }, () => new Array<number>(h.length + 1).fill(0));
  for (let i = 1; i <= t.length; i++) {
    for (let j = 1; j <= h.length; j++) {
      lcs[i][j] = t[i - 1] === h[j - 1] ? lcs[i - 1][j - 1] + 1 : Math.max(lcs[i - 1][j], lcs[i][j - 1]);
    }
  }
  const ok = new Array<boolean>(t.length).fill(false);
  for (let i = t.length, j = h.length; i > 0 && j > 0; ) {
    if (t[i - 1] === h[j - 1]) {
      ok[i - 1] = true;
      i--;
      j--;
    } else if (lcs[i - 1][j] >= lcs[i][j - 1]) i--;
    else j--;
  }
  const matched = ok.filter(Boolean).length;
  const score = matched / t.length;
  return { score, correct: score >= PASS_SCORE, words: t.map((word, i) => ({ word, ok: ok[i] })) };
}
