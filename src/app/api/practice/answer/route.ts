import { withUser, readJson } from "@/lib/api";
import { submitAnswer } from "@/lib/practice";
import { answerSchema } from "@/lib/schemas";

export const POST = withUser("practice:answer", async ({ req, userId }) =>
  submitAnswer(userId, answerSchema.parse(await readJson(req))),
);
