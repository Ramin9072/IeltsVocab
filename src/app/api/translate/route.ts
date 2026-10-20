import { withUser, readJson } from "@/lib/api";
import { translateSchema } from "@/lib/schemas";
import { assist, translationStatus } from "@/lib/translate/service";

export const maxDuration = 30;

/** Reports whether a provider is configured. Never returns keys or provider details. */
export const GET = withUser("translate:status", async () => translationStatus());

/** Returns suggestions only. Nothing is saved until the user presses Save on the form. */
export const POST = withUser("translate:assist", async ({ req, userId }) => {
  const input = translateSchema.parse(await readJson(req));
  return assist(userId, input);
});
