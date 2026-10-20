import { z } from "zod";
import { PARTS_OF_SPEECH } from "../types";

export type AssistMode = "translate" | "define" | "enrich";

export class TranslationError extends Error {
  constructor(
    public readonly code: "not_configured" | "timeout" | "upstream_rate_limited" | "upstream_error" | "invalid_response",
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "TranslationError";
  }
}

const str = z.string().trim().max(1000).catch("");
const strList = z.array(z.string().trim().min(1).max(200)).max(12).catch([]);

export const assistResultSchema = z.object({
  persian: str.optional(),
  definition: str.optional(),
  example: str.optional(),
  partOfSpeech: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .transform((s) => ((PARTS_OF_SPEECH as readonly string[]).includes(s) ? s : ""))
    .catch("")
    .optional(),
  pronunciation: z.string().trim().max(100).catch("").optional(),
  synonyms: strList.optional(),
  antonyms: strList.optional(),
  collocations: strList.optional(),
  commonMistakes: strList.optional(),
  relatedForms: strList.optional(),
});
export type AssistResult = z.infer<typeof assistResultSchema>;

/** A provider only turns a prompt into raw text. Parsing, caching and limits live in service.ts. */
export interface TranslationProvider {
  readonly name: string;
  readonly model: string;
  complete(args: { system: string; user: string; signal: AbortSignal }): Promise<string>;
}
