import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { SettingsForms } from "@/components/settings-forms";
import { requireUser } from "@/lib/session";
import { getT, getTheme } from "@/lib/server-i18n";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [{ t }, theme] = await Promise.all([getT(), getTheme()]);
  return (
    <>
      <PageHeader title={t("set.title")} />
      <SettingsForms user={{ name: user.name, email: user.email, dailyGoal: user.dailyGoal, timezone: user.timezone }} theme={theme} />
    </>
  );
}
