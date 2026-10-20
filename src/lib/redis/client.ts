import { Redis } from "@upstash/redis";
import type { Cmd, RedisClient } from "./types";

export class ConfigError extends Error {
  readonly code = "not_configured";
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

let client: RedisClient | null = null;

/** Test hook: inject a different client (or null to reset). */
export function setRedisClient(c: RedisClient | null) {
  client = c;
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/** Lazily created so `next build` works without credentials. */
export function getRedis(): RedisClient {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new ConfigError(
      "Database is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    );
  }
  // automaticDeserialization:false keeps every value a plain string, so "123" or
  // "true" typed by a user is never silently turned into a number/boolean.
  const redis = new Redis({ url, token, automaticDeserialization: false, retry: { retries: 2, backoff: () => 100 } });
  const run = <T,>(cmd: Cmd) => redis.exec<T>(cmd as [string, ...(string | number)[]]);
  client = {
    exec: run,
    // The SDK auto-pipelines commands issued in the same tick into one HTTP request.
    pipeline: (cmds) => Promise.all(cmds.map((c) => run(c))),
  };
  return client;
}
