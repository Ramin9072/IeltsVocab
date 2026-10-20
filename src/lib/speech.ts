export interface VoiceLike {
  lang: string;
  name: string;
}

const norm = (lang: string) => lang.replace("_", "-").toLowerCase(); // Android reports "en_US"

/** Picks the best English voice: exact preferred locale first, then any English one. */
export function pickVoice<T extends VoiceLike>(voices: T[], preferred = "en-US"): T | null {
  const want = norm(preferred);
  return (
    voices.find((v) => norm(v.lang) === want) ??
    voices.find((v) => norm(v.lang).startsWith("en-")) ??
    voices.find((v) => norm(v.lang) === "en") ??
    null
  );
}

/** Speech engines capitalize and punctuate ("Resilient."). Tidy the text before it lands in a field. */
export function cleanDictation(text: string, lang: "en" | "fa"): string {
  let t = text.trim().replace(/\s+/g, " ").replace(/[.!?;:,،؛؟]+$/u, "").trim();
  if (lang === "en" && t && !t.includes(" ")) t = t.toLowerCase(); // a single dictated word is not a sentence
  return t;
}
