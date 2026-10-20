import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUser } from "./users-repo";
import type { UserRecord } from "./types";

/** For server-rendered private pages: the signed-in user's record, or a redirect to /login. */
export async function requireUser(): Promise<Omit<UserRecord, "passwordHash">> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  const user = await getUser(id);
  if (!user) redirect("/login");
  const { passwordHash: _omit, ...safe } = user;
  return safe;
}
