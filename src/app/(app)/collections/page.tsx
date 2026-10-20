import type { Metadata } from "next";
import { CollectionsManager } from "@/components/collections-manager";
import { PageHeader } from "@/components/ui";
import { listCollections } from "@/lib/collections-repo";
import { requireUser } from "@/lib/session";
import { getT } from "@/lib/server-i18n";

export const metadata: Metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const user = await requireUser();
  const { t } = await getT();
  const items = (await listCollections(user.id)).map(({ id, name, count }) => ({ id, name, count }));
  return (
    <>
      <PageHeader title={t("col.title")} />
      <CollectionsManager items={items} />
    </>
  );
}
