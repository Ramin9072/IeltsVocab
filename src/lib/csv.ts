import { getRedis } from "./redis/client";
import { K } from "./keys";
import { HttpError, DuplicateError } from "./errors";
import { normalizeEnglish } from "./text";
import { vocabInputSchema, type VocabInput } from "./schemas";
import { createVocab, getMany } from "./vocab-repo";
import { findOrCreateCollection, listCollections } from "./collections-repo";

export const MAX_IMPORT_ROWS = 300;
export const MAX_IMPORT_BYTES = 1_000_000;

/** RFC 4180 parser: quoted fields, escaped quotes, CRLF/LF, newlines inside quotes. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"' && field === "") inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else field += c;
  }
  if (inQuotes) throw new HttpError(400, "invalid_csv", "The CSV has an unclosed quote");
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

// Cells starting with these can run as formulas when opened in a spreadsheet.
const FORMULA_START = /^[=+\-@\t\r]/;
const escapeCell = (v: string) => {
  const safe = FORMULA_START.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const unescapeFormula = (v: string) => (/^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v);

export function toCsv(rows: string[][]): string {
  return "\uFEFF" + rows.map((r) => r.map(escapeCell).join(",")).join("\r\n") + "\r\n";
}

const HEADER_ALIASES: Record<string, string> = {
  english: "english", word: "english", text: "english", phrase: "english",
  persian: "persian", translation: "persian", persiantranslation: "persian",
  definition: "definition", englishdefinition: "definition",
  example: "example", examplesentence: "example",
  partofspeech: "partOfSpeech", pos: "partOfSpeech",
  synonyms: "synonyms", antonyms: "antonyms", pronunciation: "pronunciation",
  tags: "tags", collection: "collection", notes: "notes", note: "notes", difficulty: "difficulty",
};
const normHeader = (h: string) => h.toLowerCase().replace(/[^a-z]/g, "");
const splitList = (s: string) => s.split(/[;|]/).map((x) => x.trim()).filter(Boolean);

export interface ImportReport {
  total: number;
  valid: number;
  invalid: { row: number; english: string; errors: string[] }[];
  duplicates: { row: number; english: string; reason: "exists" | "in-file" }[];
  imported: number;
  dryRun: boolean;
}

interface ParsedRow {
  row: number; // 1-based line in the file (header is row 1)
  input: VocabInput;
  collection: string;
}

export async function importCsv(uid: string, csv: string, dryRun: boolean): Promise<ImportReport> {
  if (new TextEncoder().encode(csv).length > MAX_IMPORT_BYTES) throw new HttpError(413, "too_large", "The file is larger than 1 MB");
  const table = parseCsv(csv);
  if (table.length < 2) throw new HttpError(400, "invalid_csv", "The file needs a header row and at least one word");
  const headers = table[0].map((h) => HEADER_ALIASES[normHeader(h)] ?? "");
  if (!headers.includes("english")) {
    throw new HttpError(400, "invalid_csv", 'The header row needs an "english" column (or "word")');
  }
  const body = table.slice(1);
  if (body.length > MAX_IMPORT_ROWS) {
    throw new HttpError(413, "too_many_rows", `Import up to ${MAX_IMPORT_ROWS} rows at a time (this file has ${body.length})`);
  }

  const report: ImportReport = { total: body.length, valid: 0, invalid: [], duplicates: [], imported: 0, dryRun };
  const good: ParsedRow[] = [];
  body.forEach((cells, i) => {
    const row = i + 2;
    const rec: Record<string, string> = {};
    headers.forEach((h, c) => {
      if (h) rec[h] = unescapeFormula((cells[c] ?? "").trim());
    });
    const parsed = vocabInputSchema.safeParse({
      english: rec.english ?? "",
      persian: rec.persian ?? "",
      definition: rec.definition ?? "",
      example: rec.example ?? "",
      partOfSpeech: (rec.partOfSpeech ?? "").toLowerCase(),
      synonyms: splitList(rec.synonyms ?? ""),
      antonyms: splitList(rec.antonyms ?? ""),
      pronunciation: rec.pronunciation ?? "",
      tags: splitList(rec.tags ?? ""),
      collectionId: null,
      notes: rec.notes ?? "",
      difficulty: (rec.difficulty ?? "").toLowerCase() || "medium",
    });
    if (!parsed.success) {
      report.invalid.push({
        row,
        english: rec.english ?? "",
        errors: parsed.error.issues.map((is) => `${is.path.join(".") || "row"}: ${is.message}`),
      });
      return;
    }
    good.push({ row, input: parsed.data, collection: rec.collection ?? "" });
  });

  // Duplicates: against the user's existing words and within the file itself.
  const r = getRedis();
  const norms = good.map((g) => normalizeEnglish(g.input.english));
  const existing = good.length ? await r.pipeline(norms.map((n) => ["HEXISTS", K.normMap(uid), n])) : [];
  const seen = new Set<string>();
  const toCreate: ParsedRow[] = [];
  good.forEach((g, i) => {
    if (Number(existing[i]) === 1) report.duplicates.push({ row: g.row, english: g.input.english, reason: "exists" });
    else if (seen.has(norms[i])) report.duplicates.push({ row: g.row, english: g.input.english, reason: "in-file" });
    else {
      seen.add(norms[i]);
      toCreate.push(g);
    }
  });
  report.valid = toCreate.length;
  if (dryRun) return report;

  const collectionIds = new Map<string, string>();
  for (const g of toCreate) {
    const name = g.collection.trim().slice(0, 60);
    if (name && !collectionIds.has(name.toLowerCase())) collectionIds.set(name.toLowerCase(), await findOrCreateCollection(uid, name));
  }
  for (let i = 0; i < toCreate.length; i += 5) {
    await Promise.all(
      toCreate.slice(i, i + 5).map(async (g) => {
        try {
          const name = g.collection.trim().slice(0, 60).toLowerCase();
          await createVocab(uid, { ...g.input, collectionId: name ? (collectionIds.get(name) ?? null) : null });
          report.imported++;
        } catch (e) {
          if (e instanceof DuplicateError) report.duplicates.push({ row: g.row, english: g.input.english, reason: "exists" });
          else report.invalid.push({ row: g.row, english: g.input.english, errors: [e instanceof Error ? e.message : "Could not save"] });
        }
      }),
    );
  }
  report.valid = report.imported;
  report.invalid.sort((a, b) => a.row - b.row);
  report.duplicates.sort((a, b) => a.row - b.row);
  return report;
}

export const EXPORT_COLUMNS = [
  "english", "persian", "definition", "example", "partOfSpeech", "synonyms", "antonyms", "pronunciation",
  "tags", "collection", "notes", "difficulty", "practiceCount", "correctCount", "incorrectCount", "createdAt",
];

export async function exportCsv(uid: string): Promise<string> {
  const r = getRedis();
  const names = new Map((await listCollections(uid)).map((c) => [c.id, c.name]));
  const rows: string[][] = [EXPORT_COLUMNS];
  for (let start = 0; ; start += 200) {
    const ids = await r.exec<string[]>(["ZRANGE", K.vocabIndex(uid), start, start + 199]);
    if (ids.length === 0) break;
    for (const v of await getMany(uid, ids)) {
      rows.push([
        v.english, v.persian, v.definition, v.example, v.partOfSpeech, v.synonyms.join("; "), v.antonyms.join("; "),
        v.pronunciation, v.tags.join("; "), v.collectionId ? (names.get(v.collectionId) ?? "") : "", v.notes,
        v.difficulty, String(v.practiceCount), String(v.correctCount), String(v.incorrectCount), new Date(v.createdAt).toISOString(),
      ]);
    }
    if (ids.length < 200) break;
  }
  return toCsv(rows);
}
