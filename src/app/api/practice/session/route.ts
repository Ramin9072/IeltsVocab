import { withUser, readJson } from "@/lib/api";
import { buildSession } from "@/lib/practice";
import { sessionSchema } from "@/lib/schemas";

export const POST = withUser("practice:session", async ({ req, userId }) =>
  buildSession(userId, sessionSchema.parse(await readJson(req))),
);
