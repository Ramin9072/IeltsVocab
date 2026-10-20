"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen, Pencil, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/client-api";
import { ConfirmDialog } from "./confirm-dialog";
import { useI18n } from "./i18n";
import { Alert, Button, Card, EmptyState, Field, Input } from "./ui";

interface Item { id: string; name: string; count: number }

export function CollectionsManager({ items }: { items: Item[] }) {
  const { t, n, err } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: "success", text: ok });
      router.refresh();
      return true;
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError && e.code === "duplicate" ? t("err.duplicate") : err(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim() || busy) return;
            if (await run(() => apiFetch("/api/collections", { method: "POST", json: { name } }), t("col.created"))) setName("");
          }}
        >
          <div className="grow basis-56"><Field id="new-collection" label={t("col.new")}><Input id="new-collection" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={t("col.name")} /></Field></div>
          <Button type="submit" disabled={busy || !name.trim()}>{t("col.create")}</Button>
        </form>
      </Card>

      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      {items.length === 0 ? (
        <EmptyState title={t("col.emptyTitle")} body={t("col.emptyBody")} icon={<FolderOpen className="size-8" />} />
      ) : (
        <ul className="space-y-3">
          {items.map((c) => (
            <li key={c.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3">
                {editing?.id === c.id ? (
                  <form
                    className="flex grow flex-wrap items-center gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!editing.name.trim() || busy) return;
                      if (await run(() => apiFetch(`/api/collections/${c.id}`, { method: "PATCH", json: { name: editing.name } }), t("col.renamed"))) setEditing(null);
                    }}
                  >
                    <label htmlFor={`rename-${c.id}`} className="sr-only">{t("col.rename")}</label>
                    <Input id={`rename-${c.id}`} className="max-w-xs" value={editing.name} onChange={(e) => setEditing({ id: c.id, name: e.target.value })} maxLength={60} autoFocus />
                    <Button type="submit" size="sm" disabled={busy}>{t("common.save")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>{t("common.cancel")}</Button>
                  </form>
                ) : (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold">{c.name}</h2>
                      <p className="text-sm text-muted">{t("common.words", { n: n(c.count) })}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Link href={`/library?collection=${c.id}`} className="inline-flex min-h-9 items-center px-3 text-sm font-medium">{t("col.view")}</Link>
                      <Button size="sm" variant="ghost" onClick={() => setEditing({ id: c.id, name: c.name })} aria-label={`${t("col.rename")}: ${c.name}`}><Pencil className="size-4" aria-hidden />{t("col.rename")}</Button>
                      <Button size="sm" variant="ghost" className="text-bad" onClick={() => setDeleting(c)} aria-label={`${t("common.delete")}: ${c.name}`}><Trash2 className="size-4" aria-hidden />{t("common.delete")}</Button>
                    </div>
                  </>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-muted">{t("col.assignHint")}</p>

      <ConfirmDialog
        open={deleting !== null}
        title={t("col.deleteTitle")}
        body={t("col.deleteBody", { name: deleting?.name ?? "" })}
        confirmLabel={t("common.delete")}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await run(() => apiFetch(`/api/collections/${deleting.id}`, { method: "DELETE" }), t("col.deleted"));
          setDeleting(null);
        }}
      />
    </div>
  );
}
