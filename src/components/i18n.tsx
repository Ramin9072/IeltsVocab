"use client";

import { createContext, useContext, useMemo } from "react";
import { dirOf, errorMessage, formatDate, formatNumber, formatWhen, makeT, type Lang, type T } from "@/lib/i18n";
import { ApiError } from "@/lib/client-api";

interface Ctx {
  lang: Lang;
  dir: "ltr" | "rtl";
  t: T;
  n: (v: number) => string;
  date: (ms: number) => string;
  when: (ms: number) => string;
  err: (e: unknown) => string;
}

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo<Ctx>(() => {
    const t = makeT(lang);
    return {
      lang,
      dir: dirOf(lang),
      t,
      n: (v) => formatNumber(v, lang),
      date: (ms) => formatDate(ms, lang),
      when: (ms) => formatWhen(ms, lang),
      err: (e) => errorMessage(t, e instanceof ApiError ? e.code : "generic"),
    };
  }, [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18nContext);
  if (!c) throw new Error("useI18n must be used inside <I18nProvider>");
  return c;
}
