import { withUser, readJson } from "@/lib/api";
import { collectionSchema } from "@/lib/schemas";
import { createCollection, listCollections } from "@/lib/collections-repo";

export const GET = withUser("collections:list", async ({ userId }) => ({ items: await listCollections(userId) }));

export const POST = withUser("collections:create", async ({ req, userId }) => {
  const { name } = collectionSchema.parse(await readJson(req));
  return Response.json(await createCollection(userId, name), { status: 201, headers: { "Cache-Control": "no-store" } });
});
