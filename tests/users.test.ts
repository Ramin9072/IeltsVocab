import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Redis as IORedis } from "ioredis";
import { closeTestRedis, useTestRedis } from "./helpers";
import { changePassword, createUser, findUserByEmail, verifyCredentials } from "@/lib/users-repo";
import { K } from "@/lib/keys";
import { registerSchema } from "@/lib/schemas";

let io: IORedis;
beforeEach(async () => { io = await useTestRedis(); });
afterAll(closeTestRedis);
const reg = { name: "Ramin", email: "ramin@example.com", password: "correct horse", timezone: "Asia/Tehran" };

describe("accounts", () => {
  it("hashes passwords and never stores plaintext", async () => {
    const u = await createUser(reg);
    const stored = await io.hgetall(K.user(u.id));
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(JSON.stringify(stored)).not.toContain("correct horse");
  });
  it("enforces unique emails, even concurrently", async () => {
    const results = await Promise.allSettled([createUser(reg), createUser(reg), createUser(reg)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await expect(createUser(reg)).rejects.toMatchObject({ status: 409, code: "email_taken" });
  });
  it("verifies credentials and rejects wrong or unknown ones", async () => {
    const u = await createUser(reg);
    expect((await verifyCredentials(reg.email, reg.password))?.id).toBe(u.id);
    expect(await verifyCredentials(reg.email, "wrong password")).toBeNull();
    expect(await verifyCredentials("nobody@example.com", "whatever12")).toBeNull();
    expect((await findUserByEmail(reg.email))?.timezone).toBe("Asia/Tehran");
  });
  it("changes the password only with the correct current one", async () => {
    const u = await createUser(reg);
    await expect(changePassword(u.id, "nope", "new password 1")).rejects.toMatchObject({ code: "wrong_password" });
    await changePassword(u.id, reg.password, "new password 1");
    expect(await verifyCredentials(reg.email, reg.password)).toBeNull();
    expect(await verifyCredentials(reg.email, "new password 1")).not.toBeNull();
  });
  it("validates registration input", () => {
    expect(registerSchema.safeParse({ ...reg, email: "not-an-email" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...reg, password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...reg, name: "  " }).success).toBe(false);
    expect(registerSchema.safeParse({ ...reg, timezone: "Mars/Base" }).success).toBe(false);
    expect(registerSchema.parse({ ...reg, email: "  Ramin@Example.COM " }).email).toBe("ramin@example.com");
  });
});
