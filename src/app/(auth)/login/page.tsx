import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { AuthForm } from "@/components/auth-form";
import { getT } from "@/lib/server-i18n";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; callbackUrl?: string }> }) {
  if ((await auth())?.user?.id) redirect("/dashboard");
  const { t } = await getT();
  const sp = await searchParams;
  const next = sp.next ?? sp.callbackUrl;
  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-bold">{t("auth.login")}</h1>
      <AuthForm mode="login" next={next && next.startsWith("/") && !next.startsWith("//") ? next : undefined} />
    </>
  );
}
