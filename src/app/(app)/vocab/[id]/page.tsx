import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { SpeakButton } from "@/components/speak-button";
import { DeleteWordButton } from "@/components/delete-word-button";
import { StatusBadge } from "@/components/word-row";
import { Badge, Card, En, Fa, LinkButton, ReviewLadder } from "@/components/ui";
import { getCollection } from "@/lib/collections-repo";
import { NotFoundError } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/server-i18n";
import { isUuid } from "@/lib/text";
import { getOwned, view } from "@/lib/vocab-repo";
import type { MsgKey } from "@/lib/i18n";

export const metadata: Metadata = { title: "Word" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default async function VocabDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const { t, n, date, when } = await getI18n();
  if (!isUuid(id)) notFound();
  const raw = await getOwned(user.id, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const v = view(raw);
  const collection = v.collectionId ? await getCollection(user.id, v.collectionId).catch(() => null) : null;
  const accuracy = v.practiceCount > 0 ? Math.round((v.correctCount / v.practiceCount) * 100) : null;

  return (
    <>
      <Link href="/library" className="mb-4 inline-flex items-center gap-1 text-sm"><ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />{t("nav.library")}</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold sm:text-4xl" dir="ltr" lang="en">{v.english}</h1>
          {v.persian && <p className="mt-2 text-2xl text-primary"><Fa>{v.persian}</Fa></p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={v.status} t={t} />
            {v.partOfSpeech && <Badge>{t(`pos.${v.partOfSpeech}` as MsgKey)}</Badge>}
            <Badge>{t(`vocab.diff.${v.difficulty}` as MsgKey)}</Badge>
            {v.tags.map((tag) => <Badge key={tag} tone="primary"><En>{tag}</En></Badge>)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href={`/vocab/${v.id}/edit`} variant="secondary" size="sm"><Pencil className="size-4" aria-hidden />{t("common.edit")}</LinkButton>
          <DeleteWordButton id={v.id} english={v.english} redirectTo="/library" />
        </div>
      </div>

      <Card className="mb-5">
        <h2 className="text-lg font-semibold">{t("speak.title")}</h2>
        {v.pronunciation && <p className="mt-1 text-xl" dir="ltr" lang="en">{v.pronunciation}</p>}
        <p className="mb-3 mt-1 text-sm text-muted">{t("speak.hint")}</p>
        <SpeakButton text={v.english} variant="full" />
      </Card>

      <Card className="mb-5">
        <dl className="divide-y divide-line">
          {v.definition && <Row label={t("vocab.definition")}><En>{v.definition}</En></Row>}
          {v.example && <Row label={t("vocab.example")}><En className="italic">{v.example}</En></Row>}
          {v.pronunciation && <Row label={t("vocab.pronunciation")}><En>{v.pronunciation}</En></Row>}
          {v.synonyms.length > 0 && <Row label={t("vocab.synonyms")}><En>{v.synonyms.join(", ")}</En></Row>}
          {v.antonyms.length > 0 && <Row label={t("vocab.antonyms")}><En>{v.antonyms.join(", ")}</En></Row>}
          {collection && <Row label={t("vocab.collection")}><Link href={`/library?collection=${collection.id}`}>{collection.name}</Link></Row>}
          {v.notes && <Row label={t("vocab.notes")}><p className="whitespace-pre-wrap" dir="auto">{v.notes}</p></Row>}
          <Row label={t("detail.added")}>{date(v.createdAt)}</Row>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">{t("detail.summary")}</h2>
        {v.practiceCount === 0 ? (
          <p className="text-muted">{t("detail.noPractice")}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div><dt className="text-sm text-muted">{t("detail.attempts")}</dt><dd className="font-display text-2xl font-bold">{n(v.practiceCount)}</dd></div>
            <div><dt className="text-sm text-muted">{t("detail.correct")}</dt><dd className="font-display text-2xl font-bold text-ok">{n(v.correctCount)}</dd></div>
            <div><dt className="text-sm text-muted">{t("detail.incorrect")}</dt><dd className="font-display text-2xl font-bold text-bad">{n(v.incorrectCount)}</dd></div>
            <div><dt className="text-sm text-muted">{t("detail.accuracy")}</dt><dd className="font-display text-2xl font-bold">{accuracy === null ? "—" : `${n(accuracy)}%`}</dd></div>
          </dl>
        )}
        <dl className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
          <div><dt className="text-sm text-muted">{t("detail.last")}</dt><dd>{v.lastPracticedAt ? when(v.lastPracticedAt) : t("common.never")}</dd></div>
          <div><dt className="text-sm text-muted">{t("detail.next")}</dt><dd>{v.nextReviewAt ? when(v.nextReviewAt) : t("detail.now")}</dd></div>
          <div>
            <dt className="mb-1 text-sm text-muted">{t("detail.ladder")}</dt>
            <dd><ReviewLadder level={v.level} label={`${t("detail.level")}: ${n(v.level)} / ${n(6)}`} /></dd>
          </div>
        </dl>
        {v.recent && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-2 text-sm text-muted">{t("detail.recent")}</p>
            <ul className="flex gap-1.5" dir="ltr">
              {v.recent.split("").map((c, i) => (
                <li key={i} className={`grid size-7 place-items-center rounded-md text-sm font-bold ${c === "1" ? "bg-ok/15 text-ok" : "bg-bad/15 text-bad"}`}>
                  <span aria-label={c === "1" ? t("practice.correct") : t("practice.wrong")}>{c === "1" ? "✓" : "✗"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </>
  );
}
