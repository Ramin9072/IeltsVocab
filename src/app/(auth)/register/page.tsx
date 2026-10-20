import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { AuthForm } from "@/components/auth-form";
import { getT } from "@/lib/server-i18n";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  if ((await auth())?.user?.id) redirect("/dashboard");
  const { t } = await getT();
  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-bold">{t("auth.register")}</h1>
      <AuthForm mode="register" />
    </>
  );
}
