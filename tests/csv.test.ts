import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Redis as IORedis } from "ioredis";
import { addWord, closeTestRedis, U1, U2, useTestRedis } from "./helpers";
import { exportCsv, importCsv, parseCsv, toCsv, MAX_IMPORT_ROWS } from "@/lib/csv";
import { listVocab, getOwned } from "@/lib/vocab-repo";
import { listCollections } from "@/lib/collections-repo";
import { listQuerySchema } from "@/lib/schemas";

let io: IORedis;
beforeEach(async () => { io = await useTestRedis(); });
afterAll(closeTestRedis);
const all = async (uid: string) => (await listVocab(uid, listQuerySchema.parse({ sort: "alpha", pageSize: 50 }))).items;

describe("CSV parsing and writing", () => {
  it("handles quotes, commas, escaped quotes, CRLF, BOM and newlines inside quotes", () => {
    const rows = parseCsv('\uFEFFa,b,c\r\n"x, y","say ""hi""","line1\nline2"\r\n\r\n');
    expect(rows).toEqual([["a", "b", "c"], ["x, y", 'say "hi"', "line1\nline2"]]);
  });
  it("rejects an unclosed quote", () => {
    expect(() => parseCsv('a,"b')).toThrowError(/unclosed/);
  });
  it("neutralizes spreadsheet formulas on export and restores them on import", async () => {
    const out = toCsv([["=1+1", "ok", "@x"]]);
    expect(out).toContain("'=1+1");
    expect(out).toContain("'@x");
    await importCsv(U1, "english,notes\n'=SUM(A1),'+1 note\n", false);
    expect((await all(U1))[0]).toMatchObject({ english: "=SUM(A1)", notes: "+1 note" });
  });
});

describe("CSV import", () => {
  const csv = [
    "english,persian,definition,partOfSpeech,tags,collection,difficulty,synonyms",
    "resilient,مقاوم,able to recover,adjective,adj; ielts,Academic,hard,tough; strong",
    "ubiquitous,همه‌جا حاضر,,adjective,,Academic,,",
    ",no english,,,,,,",
    "bad pos,x,,wizard,,,,",
    "existing word,x,,,,,,",
    "weird level,x,,,,,impossible,",
    "Resilient,dup in file,,,,,,",
  ].join("\n");

  it("previews without saving and reports every problem row clearly", async () => {
    await addWord(U1, "existing word");
    const r = await importCsv(U1, csv, true);
    expect(r).toMatchObject({ total: 7, valid: 2, imported: 0, dryRun: true });
    expect(r.invalid.map((x) => x.row)).toEqual([4, 5, 7]); // missing english, bad part of speech, bad difficulty
    expect(r.invalid[0].errors.join()).toMatch(/english/i);
    expect(r.duplicates).toEqual([
      { row: 6, english: "existing word", reason: "exists" },
      { row: 8, english: "Resilient", reason: "in-file" },
    ]);
    expect((await all(U1)).length).toBe(1); // nothing imported
    expect(await listCollections(U1)).toEqual([]);
  });

  it("imports the valid rows, creates collections, maps columns and keeps invalid rows out", async () => {
    const r = await importCsv(U1, csv, false);
    expect(r.imported).toBe(3);
    const words = await all(U1);
    expect(words.map((w) => w.english)).toEqual(["existing word", "resilient", "ubiquitous"]);
    const resilient = words[1];
    expect(resilient).toMatchObject({ persian: "مقاوم", partOfSpeech: "adjective", difficulty: "hard", synonyms: ["tough", "strong"], tags: ["adj", "ielts"] });
    const [col] = await listCollections(U1);
    expect(col).toMatchObject({ name: "Academic", count: 2 });
    expect(resilient.collectionId).toBe(col.id);
  });

  it("is safe to run twice: the second run imports nothing and reports duplicates", async () => {
    await importCsv(U1, csv, false);
    const again = await importCsv(U1, csv, false);
    expect(again.imported).toBe(0);
    expect(again.duplicates.length).toBeGreaterThanOrEqual(3);
    expect((await all(U1)).length).toBe(3);
  });

  it("imports into the caller's account only", async () => {
    await importCsv(U1, "english\nmine", false);
    expect(await all(U2)).toEqual([]);
  });

  it("rejects files without an english column, empty files and oversized imports", async () => {
    await expect(importCsv(U1, "foo,bar\n1,2", true)).rejects.toMatchObject({ status: 400 });
    await expect(importCsv(U1, "english", true)).rejects.toMatchObject({ status: 400 });
    const big = "english\n" + Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `w${i}`).join("\n");
    await expect(importCsv(U1, big, true)).rejects.toMatchObject({ status: 413 });
  });

  it("accepts header aliases such as word and translation", async () => {
    await importCsv(U1, "Word,Translation\ncat,گربه", false);
    expect((await all(U1))[0]).toMatchObject({ english: "cat", persian: "گربه" });
  });
});

describe("CSV export", () => {
  it("round-trips through import", async () => {
    await importCsv(U1, 'english,persian,definition,tags,collection\n"hello, world",سلام,"a greeting, with comma",x; y,Greetings', false);
    const csv = await exportCsv(U1);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    await io.flushall();
    const r = await importCsv(U2, csv, false);
    expect(r.imported).toBe(1);
    const w = (await all(U2))[0];
    expect(w).toMatchObject({ english: "hello, world", persian: "سلام", definition: "a greeting, with comma", tags: ["x", "y"] });
    expect((await getOwned(U2, w.id)).collectionId).not.toBeNull();
  });
  it("exports only the caller's words", async () => {
    await addWord(U1, "mine");
    await addWord(U2, "theirs");
    const csv = await exportCsv(U1);
    expect(csv).toContain("mine");
    expect(csv).not.toContain("theirs");
  });
});
