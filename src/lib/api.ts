import { ZodError } from "zod";
import { auth } from "@/auth";
import { HttpError } from "./errors";
import { ConfigError } from "./redis/client";
import { TranslationError } from "./translate/types";

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function errorResponse(status: number, code: string, message: string, details?: unknown, headers: Record<string, string> = {}) {
  return json({ error: { code, message, ...(details !== undefined ? { details } : {}) } }, status, headers);
}

/** The user id ALWAYS comes from the verified session, never from the request body or URL. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new HttpError(401, "unauthorized", "Please sign in");
  return id;
}

/** Basic CSRF defence for cookie-authenticated JSON endpoints: cross-site Origin headers are rejected. */
function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "forbidden", "Bad origin");
  }
  if (host && originHost !== host) throw new HttpError(403, "forbidden", "Cross-site request blocked");
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be valid JSON");
  }
}

export function toErrorResponse(e: unknown, label: string) {
  if (e instanceof HttpError) {
    const headers: Record<string, string> = {};
    const retry = (e.details as { retryAfter?: number } | undefined)?.retryAfter;
    if (e.status === 429 && retry) headers["Retry-After"] = String(retry);
    return errorResponse(e.status, e.code, e.message, e.details, headers);
  }
  if (e instanceof ZodError) {
    const issues = e.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return errorResponse(400, "validation", issues[0]?.message ?? "Invalid input", issues);
  }
  if (e instanceof ConfigError) return errorResponse(503, "not_configured", e.message);
  if (e instanceof TranslationError) return errorResponse(e.status, e.code, e.message);
  // Log the error name only: messages and bodies could contain user data or credentials.
  console.error(`[api] ${label} failed:`, e instanceof Error ? e.name : "unknown");
  return errorResponse(500, "internal", "Something went wrong. Please try again.");
}

// Next.js validates the second argument of route exports against this exact shape.
type Ctx<P> = { params: Promise<P> };

/** Wraps a private route handler: same-origin check, auth, error mapping. */
export function withUser<P extends Record<string, string> = Record<string, never>>(
  label: string,
  fn: (a: { req: Request; userId: string; params: P }) => Promise<Response | unknown>,
) {
  return async (req: Request, ctx: Ctx<P>): Promise<Response> => {
    try {
      assertSameOrigin(req);
      const userId = await requireUserId();
      const params = (ctx?.params ? await ctx.params : {}) as P; // ctx is absent only in unit tests
      const out = await fn({ req, userId, params });
      return out instanceof Response ? out : json(out);
    } catch (e) {
      return toErrorResponse(e, label);
    }
  };
}

/** Public handler (registration): no session, but same error mapping and origin check. */
export function publicRoute(label: string, fn: (req: Request) => Promise<Response | unknown>) {
  return async (req: Request): Promise<Response> => {
    try {
      assertSameOrigin(req);
      const out = await fn(req);
      return out instanceof Response ? out : json(out);
    } catch (e) {
      return toErrorResponse(e, label);
    }
  };
}
