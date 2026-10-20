import Link from "next/link";
import { Badge, En, Fa } from "./ui";
import type { MsgKey, T } from "@/lib/i18n";
import type { VocabView } from "@/lib/types";

export const statusTone = { new: "primary", due: "saffron", learning: "neutral", mastered: "ok" } as const;

export function StatusBadge({ status, t }: { status: VocabView["status"]; t: T }) {
  return <Badge tone={statusTone[status]}>{t(`lib.status.${status}` as MsgKey)}</Badge>;
}

/** Compact row used by the dashboard and progress lists. */
export function WordList({ items, t, meta }: { items: VocabView[]; t: T; meta?: (v: VocabView) => string }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((v) => (
        <li key={v.id}>
          <Link href={`/vocab/${v.id}`} className="flex min-h-12 items-center justify-between gap-3 py-2 text-ink no-underline hover:text-primary">
            <span className="min-w-0">
              <En className="truncate font-medium">{v.english}</En>
              {v.persian && <Fa className="ms-3 text-muted">{v.persian}</Fa>}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-sm text-muted">
              {meta?.(v)}
              <StatusBadge status={v.status} t={t} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
