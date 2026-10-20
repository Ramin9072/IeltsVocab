import { Redis as IORedis } from "ioredis";
import { setRedisClient } from "@/lib/redis/client";
import type { Cmd, RedisClient } from "@/lib/redis/types";
import { createVocab } from "@/lib/vocab-repo";
import { vocabInputSchema, type VocabInput } from "@/lib/schemas";

let io: IORedis | null = null;

const str = (c: Cmd) => [String(c[0]), ...c.slice(1).map(String)] as [string, ...string[]];

/** Points the app at the real local redis-server and wipes it. */
export async function useTestRedis(): Promise<IORedis> {
  if (!io) io = new IORedis(Number(process.env.TEST_REDIS_PORT), "127.0.0.1");
  const client: RedisClient = {
    exec: async <T,>(cmd: Cmd) => (await io!.call(...str(cmd))) as T,
    pipeline: async (cmds) => {
      // ioredis resolves pipeline commands by lowercase method name
      const res = await io!.pipeline(cmds.map((c) => { const [name, ...rest] = str(c); return [name.toLowerCase(), ...rest]; })).exec();
      return (res ?? []).map(([err, val]) => {
        if (err) throw err;
        return val;
      });
    },
  };
  setRedisClient(client);
  await io.flushall();
  return io;
}

export async function closeTestRedis() {
  setRedisClient(null);
  await io?.quit();
  io = null;
}

export const word = (english: string, extra: Partial<VocabInput> = {}): VocabInput =>
  vocabInputSchema.parse({ english, ...extra });

export const addWord = (uid: string, english: string, extra: Partial<VocabInput> = {}, now?: number) =>
  createVocab(uid, word(english, extra), now);

export const U1 = "11111111-1111-4111-8111-111111111111";
export const U2 = "22222222-2222-4222-8222-222222222222";
