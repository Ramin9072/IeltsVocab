import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { VocabForm } from "@/components/vocab-form";
import { listCollections } from "@/lib/collections-repo";
import { requireUser } from "@/lib/session";
import { getT } from "@/lib/server-i18n";
import { isUuid } from "@/lib/text";
import { translationStatus } from "@/lib/translate/service";

export const metadata: Metadata = { title: "Add word" };

export default async function AddPage({ searchParams }: { searchParams: Promise<{ collection?: string }> }) {
  const user = await requireUser();
  const { t } = await getT();
  const sp = await searchParams;
  const collections = (await listCollections(user.id)).map(({ id, name }) => ({ id, name }));
  const preset = sp.collection && isUuid(sp.collection) && collections.some((c) => c.id === sp.collection) ? sp.collection : undefined;
  return (
    <>
      <PageHeader title={t("vocab.add.title")} />
      <VocabForm mode="add" collections={collections} assistConfigured={translationStatus().configured} defaultCollectionId={preset} />
    </>
  );
}
