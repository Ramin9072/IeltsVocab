import Link from "next/link";
import { FolderOpen, LogOut, Settings } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { BottomNav, SideNav } from "@/components/nav";
import { LangToggle, ThemeToggle } from "@/components/toggles";
import { requireUser } from "@/lib/session";
import { getT, getTheme } from "@/lib/server-i18n";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const [{ t }, theme] = await Promise.all([getT(), getTheme()]);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-e border-line bg-surface p-4 lg:flex lg:flex-col lg:gap-6">
        <Link href="/dashboard" className="font-display text-xl font-bold text-ink no-underline">{t("appName")}</Link>
        <SideNav />
        <form action={logoutAction} className="mt-auto">
          <button type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-start font-medium text-ink hover:bg-sunken">
            <LogOut className="size-5" aria-hidden /> {t("nav.logout")}
          </button>
        </form>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-surface/95 px-4 py-2 backdrop-blur">
          <Link href="/dashboard" className="font-display text-lg font-bold text-ink no-underline lg:hidden">{t("appName")}</Link>
          <div className="ms-auto flex items-center gap-1">
            <LangToggle />
            <ThemeToggle theme={theme} compact />
            <Link href="/collections" aria-label={t("nav.collections")} className="grid size-10 place-items-center rounded-lg text-ink hover:bg-sunken lg:hidden"><FolderOpen className="size-5" aria-hidden /></Link>
            <Link href="/settings" aria-label={t("nav.settings")} className="grid size-10 place-items-center rounded-lg text-ink hover:bg-sunken lg:hidden"><Settings className="size-5" aria-hidden /></Link>
            <form action={logoutAction} className="lg:hidden">
              <button type="submit" aria-label={t("nav.logout")} className="grid size-10 place-items-center rounded-lg text-ink hover:bg-sunken"><LogOut className="size-5" aria-hidden /></button>
            </form>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 lg:pb-10">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
