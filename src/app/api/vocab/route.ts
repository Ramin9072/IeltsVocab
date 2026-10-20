import { withUser, readJson } from "@/lib/api";
import { listQuerySchema, vocabInputSchema } from "@/lib/schemas";
import { createVocab, listVocab, view } from "@/lib/vocab-repo";

export const GET = withUser("vocab:list", async ({ req, userId }) => {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  return listVocab(userId, listQuerySchema.parse(params));
});

export const POST = withUser("vocab:create", async ({ req, userId }) => {
  const input = vocabInputSchema.parse(await readJson(req));
  const item = await createVocab(userId, input);
  return Response.json(view(item), { status: 201, headers: { "Cache-Control": "no-store" } });
});
