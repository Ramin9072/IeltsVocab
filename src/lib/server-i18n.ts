import "server-only";
import { cookies } from "next/headers";
import { formatDate, formatNumber, formatWhen, makeT, type Lang } from "./i18n";

export async function getLang(): Promise<Lang> {
  return (await cookies()).get("lang")?.value === "fa" ? "fa" : "en";
}

export async function getTheme(): Promise<"light" | "dark" | "system"> {
  const v = (await cookies()).get("theme")?.value;
  return v === "light" || v === "dark" ? v : "system";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: makeT(lang) };
}

/** Everything a server component needs to render translated text, numbers and dates. */
export async function getI18n() {
  const lang = await getLang();
  return {
    lang,
    t: makeT(lang),
    n: (v: number) => formatNumber(v, lang),
    date: (ms: number) => formatDate(ms, lang),
    when: (ms: number) => formatWhen(ms, lang),
  };
}
