import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";

let proc: ChildProcess | null = null;

function waitForPort(port: number, timeoutMs = 8000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const s = net.connect(port, "127.0.0.1");
      s.once("connect", () => {
        s.destroy();
        resolve();
      });
      s.once("error", () => {
        s.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error("redis-server did not start"));
        else setTimeout(attempt, 100);
      });
    };
    attempt();
  });
}

/** Starts a throwaway local redis-server so the data layer is tested against real Redis semantics (Lua, sorted sets...). */
export default async function setup() {
  if (process.env.TEST_REDIS_PORT) return; // already provided (e.g. CI service container)
  const port = 20000 + Math.floor(Math.random() * 20000);
  proc = spawn("redis-server", ["--port", String(port), "--bind", "127.0.0.1", "--save", "", "--appendonly", "no"], { stdio: "ignore" });
  await waitForPort(port);
  process.env.TEST_REDIS_PORT = String(port);
  return () => {
    proc?.kill("SIGTERM");
  };
}
