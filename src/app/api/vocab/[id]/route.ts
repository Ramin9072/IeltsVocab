import { withUser, readJson } from "@/lib/api";
import { NotFoundError } from "@/lib/errors";
import { vocabInputSchema } from "@/lib/schemas";
import { isUuid } from "@/lib/text";
import { deleteVocab, getOwned, updateVocab, view } from "@/lib/vocab-repo";

type P = { id: string };
const idOf = (p: P) => {
  if (!isUuid(p.id)) throw new NotFoundError("Word");
  return p.id;
};

export const GET = withUser<P>("vocab:get", async ({ userId, params }) => view(await getOwned(userId, idOf(params))));

export const PUT = withUser<P>("vocab:update", async ({ req, userId, params }) => {
  const input = vocabInputSchema.parse(await readJson(req));
  return view(await updateVocab(userId, idOf(params), input));
});

export const DELETE = withUser<P>("vocab:delete", async ({ userId, params }) => {
  await deleteVocab(userId, idOf(params));
  return { ok: true };
});
