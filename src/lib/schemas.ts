import { z } from "zod";
import { DIFFICULTIES, PARTS_OF_SPEECH } from "./types";
import { UUID_RE, isValidTimeZone } from "./text";

const text = (max: number) => z.string().trim().max(max).default("");
const list = (maxItems: number, maxLen: number) =>
  z.array(z.string().trim().min(1).max(maxLen)).max(maxItems).default([]);
const uuid = z.string().regex(UUID_RE, "Invalid id");
const pw = z
  .string()
  .min(8, "Use at least 8 characters")
  .refine((s) => new TextEncoder().encode(s).length <= 72, "Password is too long (72 bytes max)");

export const vocabInputSchema = z.object({
  english: z.string().trim().min(1, "English text is required").max(500, "Keep it under 500 characters"),
  persian: text(500),
  definition: text(1000),
  example: text(1000),
  partOfSpeech: z.enum(["", ...PARTS_OF_SPEECH]).default(""),
  synonyms: list(20, 80),
  antonyms: list(20, 80),
  pronunciation: text(100),
  tags: list(10, 30),
  collectionId: uuid.nullable().default(null),
  notes: text(2000),
  difficulty: z.enum(DIFFICULTIES).default("medium"),
});
export type VocabInput = z.infer<typeof vocabInputSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(60),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")).pipe(z.string().max(254)),
  password: pw,
  timezone: z.string().refine(isValidTimeZone, "Invalid time zone").default("UTC"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
});

export const collectionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Keep it under 60 characters"),
});

export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  collection: uuid.optional(),
  tag: z.string().trim().max(30).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  status: z.enum(["new", "due", "mastered", "difficult"]).optional(),
  sort: z.enum(["newest", "oldest", "alpha", "practice"]).default("newest"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

export const PRACTICE_MODES = ["en-fa", "fa-en", "definition", "multiple-choice", "typing", "difficult", "speaking"] as const;
export type PracticeMode = (typeof PRACTICE_MODES)[number];

export const sessionSchema = z.object({
  mode: z.enum(PRACTICE_MODES),
  count: z.coerce.number().int().min(1).max(50).default(10),
  collectionId: uuid.nullable().optional(),
  wordFilter: z.enum(["any", "new", "practiced"]).default("any"),
  ids: z.array(uuid).max(200).optional(), // "selected vocabulary"
});

export const answerSchema = z.object({
  requestId: uuid,
  vocabId: uuid,
  kind: z.enum(["en-fa", "fa-en", "def-en", "type", "speak"]),
  answer: z.string().max(500),
});

export const translateSchema = z.object({
  text: z.string().trim().min(1, "Enter some English text").max(300, "Keep it under 300 characters"),
  mode: z.enum(["translate", "define", "enrich"]),
});

export const settingsSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    lang: z.enum(["en", "fa"]),
    theme: z.enum(["light", "dark", "system"]),
    dailyGoal: z.coerce.number().int().min(1).max(200),
    timezone: z.string().refine(isValidTimeZone, "Invalid time zone"),
  })
  .partial();

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: pw,
});
