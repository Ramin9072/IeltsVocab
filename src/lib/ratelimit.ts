import { getRedis } from "./redis/client";
import { incrWindow } from "./redis/atomic";
import { K } from "./keys";
import { HttpError } from "./errors";

/** Fixed-window limiter backed by one atomic INCR+EXPIRE script. Throws 429 when exceeded. */
export async function enforceRate(scope: string, id: string, limit: number, windowSeconds: number) {
  const { count, ttl } = await incrWindow(getRedis(), K.rate(scope, id), windowSeconds);
  if (count > limit) {
    throw new HttpError(429, "rate_limited", `Too many requests. Try again in ${ttl} seconds.`, { retryAfter: ttl });
  }
  return { remaining: limit - count };
}
