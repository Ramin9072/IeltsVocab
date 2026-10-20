import Link from "next/link";
import { BookOpenCheck, FileSpreadsheet, GraduationCap, Repeat } from "lucide-react";
import { LangToggle } from "@/components/toggles";
import { LinkButton, ReviewLadder, En, Fa } from "@/components/ui";
import { getT } from "@/lib/server-i18n";

export default async function Landing() {
  const { t } = await getT();
  const features = [
    { icon: BookOpenCheck, title: t("landing.f1.t"), body: t("landing.f1.d") },
    { icon: GraduationCap, title: t("landing.f2.t"), body: t("landing.f2.d") },
    { icon: Repeat, title: t("landing.f3.t"), body: t("landing.f3.d") },
    { icon: FileSpreadsheet, title: t("landing.f4.t"), body: t("landing.f4.d") },
  ];
  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-4 py-5">
      <header className="flex items-center justify-between gap-2">
        <span className="font-display text-xl font-bold">{t("appName")}</span>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Link href="/login" className="rounded-lg px-3 py-2 font-medium">{t("nav.login")}</Link>
        </div>
      </header>
      <main id="main">
        <section className="grid items-center gap-10 py-12 md:grid-cols-[1.2fr_1fr] md:py-20">
          <div>
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">{t("landing.title")}</h1>
            <p className="mt-5 max-w-xl text-lg text-muted">{t("landing.subtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/register" size="lg">{t("landing.cta")}</LinkButton>
              <LinkButton href="/login" size="lg" variant="secondary">{t("landing.hasAccount")}</LinkButton>
            </div>
          </div>
          <div className="rounded-card border border-line bg-surface p-6 shadow-sm" aria-hidden="true">
            <p className="font-display text-5xl font-bold"><En>{t("landing.card.word")}</En></p>
            <p className="mt-3 text-2xl text-primary"><Fa>{t("landing.card.meaning")}</Fa></p>
            <div className="mt-8 flex items-end justify-between gap-4 border-t border-line pt-4">
              <ReviewLadder level={3} label="" />
              <p className="text-sm text-muted">{t("landing.card.ladder")}</p>
            </div>
          </div>
        </section>
        <section aria-label={t("landing.f1.t")} className="grid gap-x-10 gap-y-8 border-t border-line py-10 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <Icon className="mt-1 size-6 shrink-0 text-primary" aria-hidden />
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-1 text-muted">{body}</p>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
