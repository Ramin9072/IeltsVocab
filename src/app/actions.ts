"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn, signOut } from "@/auth";
import { loginSchema, registerSchema } from "@/lib/schemas";
import { createUser, updateUser } from "@/lib/users-repo";
import { HttpError } from "@/lib/errors";
import { ConfigError } from "@/lib/redis/client";
import { enforceRate } from "@/lib/ratelimit";

export type FormState = { error?: "invalid_credentials" | "validation" | "email_taken" | "rate_limited" | "not_configured" | "generic"; fields?: Record<string, string> };

const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/dashboard";
};

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: "validation", fields: { email: "email_invalid" } };
  try {
    await signIn("credentials", { ...parsed.data, redirectTo: safeNext(fd.get("next")) });
  } catch (e) {
    if (e instanceof AuthError) return { error: "invalid_credentials" };
    if (e instanceof ConfigError) return { error: "not_configured" };
    throw e; // NEXT_REDIRECT must propagate
  }
  return {};
}

export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: fd.get("name"),
    email: fd.get("email"),
    password: fd.get("password"),
    timezone: fd.get("timezone") || "UTC",
  });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const key = String(i.path[0]);
      if (fields[key]) continue;
      fields[key] = key === "name" ? "name_required" : key === "email" ? "email_invalid" : i.message.includes("long") ? "password_long" : "password_short";
    }
    return { error: "validation", fields };
  }
  try {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    await enforceRate("register", ip, 10, 3600);
    const lang = (await cookies()).get("lang")?.value === "fa" ? "fa" : "en";
    await createUser({ ...parsed.data, lang });
  } catch (e) {
    if (e instanceof HttpError) return { error: e.code === "email_taken" ? "email_taken" : e.status === 429 ? "rate_limited" : "generic" };
    if (e instanceof ConfigError) return { error: "not_configured" };
    console.error("[register] failed:", e instanceof Error ? e.name : "unknown");
    return { error: "generic" };
  }
  try {
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: "/dashboard" });
  } catch (e) {
    if (e instanceof AuthError) redirect("/login");
    throw e;
  }
  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

/** Cookie-backed so it also works on the logged-out landing and login pages. */
export async function setPreference(kind: "lang" | "theme", value: string) {
  const allowed = kind === "lang" ? ["en", "fa"] : ["light", "dark", "system"];
  if (!allowed.includes(value)) return;
  (await cookies()).set(kind, value, { path: "/", maxAge: 365 * 86_400, sameSite: "lax" });
  const session = await auth();
  if (session?.user?.id) await updateUser(session.user.id, kind === "lang" ? { lang: value as "en" | "fa" } : { theme: value as "light" | "dark" | "system" });
}
