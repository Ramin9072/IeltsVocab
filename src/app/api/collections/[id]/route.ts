import { withUser, readJson } from "@/lib/api";
import { NotFoundError } from "@/lib/errors";
import { collectionSchema } from "@/lib/schemas";
import { isUuid } from "@/lib/text";
import { deleteCollection, renameCollection } from "@/lib/collections-repo";

type P = { id: string };
const idOf = (p: P) => {
  if (!isUuid(p.id)) throw new NotFoundError("Collection");
  return p.id;
};

export const PATCH = withUser<P>("collections:rename", async ({ req, userId, params }) => {
  const { name } = collectionSchema.parse(await readJson(req));
  return renameCollection(userId, idOf(params), name);
});

export const DELETE = withUser<P>("collections:delete", async ({ userId, params }) => deleteCollection(userId, idOf(params)));
