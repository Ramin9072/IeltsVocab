import type { Cmd, RedisClient } from "./types";

/**
 * Runs a list of commands as ONE atomic Lua script. This is what keeps the
 * vocabulary hash and all of its secondary indexes consistent: either every
 * command applies or none do, and no other client can interleave.
 * (Single-node Redis / Upstash: keys inside the script need not be declared.)
 */
const BATCH = `
local cmds = cjson.decode(ARGV[1])
for i = 1, #cmds do redis.call(unpack(cmds[i])) end
return #cmds
`;

/**
 * Optimistic-concurrency + idempotency guard.
 *  KEYS[1] record hash (must hold a "version" field)   KEYS[2] idempotency key
 *  ARGV: expectedVersion, idempotencyTtlSeconds, idempotencyValue ("" = none), commands JSON
 */
const GUARDED = `
if ARGV[3] ~= '' then
  local prev = redis.call('GET', KEYS[2])
  if prev then return {'replay', prev} end
end
local v = redis.call('HGET', KEYS[1], 'version')
if not v then return {'missing'} end
if v ~= ARGV[1] then return {'conflict'} end
local cmds = cjson.decode(ARGV[4])
for i = 1, #cmds do redis.call(unpack(cmds[i])) end
if ARGV[3] ~= '' then redis.call('SET', KEYS[2], ARGV[3], 'EX', ARGV[2]) end
return {'ok'}
`;

const RATE = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('TTL', KEYS[1])
return {c, ttl}
`;

// Arguments are sent as strings so Lua never reformats large integers.
const encode = (cmds: Cmd[]) => JSON.stringify(cmds.map((c) => c.map((a) => String(a))));

export async function atomic(r: RedisClient, cmds: Cmd[]): Promise<void> {
  if (cmds.length === 0) return;
  await r.exec(["EVAL", BATCH, 0, encode(cmds)]);
}

export type GuardResult = { status: "ok" } | { status: "conflict" } | { status: "missing" } | { status: "replay"; value: string };

export async function guarded(
  r: RedisClient,
  opts: {
    key: string;
    expectedVersion: number;
    cmds: Cmd[];
    idemKey?: string;
    idemValue?: string;
    idemTtlSeconds?: number;
  },
): Promise<GuardResult> {
  const useIdem = Boolean(opts.idemKey && opts.idemValue);
  const res = await r.exec<unknown[]>([
    "EVAL",
    GUARDED,
    2,
    opts.key,
    opts.idemKey ?? `${opts.key}:no-idempotency`,
    String(opts.expectedVersion),
    String(opts.idemTtlSeconds ?? 86_400),
    useIdem ? (opts.idemValue as string) : "",
    encode(opts.cmds),
  ]);
  const tag = String(res[0]);
  if (tag === "replay") return { status: "replay", value: String(res[1]) };
  if (tag === "ok" || tag === "conflict" || tag === "missing") return { status: tag };
  throw new Error("Unexpected response from guarded script");
}

/** Fixed-window counter. Returns the new count and seconds until the window resets. */
export async function incrWindow(r: RedisClient, key: string, windowSeconds: number) {
  const res = await r.exec<[number, number]>(["EVAL", RATE, 1, key, String(windowSeconds)]);
  return { count: Number(res[0]), ttl: Math.max(1, Number(res[1])) };
}
