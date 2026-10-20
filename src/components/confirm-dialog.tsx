"use client";

import { useEffect, useRef } from "react";
import { Button } from "./ui";
import { useI18n } from "./i18n";

/** Accessible confirmation built on the native <dialog>: focus is trapped and Escape closes it. */
export function ConfirmDialog({
  open, title, body, confirmLabel, busy, onConfirm, onCancel,
}: {
  open: boolean; title: string; body: string; confirmLabel: string; busy?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); onCancel(); }}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(92vw,26rem)] rounded-card border border-line bg-surface p-5 text-ink backdrop:bg-black/50"
    >
      <h2 id="confirm-title" className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-muted">{body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} autoFocus>{t("common.cancel")}</Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>{confirmLabel}</Button>
      </div>
    </dialog>
  );
}
