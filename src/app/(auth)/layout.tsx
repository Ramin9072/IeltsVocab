import Link from "next/link";
import { LangToggle } from "@/components/toggles";
import { getT } from "@/lib/server-i18n";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getT();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-bold text-ink no-underline">{t("appName")}</Link>
        <LangToggle />
      </header>
      <main id="main" className="flex-1">{children}</main>
    </div>
  );
}
