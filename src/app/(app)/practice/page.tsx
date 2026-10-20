import type { Metadata } from "next";
import { PracticeApp } from "@/components/practice-app";
import { PageHeader } from "@/components/ui";
import { listCollections } from "@/lib/collections-repo";
import { requireUser } from "@/lib/session";
import { getT } from "@/lib/server-i18n";
import { countVocab } from "@/lib/vocab-repo";

export const metadata: Metadata = { title: "Practice" };

export default async function PracticePage() {
  const user = await requireUser();
  const { t } = await getT();
  const [collections, total] = await Promise.all([listCollections(user.id), countVocab(user.id)]);
  return (
    <>
      <PageHeader title={t("practice.title")} sub={total > 0 ? t("practice.setup") : undefined} />
      <PracticeApp collections={collections.map(({ id, name, count }) => ({ id, name, count }))} totalWords={total} />
    </>
  );
}
