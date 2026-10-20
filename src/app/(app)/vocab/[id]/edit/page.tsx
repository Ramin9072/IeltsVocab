import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { VocabForm } from "@/components/vocab-form";
import { listCollections } from "@/lib/collections-repo";
import { NotFoundError } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { getT } from "@/lib/server-i18n";
import { isUuid } from "@/lib/text";
import { translationStatus } from "@/lib/translate/service";
import { getOwned, view } from "@/lib/vocab-repo";

export const metadata: Metadata = { title: "Edit word" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const { t } = await getT();
  if (!isUuid(id)) notFound();
  const item = await getOwned(user.id, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const collections = (await listCollections(user.id)).map(({ id, name }) => ({ id, name }));
  return (
    <>
      <PageHeader title={t("vocab.edit.title")} />
      <VocabForm mode="edit" initial={view(item)} collections={collections} assistConfigured={translationStatus().configured} />
    </>
  );
}
