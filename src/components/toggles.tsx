"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Moon, Sun } from "lucide-react";
import { setPreference } from "@/app/actions";
import { useI18n } from "./i18n";
import { cn } from "./ui";

export function LangToggle() {
  const { lang } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (value: "en" | "fa") => start(async () => { await setPreference("lang", value); router.refresh(); });
  return (
    <div role="group" aria-label="Language" className="inline-flex overflow-hidden rounded-lg border border-line">
      {([["en", "English", "en"], ["fa", "فارسی", "fa"]] as const).map(([v, label, l]) => (
        <button
          key={v}
          type="button"
          lang={l}
          aria-pressed={lang === v}
          disabled={pending}
          onClick={() => go(v)}
          className={cn("min-h-9 px-3 text-sm", lang === v ? "bg-primary text-primary-ink" : "bg-surface text-ink hover:bg-sunken")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const ORDER = ["light", "dark", "system"] as const;
type Theme = (typeof ORDER)[number];

export function ThemeToggle({ theme, compact }: { theme: Theme; compact?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (v: Theme) =>
    start(async () => {
      const dark = v === "dark" || (v === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
      await setPreference("theme", v);
      router.refresh();
    });
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  if (compact) {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    return (
      <button type="button" disabled={pending} onClick={() => set(next)} aria-label={`${t("common.theme")}: ${t(`set.theme.${theme}` as const)}`} className="grid size-10 place-items-center rounded-lg text-ink hover:bg-sunken">
        <Icon className="size-5" aria-hidden />
      </button>
    );
  }
  return (
    <div role="radiogroup" aria-label={t("set.theme")} className="inline-flex overflow-hidden rounded-lg border border-line">
      {ORDER.map((v) => (
        <button key={v} type="button" role="radio" aria-checked={theme === v} disabled={pending} onClick={() => set(v)} className={cn("min-h-10 px-3 text-sm", theme === v ? "bg-primary text-primary-ink" : "bg-surface hover:bg-sunken")}>
          {t(`set.theme.${v}` as const)}
        </button>
      ))}
    </div>
  );
}
