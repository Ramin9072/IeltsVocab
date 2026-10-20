import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Search } from "lucide-react";
import { DeleteWordButton } from "@/components/delete-word-button";
import { StatusBadge } from "@/components/word-row";
import { Badge, Button, Card, EmptyState, En, Fa, Field, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { listCollections } from "@/lib/collections-repo";
import { listQuerySchema } from "@/lib/schemas";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/server-i18n";
import { listVocab, tagCounts } from "@/lib/vocab-repo";
import type { MsgKey } from "@/lib/i18n";

export const metadata: Metadata = { title: "Library" };

type SP = Record<string, string | string[] | undefined>;

export default async function LibraryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const { t, n } = await getI18n();
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]).filter(([, v]) => v !== undefined && v !== ""));
  const parsed = listQuerySchema.safeParse(raw);
  const q = parsed.success ? parsed.data : listQuerySchema.parse({});
  const [page, collections, tags] = await Promise.all([listVocab(user.id, q), listCollections(user.id), tagCounts(user.id)]);
  const collectionName = new Map(collections.map((c) => [c.id, c.name]));
  const filtered = Boolean(q.q || q.collection || q.tag || q.difficulty || q.status);

  const link = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "" && k !== "page" && k !== "pageSize") params.set(k, String(v));
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/library${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title={t("lib.title")}>
        <LinkButton href="/add" size="sm">{t("nav.add")}</LinkButton>
      </PageHeader>

      <Card className="mb-5">
        <form method="get" action="/library" role="search" aria-label={t("lib.filters")} className="space-y-3">
          <div className="flex gap-2">
            <div className="grow">
              <label htmlFor="q" className="sr-only">{t("common.search")}</label>
              <Input id="q" name="q" type="search" defaultValue={q.q ?? ""} placeholder={t("lib.searchPlaceholder")} />
            </div>
            <Button type="submit" aria-label={t("common.search")}><Search className="size-5" aria-hidden /></Button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Field id="collection" label={t("lib.collection")}>
              <Select id="collection" name="collection" defaultValue={q.collection ?? ""}>
                <option value="">{t("common.all")}</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field id="tag" label={t("lib.tag")}>
              <Select id="tag" name="tag" defaultValue={q.tag ?? ""}>
                <option value="">{t("common.all")}</option>
                {tags.map((x) => <option key={x.tag} value={x.tag}>{x.tag} ({n(x.count)})</option>)}
              </Select>
            </Field>
            <Field id="difficulty" label={t("lib.difficulty")}>
              <Select id="difficulty" name="difficulty" defaultValue={q.difficulty ?? ""}>
                <option value="">{t("common.all")}</option>
                {(["easy", "medium", "hard"] as const).map((d) => <option key={d} value={d}>{t(`vocab.diff.${d}` as MsgKey)}</option>)}
              </Select>
            </Field>
            <Field id="status" label={t("lib.status")}>
              <Select id="status" name="status" defaultValue={q.status ?? ""}>
                <option value="">{t("common.all")}</option>
                {(["new", "due", "mastered", "difficult"] as const).map((s) => <option key={s} value={s}>{t(`lib.status.${s}` as MsgKey)}</option>)}
              </Select>
            </Field>
            <Field id="sort" label={t("lib.sort")}>
              <Select id="sort" name="sort" defaultValue={q.sort}>
                {(["newest", "oldest", "alpha", "practice"] as const).map((s) => <option key={s} value={s}>{t(`lib.sort.${s}` as MsgKey)}</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="secondary" size="sm">{t("common.apply")}</Button>
            {filtered && <Link href="/library" className="text-sm font-medium">{t("lib.clear")}</Link>}
            <p className="ms-auto text-sm text-muted" aria-live="polite">{t("lib.results", { n: n(page.total) })}</p>
          </div>
        </form>
      </Card>

      {page.total === 0 ? (
        filtered ? (
          <EmptyState title={t("lib.noResultsTitle")} body={t("lib.noResultsBody")} action={<LinkButton href="/library" variant="secondary">{t("lib.clear")}</LinkButton>} />
        ) : (
          <EmptyState title={t("lib.emptyTitle")} body={t("lib.emptyBody")} action={<LinkButton href="/add">{t("nav.add")}</LinkButton>} />
        )
      ) : (
        <ul className="space-y-3">
          {page.items.map((v) => (
            <li key={v.id}>
              <Card className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 grow basis-60">
                  <Link href={`/vocab/${v.id}`} className="font-display text-xl font-semibold text-ink no-underline hover:text-primary"><En>{v.english}</En></Link>
                  {v.persian && <p className="mt-0.5 text-primary"><Fa>{v.persian}</Fa></p>}
                  {v.definition && <p className="mt-1 line-clamp-2 text-sm text-muted" dir="ltr" lang="en">{v.definition}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={v.status} t={t} />
                    <Badge>{t(`vocab.diff.${v.difficulty}` as MsgKey)}</Badge>
                    {v.collectionId && collectionName.get(v.collectionId) && <Badge tone="primary">{collectionName.get(v.collectionId)}</Badge>}
                    {v.tags.map((tag) => <Badge key={tag}><En>{tag}</En></Badge>)}
                    {v.practiceCount > 0 && <span className="text-xs text-muted">{t("detail.attempts")}: {n(v.practiceCount)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <LinkButton href={`/vocab/${v.id}/edit`} variant="ghost" size="sm" aria-label={`${t("common.edit")}: ${v.english}`}><Pencil className="size-4" aria-hidden />{t("common.edit")}</LinkButton>
                  <DeleteWordButton id={v.id} english={v.english} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {page.pages > 1 && (
        <nav aria-label={t("common.page", { n: n(page.page), total: n(page.pages) })} className="mt-6 flex items-center justify-between gap-3">
          {page.page > 1 ? <LinkButton href={link(page.page - 1)} variant="secondary" size="sm">{t("common.previous")}</LinkButton> : <span />}
          <span className="text-sm text-muted">{t("common.page", { n: n(page.page), total: n(page.pages) })}</span>
          {page.page < page.pages ? <LinkButton href={link(page.page + 1)} variant="secondary" size="sm">{t("common.next")}</LinkButton> : <span />}
        </nav>
      )}
    </>
  );
}
