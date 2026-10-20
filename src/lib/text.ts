/** Normalizes English text for duplicate detection and indexing. */
export function normalizeEnglish(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200b\u200c\u200d]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?;:,]+$/g, "")
    .trim();
}

/** Folds Arabic/Persian letter variants and diacritics so typed Persian matches stored Persian. */
export function normalizePersian(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u200b\u200c\u200d]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Comparison key for Persian answers: whitespace and half-spaces are ignored. */
export function persianKey(s: string): string {
  return normalizePersian(s).replace(/\s+/g, "").toLowerCase();
}

/** Splits a Persian/English translation into its separate meanings. */
export function meaningParts(s: string): string[] {
  return s
    .split(/[,،;؛/|]+/)
    .map((p) => persianKey(p))
    .filter(Boolean);
}

export function tokenize(...texts: string[]): string[] {
  const out = new Set<string>();
  for (const t of texts) {
    const folded = normalizePersian(t).toLowerCase();
    for (const tok of folded.split(/[^\p{L}\p{N}]+/u)) {
      if (tok.length > 0 && tok.length <= 40) out.add(tok);
      if (out.size >= 60) return [...out];
    }
  }
  return [...out];
}

export function normalizeTag(tag: string): string {
  return tag.normalize("NFKC").toLowerCase().replace(/[,;|]/g, " ").replace(/\s+/g, " ").trim().slice(0, 30);
}

export function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map(normalizeTag).filter(Boolean))].slice(0, 10);
}

const CHAR_VALUE = (ch: string) => {
  const c = ch.charCodeAt(0);
  if (c >= 97 && c <= 122) return c - 96; // a-z => 1..26
  if (c >= 48 && c <= 57) return c - 48 + 27; // 0-9 => 27..36
  return 0; // space, punctuation, other scripts
};

/**
 * Maps the first 10 characters to an exactly-representable integer (base 37, < 2^53)
 * so alphabetical order can live in a ZSET next to every other index.
 */
export function alphaScore(normalized: string): number {
  let score = 0;
  for (let i = 0; i < 10; i++) {
    score = score * 37 + (i < normalized.length ? CHAR_VALUE(normalized[i]) : 0);
  }
  return score;
}

/** Local calendar day (YYYY-MM-DD) in an IANA time zone. */
export function dayKey(ms: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID_RE.test(s);
