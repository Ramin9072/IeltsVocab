import { meaningParts, normalizeEnglish, persianKey } from "./text";
import { scoreSpeech, type SpeechScore } from "./speech-score";
import type { VocabItem } from "./types";
import type { PracticeMode } from "./schemas";

export type QuestionKind = "en-fa" | "fa-en" | "def-en" | "type" | "speak";

export interface Question {
  id: string;
  vocabId: string;
  kind: QuestionKind;
  prompt: string;
  options?: string[];
}

const MODE_KINDS: Record<PracticeMode, QuestionKind[]> = {
  "en-fa": ["en-fa"],
  "fa-en": ["fa-en"],
  definition: ["def-en"],
  "multiple-choice": ["en-fa", "fa-en", "def-en"],
  typing: ["type"],
  difficult: ["en-fa", "fa-en", "def-en", "type"],
  speaking: ["speak"],
};

export const modeKinds = (mode: PracticeMode) => MODE_KINDS[mode];

/** The sentence to read aloud: the example sentence, or the word itself when it is a phrase or sentence. */
export function speakTarget(item: VocabItem): string {
  if (item.example.trim()) return item.example.trim();
  return item.english.trim().split(/\s+/).length >= 3 ? item.english.trim() : "";
}

/** Which question kinds a word has enough data for. */
export function availableKinds(item: VocabItem): QuestionKind[] {
  const kinds: QuestionKind[] = [];
  if (item.persian) kinds.push("en-fa", "fa-en");
  if (item.definition) kinds.push("def-en");
  if (item.persian || item.definition) kinds.push("type");
  if (speakTarget(item)) kinds.push("speak");
  return kinds;
}

export function promptFor(item: VocabItem, kind: QuestionKind): string {
  switch (kind) {
    case "en-fa":
      return item.english;
    case "fa-en":
      return item.persian;
    case "def-en":
      return item.definition;
    case "type":
      return item.persian || item.definition;
    case "speak":
      return speakTarget(item);
  }
}

export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const overlaps = (a: string[], b: string[]) => a.some((x) => b.includes(x));
const synKeys = (list: string[]) => list.map(normalizeEnglish);

/** True if `other` could ALSO be a correct answer to the question about `item`. */
function isAmbiguous(item: VocabItem, other: VocabItem, kind: QuestionKind): boolean {
  if (other.id === item.id) return true;
  if (normalizeEnglish(other.english) === normalizeEnglish(item.english)) return true;
  const sharesMeaning = overlaps(meaningParts(item.persian), meaningParts(other.persian));
  const synonymous =
    synKeys(item.synonyms).includes(normalizeEnglish(other.english)) ||
    synKeys(other.synonyms).includes(normalizeEnglish(item.english));
  switch (kind) {
    case "en-fa":
      return sharesMeaning;
    case "fa-en":
      return sharesMeaning || synonymous;
    case "def-en":
      return synonymous || normalizeEnglish(other.definition) === normalizeEnglish(item.definition);
    default:
      return false;
  }
}

const optionText = (v: VocabItem, kind: QuestionKind) => (kind === "en-fa" ? v.persian : v.english);

/**
 * Builds up to `size` options (the correct one plus unambiguous distractors).
 * Returns null when fewer than 2 options are possible; the caller then asks a typing question.
 */
export function buildOptions(
  item: VocabItem,
  kind: QuestionKind,
  pool: VocabItem[],
  rng: () => number = Math.random,
  size = 4,
): string[] | null {
  const correct = optionText(item, kind);
  const seen = new Set<string>([persianKey(correct), normalizeEnglish(correct)]);
  const picked: string[] = [];
  for (const cand of shuffle(pool, rng)) {
    if (picked.length >= size - 1) break;
    const text = optionText(cand, kind);
    if (!text || isAmbiguous(item, cand, kind)) continue;
    // def-en needs the candidate to be a real alternative, so require it to differ from other picks too
    const key = kind === "en-fa" ? persianKey(text) : normalizeEnglish(text);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(text);
  }
  if (picked.length === 0) return null;
  return shuffle([correct, ...picked], rng);
}

const stripArticle = (s: string) => s.replace(/^(to|a|an|the)\s+/, "");

export function judge(
  item: VocabItem,
  kind: QuestionKind,
  answer: string,
): { correct: boolean; correctAnswer: string; speech?: SpeechScore } {
  if (kind === "speak") {
    const target = speakTarget(item);
    const speech = scoreSpeech(target, answer); // `answer` is what the speech recognizer heard
    return { correct: speech.correct, correctAnswer: target, speech };
  }
  if (kind === "en-fa") {
    const a = persianKey(answer);
    const correct = a !== "" && (a === persianKey(item.persian) || meaningParts(item.persian).includes(a));
    return { correct, correctAnswer: item.persian };
  }
  const a = normalizeEnglish(answer);
  const target = normalizeEnglish(item.english);
  const correct = a !== "" && (a === target || stripArticle(a) === stripArticle(target));
  return { correct, correctAnswer: item.english };
}
