/** A raw Redis command, e.g. ["HSET", "key", "field", "value"]. */
export type Cmd = (string | number)[];

/**
 * The only surface the app needs from Redis. Production uses Upstash's REST
 * client; tests use ioredis against a real local redis-server.
 * Every multi-key mutation goes through Lua (see atomic.ts), so this stays tiny.
 */
export interface RedisClient {
  exec<T = unknown>(cmd: Cmd): Promise<T>;
  /** Sends many independent commands in one round trip (not atomic). */
  pipeline(cmds: Cmd[]): Promise<unknown[]>;
}
