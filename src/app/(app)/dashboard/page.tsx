import type { Metadata } from "next";
import { GraduationCap, Plus } from "lucide-react";
import { Card, EmptyState, LinkButton, PageHeader, ProgressBar } from "@/components/ui";
import { WordList } from "@/components/word-row";
import { getDashboard } from "@/lib/stats";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/server-i18n";

export const metadata: Metadata = { title: "Dashboard" };

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-display text-3xl font-bold">{value}</dd>
      {sub && <dd className="mt-0.5 text-sm text-muted">{sub}</dd>}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const { t, n } = await getI18n();
  const d = await getDashboard(user.id, user.timezone, user.dailyGoal);

  if (d.totalVocab === 0) {
    return (
      <>
        <PageHeader title={t("dash.greeting", { name: user.name })} />
        <EmptyState
          title={t("dash.emptyTitle")}
          body={t("dash.emptyBody")}
          icon={<Plus className="size-8" />}
          action={<LinkButton href="/add">{t("nav.add")}</LinkButton>}
        />
      </>
    );
  }

  const goalDone = d.practicedToday >= d.dailyGoal;
  return (
    <>
      <PageHeader title={t("dash.greeting", { name: user.name })}>
        <LinkButton href="/practice" size="lg"><GraduationCap className="size-5" aria-hidden />{t("dash.practiceNow")}</LinkButton>
      </PageHeader>

      <Card className="mb-5">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("dash.today")}</h2>
          <p className="text-sm text-muted">{goalDone ? t("dash.goalDone") : t("dash.goal", { n: n(d.practicedToday), goal: n(d.dailyGoal) })}</p>
        </div>
        <ProgressBar value={d.practicedToday} max={d.dailyGoal} label={t("dash.today")} />
      </Card>

      <dl className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("dash.total")} value={n(d.totalVocab)} sub={d.newCount > 0 ? t("dash.newWords", { n: n(d.newCount) }) : undefined} />
        <Stat label={t("dash.attempts")} value={n(d.attempts)} sub={`${n(d.correct)} ${t("dash.correct")} · ${n(d.incorrect)} ${t("dash.incorrect")}`} />
        <Stat label={t("dash.accuracy")} value={d.accuracy === null ? "—" : `${n(d.accuracy)}%`} />
        <Stat label={t("dash.streak")} value={t("dash.streakDays", { n: n(d.streak) })} />
      </dl>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-lg font-semibold">{t("dash.due")} {d.dueCount > 0 && <span className="text-muted">({n(d.dueCount)})</span>}</h2>
          {d.due.length ? <WordList items={d.due} t={t} /> : <p className="text-muted">{t("dash.dueEmpty")}</p>}
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-semibold">{t("dash.recentlyAdded")}</h2>
          {d.recentlyAdded.length ? <WordList items={d.recentlyAdded} t={t} /> : <p className="text-muted">{t("dash.recentlyAddedEmpty")}</p>}
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-semibold">{t("dash.mostPracticed")}</h2>
          {d.mostPracticed.length ? <WordList items={d.mostPracticed} t={t} meta={(v) => n(v.practiceCount)} /> : <p className="text-muted">{t("dash.noneYet")}</p>}
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-semibold">{t("dash.mostDifficult")}</h2>
          {d.mostDifficult.length ? <WordList items={d.mostDifficult} t={t} meta={(v) => `${n(v.incorrectCount)}×`} /> : <p className="text-muted">{t("dash.noneYet")}</p>}
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-2 text-lg font-semibold">{t("dash.recentlyPracticed")}</h2>
          {d.recentlyPracticed.length ? <WordList items={d.recentlyPracticed} t={t} /> : <p className="text-muted">{t("dash.noneYet")}</p>}
        </Card>
      </div>
    </>
  );
}
