import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/auth";
import { closeTestRedis, U1, U2, useTestRedis, addWord } from "./helpers";
import { setRedisClient } from "@/lib/redis/client";
import * as vocabList from "@/app/api/vocab/route";
import * as vocabOne from "@/app/api/vocab/[id]/route";
import * as colList from "@/app/api/collections/route";
import * as colOne from "@/app/api/collections/[id]/route";
import * as translate from "@/app/api/translate/route";
import * as session from "@/app/api/practice/session/route";
import * as answer from "@/app/api/practice/answer/route";
import * as imp from "@/app/api/import/route";
import * as exp from "@/app/api/export/route";
import { getOwned } from "@/lib/vocab-repo";

const as = (id: string | null) => vi.mocked(auth).mockResolvedValue((id ? { user: { id }, expires: "" } : null) as never);
const noParams = { params: Promise.resolve({}) };
const withId = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (method: string, body?: unknown, headers: Record<string, string> = {}, url = "http://localhost/api/x") =>
  new Request(url, { method, headers: { "content-type": "application/json", host: "localhost", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = async (res: Response) => ({ status: res.status, body: await res.clone().json().catch(() => null) as any, res });

beforeEach(async () => {
  await useTestRedis();
  as(U1);
});
afterAll(closeTestRedis);

describe("protected API routes", () => {
  it("answer 401 to every private endpoint without a session", async () => {
    as(null);
    const id = randomUUID();
    const calls: Promise<Response>[] = [
      vocabList.GET(req("GET"), noParams), vocabList.POST(req("POST", {}), noParams),
      vocabOne.GET(req("GET"), withId(id)), vocabOne.PUT(req("PUT", {}), withId(id)), vocabOne.DELETE(req("DELETE"), withId(id)),
      colList.GET(req("GET"), noParams), colList.POST(req("POST", {}), noParams),
      colOne.PATCH(req("PATCH", {}), withId(id)), colOne.DELETE(req("DELETE"), withId(id)),
      translate.GET(req("GET"), noParams), translate.POST(req("POST", {}), noParams),
      session.POST(req("POST", {}), noParams), answer.POST(req("POST", {}), noParams),
      imp.POST(req("POST", {}), noParams), exp.GET(req("GET"), noParams),
    ];
    for (const r of await Promise.all(calls)) {
      expect(r.status).toBe(401);
      expect((await r.json()).error.code).toBe("unauthorized");
    }
  });
});

describe("vocabulary API", () => {
  it("creates, reads, updates and deletes with correct status codes", async () => {
    const created = await call(await vocabList.POST(req("POST", { english: "resilient", persian: "مقاوم" }), noParams));
    expect(created.status).toBe(201);
    const id = created.body.id;
    expect((await call(await vocabOne.GET(req("GET"), withId(id)))).body).toMatchObject({ english: "resilient", status: "new" });
    const upd = await call(await vocabOne.PUT(req("PUT", { english: "resilient", persian: "پایدار", difficulty: "hard" }), withId(id)));
    expect(upd.body).toMatchObject({ persian: "پایدار", difficulty: "hard" });
    const list = await call(await vocabList.GET(req("GET", undefined, {}, "http://localhost/api/vocab?q=resil&sort=alpha"), noParams));
    expect(list.body).toMatchObject({ total: 1 });
    expect((await call(await vocabOne.DELETE(req("DELETE"), withId(id)))).status).toBe(200);
    expect((await call(await vocabOne.GET(req("GET"), withId(id)))).status).toBe(404);
  });

  it("validates input on the server and reports duplicates with 409", async () => {
    const bad = await call(await vocabList.POST(req("POST", { english: "   " }), noParams));
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatchObject({ code: "validation" });
    expect((await call(await vocabList.POST(req("POST", { english: "x", difficulty: "impossible" }), noParams))).status).toBe(400);
    expect((await call(await vocabList.POST(req("POST", { english: "x", collectionId: randomUUID() }), noParams))).status).toBe(400);
    await vocabList.POST(req("POST", { english: "Dup" }), noParams);
    const dup = await call(await vocabList.POST(req("POST", { english: " dup. " }), noParams));
    expect(dup.status).toBe(409);
    expect(dup.body.error.details.existingId).toBeTruthy();
    const badJson = await vocabList.POST(new Request("http://localhost/api/x", { method: "POST", body: "{nope", headers: { host: "localhost" } }), noParams);
    expect(badJson.status).toBe(400);
    expect((await call(await vocabOne.GET(req("GET"), withId("not-a-uuid")))).status).toBe(404);
  });

  it("ignores any user id sent by the browser: data always belongs to the session user", async () => {
    const created = await call(await vocabList.POST(req("POST", { english: "mine", ownerId: U2, userId: U2 }), noParams));
    expect(created.body.ownerId).toBe(U1);
    as(U2);
    expect((await call(await vocabList.GET(req("GET", undefined, {}, `http://localhost/api/vocab?userId=${U1}&ownerId=${U1}`), noParams))).body.total).toBe(0);
  });

  it("keeps users apart: another account gets 404 for reads, edits, deletes and practice", async () => {
    const w = await addWord(U1, "secret", { persian: "راز" });
    as(U2);
    expect((await call(await vocabOne.GET(req("GET"), withId(w.id)))).status).toBe(404);
    expect((await call(await vocabOne.PUT(req("PUT", { english: "hacked" }), withId(w.id)))).status).toBe(404);
    expect((await call(await vocabOne.DELETE(req("DELETE"), withId(w.id)))).status).toBe(404);
    const ans = await call(await answer.POST(req("POST", { requestId: randomUUID(), vocabId: w.id, kind: "type", answer: "secret" }), noParams));
    expect(ans.status).toBe(404);
    const exported = await (await exp.GET(req("GET"), noParams)).text();
    expect(exported).not.toContain("secret");
    expect(await getOwned(U1, w.id)).toMatchObject({ english: "secret", practiceCount: 0 });
  });

  it("blocks cross-site writes and allows same-site ones", async () => {
    const evil = await call(await vocabList.POST(req("POST", { english: "csrf" }, { origin: "https://evil.example" }), noParams));
    expect(evil.status).toBe(403);
    const ok = await call(await vocabList.POST(req("POST", { english: "fine" }, { origin: "http://localhost" }), noParams));
    expect(ok.status).toBe(201);
  });
});

describe("practice API", () => {
  it("starts a session without exposing answers and counts a retried answer once", async () => {
    for (const [e, p] of [["cat", "گربه"], ["dog", "سگ"], ["owl", "جغد"], ["fox", "روباه"]]) await addWord(U1, e, { persian: p });
    const s = await call(await session.POST(req("POST", { mode: "en-fa", count: 4 }), noParams));
    expect(s.status).toBe(200);
    expect(s.body.questions).toHaveLength(4);
    expect(JSON.stringify(s.body)).not.toMatch(/correctAnswer/);
    const q = s.body.questions[0];
    const right = { cat: "گربه", dog: "سگ", owl: "جغد", fox: "روباه" }[q.prompt as string]!;
    const body = { requestId: q.id, vocabId: q.vocabId, kind: q.kind, answer: right };
    const a1 = await call(await answer.POST(req("POST", body), noParams));
    const a2 = await call(await answer.POST(req("POST", body), noParams));
    expect(a1.body).toMatchObject({ correct: true, practiceCount: 1, replayed: false });
    expect(a2.body).toMatchObject({ correct: true, practiceCount: 1, replayed: true });
    expect((await getOwned(U1, q.vocabId)).practiceCount).toBe(1);
  });

  it("returns 422 with a clear code when there is nothing to practice and 400 for bad input", async () => {
    const empty = await call(await session.POST(req("POST", { mode: "typing" }), noParams));
    expect(empty.status).toBe(422);
    expect(empty.body.error.code).toBe("nothing_to_practice");
    expect((await call(await session.POST(req("POST", { mode: "bogus" }), noParams))).status).toBe(400);
    expect((await call(await answer.POST(req("POST", { requestId: "x" }), noParams))).status).toBe(400);
  });
});

describe("translation and configuration errors", () => {
  it("reports an unconfigured translation provider without crashing, and never leaks config", async () => {
    vi.stubEnv("TRANSLATION_PROVIDER", "");
    vi.stubEnv("TRANSLATION_API_KEY", "");
    expect((await call(await translate.GET(req("GET"), noParams))).body).toEqual({ configured: false });
    const r = await call(await translate.POST(req("POST", { text: "hello", mode: "translate" }), noParams));
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe("not_configured");
    expect((await call(await translate.POST(req("POST", { text: "", mode: "translate" }), noParams))).status).toBe(400);
    vi.unstubAllEnvs();
  });

  it("answers 503 (not a crash) when the database is not configured", async () => {
    setRedisClient(null);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const r = await call(await vocabList.GET(req("GET"), noParams));
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe("not_configured");
    vi.unstubAllEnvs();
  });

  it("hides internal error details from clients", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    setRedisClient({ exec: async () => { throw new Error("secret-token-xyz exploded"); }, pipeline: async () => { throw new Error("boom"); } });
    const r = await call(await vocabList.GET(req("GET"), noParams));
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain("secret-token-xyz");
    expect(spy.mock.calls.flat().join(" ")).not.toContain("secret-token-xyz");
    spy.mockRestore();
  });
});
