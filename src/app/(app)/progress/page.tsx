import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { WordList } from "@/components/word-row";
import { getDashboard } from "@/lib/stats";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/server-i18n";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage() {
  const user = await requireUser();
  const { t, n, lang } = await getI18n();
  const d = await getDashboard(user.id, user.timezone, user.dailyGoal);

  if (d.attempts === 0) {
    return (
      <>
        <PageHeader title={t("prog.title")} />
        <EmptyState title={t("prog.emptyTitle")} body={t("prog.emptyBody")} icon={<BarChart3 className="size-8" />} action={<LinkButton href="/practice">{t("nav.practice")}</LinkButton>} />
      </>
    );
  }
  const max = Math.max(1, ...d.activity.map((a) => a.attempts));
  const dayLabel = (day: string) => new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

  return (
    <>
      <PageHeader title={t("prog.title")} sub={t("prog.accuracyOf", { c: n(d.correct), t: n(d.attempts) })} />
      <dl className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          [t("dash.accuracy"), d.accuracy === null ? "—" : `${n(d.accuracy)}%`],
          [t("dash.attempts"), n(d.attempts)],
          [t("dash.streak"), t("dash.streakDays", { n: n(d.streak) })],
          [t("dash.today"), n(d.practicedToday)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-card border border-line bg-surface p-4">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 font-display text-3xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      <Card className="mb-5">
        <h2 className="mb-4 text-lg font-semibold">{t("prog.activity")}</h2>
        <div className="flex h-40 items-end gap-1.5 sm:gap-2" dir="ltr" aria-hidden="true">
          {d.activity.map((a) => (
            <div key={a.day} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${dayLabel(a.day)}: ${a.correct}/${a.attempts}`}>
              <div className="flex flex-col justify-end overflow-hidden rounded-t-md bg-bad/60" style={{ height: `${(a.attempts / max) * 100}%` }}>
                <div className="bg-ok" style={{ height: a.attempts ? `${(a.correct / a.attempts) * 100}%` : 0 }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted" dir="ltr" aria-hidden="true">
          <span>{dayLabel(d.activity[0].day)}</span><span>{dayLabel(d.activity.at(-1)!.day)}</span>
        </div>
        <p className="mt-3 flex gap-4 text-sm text-muted"><span><span className="me-1 inline-block size-2.5 rounded-sm bg-ok" aria-hidden />{t("dash.correct")}</span><span><span className="me-1 inline-block size-2.5 rounded-sm bg-bad/60" aria-hidden />{t("dash.incorrect")}</span></p>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium">{t("prog.table")}</summary>
          <table className="mt-2 w-full text-sm">
            <thead><tr className="text-start text-muted"><th className="py-1 text-start font-medium" scope="col">#</th><th scope="col" className="text-start font-medium">{t("dash.attempts")}</th><th scope="col" className="text-start font-medium">{t("prog.correctShort")}</th></tr></thead>
            <tbody>{d.activity.map((a) => <tr key={a.day} className="border-t border-line"><th scope="row" className="py-1 text-start font-normal">{dayLabel(a.day)}</th><td>{n(a.attempts)}</td><td>{n(a.correct)}</td></tr>)}</tbody>
          </table>
        </details>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-lg font-semibold">{t("prog.difficult")}</h2>
          {d.mostDifficult.length ? <WordList items={d.mostDifficult} t={t} meta={(v) => `${n(v.incorrectCount)}×`} /> : <p className="text-muted">{t("dash.noneYet")}</p>}
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-semibold">{t("prog.mostPracticed")}</h2>
          {d.mostPracticed.length ? <WordList items={d.mostPracticed} t={t} meta={(v) => n(v.practiceCount)} /> : <p className="text-muted">{t("dash.noneYet")}</p>}
        </Card>
      </div>
    </>
  );
}
