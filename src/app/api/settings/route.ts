import { cookies } from "next/headers";
import { withUser, readJson } from "@/lib/api";
import { settingsSchema } from "@/lib/schemas";
import { updateUser } from "@/lib/users-repo";

export const PATCH = withUser("settings", async ({ req, userId }) => {
  const fields = settingsSchema.parse(await readJson(req));
  await updateUser(userId, fields);
  const jar = await cookies();
  const opts = { path: "/", maxAge: 365 * 86_400, sameSite: "lax" as const };
  if (fields.lang) jar.set("lang", fields.lang, opts);
  if (fields.theme) jar.set("theme", fields.theme, opts);
  return { ok: true };
});
