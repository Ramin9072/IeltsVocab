"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { ConfirmDialog } from "./confirm-dialog";
import { useI18n } from "./i18n";
import { Alert, Button } from "./ui";

export function DeleteWordButton({ id, english, redirectTo, size = "sm" }: { id: string; english: string; redirectTo?: string; size?: "sm" | "md" }) {
  const { t, err } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    try {
      await apiFetch(`/api/vocab/${id}`, { method: "DELETE" });
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError(err(e));
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button variant="ghost" size={size} onClick={() => { setError(null); setOpen(true); }} aria-label={`${t("common.delete")}: ${english}`} className="text-bad">
        <Trash2 className="size-4" aria-hidden /> {t("common.delete")}
      </Button>
      {error && <Alert tone="error" className="basis-full">{error}</Alert>}
      <ConfirmDialog open={open} title={t("lib.deleteTitle")} body={t("lib.deleteBody", { word: english })} confirmLabel={t("common.delete")} busy={busy} onConfirm={confirm} onCancel={() => setOpen(false)} />
    </>
  );
}
