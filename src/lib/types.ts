import type { ReviewStatus } from "./srs";

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "preposition",
  "conjunction",
  "pronoun",
  "interjection",
  "phrase",
  "sentence",
  "other",
] as const;

export interface VocabFields {
  english: string;
  persian: string;
  definition: string;
  example: string;
  partOfSpeech: string;
  synonyms: string[];
  antonyms: string[];
  pronunciation: string;
  tags: string[];
  collectionId: string | null;
  notes: string;
  difficulty: Difficulty;
}

export interface VocabItem extends VocabFields {
  id: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  practiceCount: number;
  correctCount: number;
  incorrectCount: number;
  lastPracticedAt: number | null;
  nextReviewAt: number | null;
  level: number;
  intervalDays: number;
  recent: string;
  version: number;
}

export type VocabView = VocabItem & { status: ReviewStatus };

export interface Collection {
  id: string;
  ownerId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: number;
  timezone: string;
  lang: "en" | "fa";
  theme: "light" | "dark" | "system";
  dailyGoal: number;
}

export const toNum = (v: string | undefined, d = 0) => {
  if (v === undefined || v === "") return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/** HGETALL replies are flat [k, v, k, v...] arrays (or objects, depending on transport). */
export function flatToRecord(flat: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(flat)) {
    for (let i = 0; i + 1 < flat.length; i += 2) out[String(flat[i])] = String(flat[i + 1]);
  } else if (flat && typeof flat === "object") {
    for (const [k, v] of Object.entries(flat)) out[k] = String(v);
  }
  return out;
}

const parseList = (s: string | undefined): string[] => {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};

export function parseVocab(flat: unknown): VocabItem | null {
  const h = flatToRecord(flat);
  if (!h.id || !h.ownerId) return null;
  return {
    id: h.id,
    ownerId: h.ownerId,
    english: h.english ?? "",
    persian: h.persian ?? "",
    definition: h.definition ?? "",
    example: h.example ?? "",
    partOfSpeech: h.partOfSpeech ?? "",
    synonyms: parseList(h.synonyms),
    antonyms: parseList(h.antonyms),
    pronunciation: h.pronunciation ?? "",
    tags: parseList(h.tags),
    collectionId: h.collectionId ? h.collectionId : null,
    notes: h.notes ?? "",
    difficulty: (DIFFICULTIES as readonly string[]).includes(h.difficulty) ? (h.difficulty as Difficulty) : "medium",
    createdAt: toNum(h.createdAt),
    updatedAt: toNum(h.updatedAt),
    practiceCount: toNum(h.practiceCount),
    correctCount: toNum(h.correctCount),
    incorrectCount: toNum(h.incorrectCount),
    lastPracticedAt: h.lastPracticedAt ? toNum(h.lastPracticedAt) : null,
    nextReviewAt: h.nextReviewAt ? toNum(h.nextReviewAt) : null,
    level: toNum(h.level),
    intervalDays: toNum(h.intervalDays),
    recent: h.recent ?? "",
    version: toNum(h.version, 1),
  };
}

export function editableToFlat(v: VocabFields): string[] {
  return [
    "english", v.english,
    "persian", v.persian,
    "definition", v.definition,
    "example", v.example,
    "partOfSpeech", v.partOfSpeech,
    "synonyms", JSON.stringify(v.synonyms),
    "antonyms", JSON.stringify(v.antonyms),
    "pronunciation", v.pronunciation,
    "tags", JSON.stringify(v.tags),
    "collectionId", v.collectionId ?? "",
    "notes", v.notes,
    "difficulty", v.difficulty,
  ];
}

export function vocabToFlat(v: VocabItem): string[] {
  return [
    "id", v.id,
    "ownerId", v.ownerId,
    ...editableToFlat(v),
    "createdAt", String(v.createdAt),
    "updatedAt", String(v.updatedAt),
    "practiceCount", String(v.practiceCount),
    "correctCount", String(v.correctCount),
    "incorrectCount", String(v.incorrectCount),
    "lastPracticedAt", v.lastPracticedAt === null ? "" : String(v.lastPracticedAt),
    "nextReviewAt", v.nextReviewAt === null ? "" : String(v.nextReviewAt),
    "level", String(v.level),
    "intervalDays", String(v.intervalDays),
    "recent", v.recent,
    "version", String(v.version),
  ];
}
