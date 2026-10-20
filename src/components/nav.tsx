"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FolderOpen, GraduationCap, LayoutDashboard, Library, PlusCircle, Settings } from "lucide-react";
import { useI18n } from "./i18n";
import { cn } from "./ui";
import type { MsgKey } from "@/lib/i18n";

const ITEMS: { href: string; key: MsgKey; icon: typeof Library; mobile: boolean }[] = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/library", key: "nav.library", icon: Library, mobile: true },
  { href: "/add", key: "nav.add", icon: PlusCircle, mobile: true },
  { href: "/practice", key: "nav.practice", icon: GraduationCap, mobile: true },
  { href: "/progress", key: "nav.progress", icon: BarChart3, mobile: true },
  { href: "/collections", key: "nav.collections", icon: FolderOpen, mobile: false },
  { href: "/settings", key: "nav.settings", icon: Settings, mobile: false },
];

const active = (path: string, href: string) => path === href || path.startsWith(`${href}/`) || (href === "/library" && path.startsWith("/vocab"));

export function SideNav() {
  const { t } = useI18n();
  const path = usePathname();
  return (
    <nav aria-label={t("nav.main")} className="flex flex-col gap-1">
      {ITEMS.map(({ href, key, icon: Icon }) => (
        <Link key={href} href={href} aria-current={active(path, href) ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 font-medium", active(path, href) ? "bg-primary/15 text-primary" : "text-ink hover:bg-sunken")}>
          <Icon className="size-5" aria-hidden />
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const { t } = useI18n();
  const path = usePathname();
  return (
    <nav aria-label={t("nav.main")} className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      {ITEMS.filter((i) => i.mobile).map(({ href, key, icon: Icon }) => (
        <Link key={href} href={href} aria-current={active(path, href) ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs", active(path, href) ? "font-semibold text-primary" : "text-muted")}>
          <Icon className="size-5" aria-hidden />
          <span className="max-w-full truncate px-1">{t(key)}</span>
        </Link>
      ))}
    </nav>
  );
}
