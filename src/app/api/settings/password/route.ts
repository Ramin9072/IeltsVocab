import { withUser, readJson } from "@/lib/api";
import { passwordChangeSchema } from "@/lib/schemas";
import { changePassword } from "@/lib/users-repo";
import { enforceRate } from "@/lib/ratelimit";

export const POST = withUser("settings:password", async ({ req, userId }) => {
  const { currentPassword, newPassword } = passwordChangeSchema.parse(await readJson(req));
  await enforceRate("password-change", userId, 5, 900);
  await changePassword(userId, currentPassword, newPassword);
  return { ok: true };
});
