import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getRedis } from "./redis/client";
import { K } from "./keys";
import { HttpError } from "./errors";
import { flatToRecord, toNum, type UserRecord } from "./types";

const BCRYPT_COST = 12;
// Compared against when the email is unknown so response time doesn't reveal which emails exist.
let dummyHash: string | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync(randomUUID(), BCRYPT_COST));

function parseUser(flat: unknown): UserRecord | null {
  const h = flatToRecord(flat);
  if (!h.id || !h.email) return null;
  return {
    id: h.id,
    email: h.email,
    name: h.name ?? "",
    passwordHash: h.passwordHash ?? "",
    createdAt: toNum(h.createdAt),
    timezone: h.timezone || "UTC",
    lang: h.lang === "fa" ? "fa" : "en",
    theme: h.theme === "light" || h.theme === "dark" ? h.theme : "system",
    dailyGoal: toNum(h.dailyGoal, 10) || 10,
  };
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  timezone: string;
  lang?: "en" | "fa";
}): Promise<UserRecord> {
  const r = getRedis();
  const id = randomUUID();
  const claimed = await r.exec<string | null>(["SET", K.userEmail(input.email), id, "NX"]);
  if (claimed !== "OK") throw new HttpError(409, "email_taken", "An account with this email already exists");
  const user: UserRecord = {
    id,
    email: input.email,
    name: input.name,
    passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
    createdAt: Date.now(),
    timezone: input.timezone,
    lang: input.lang ?? "en",
    theme: "system",
    dailyGoal: 10,
  };
  try {
    await r.exec([
      "HSET", K.user(id),
      "id", user.id, "email", user.email, "name", user.name, "passwordHash", user.passwordHash,
      "createdAt", String(user.createdAt), "timezone", user.timezone, "lang", user.lang,
      "theme", user.theme, "dailyGoal", String(user.dailyGoal),
    ]);
  } catch (e) {
    await r.exec(["DEL", K.userEmail(input.email)]).catch(() => undefined);
    throw e;
  }
  return user;
}

export async function getUser(id: string): Promise<UserRecord | null> {
  return parseUser(await getRedis().exec(["HGETALL", K.user(id)]));
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const r = getRedis();
  const id = await r.exec<string | null>(["GET", K.userEmail(email)]);
  return id ? getUser(id) : null;
}

/** Returns the user when the password matches; otherwise null (constant-ish time). */
export async function verifyCredentials(email: string, password: string): Promise<UserRecord | null> {
  const user = await findUserByEmail(email);
  const ok = await bcrypt.compare(password, user?.passwordHash || getDummyHash());
  return user && ok ? user : null;
}

export async function updateUser(
  id: string,
  fields: Partial<Pick<UserRecord, "name" | "lang" | "theme" | "dailyGoal" | "timezone">>,
) {
  const flat: string[] = [];
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) flat.push(k, String(v));
  if (flat.length) await getRedis().exec(["HSET", K.user(id), ...flat]);
}

export async function changePassword(id: string, current: string, next: string) {
  const user = await getUser(id);
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    throw new HttpError(400, "wrong_password", "Current password is incorrect");
  }
  await getRedis().exec(["HSET", K.user(id), "passwordHash", await bcrypt.hash(next, BCRYPT_COST)]);
}
