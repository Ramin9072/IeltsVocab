// Dev/test helper: speaks the tiny part of Upstash's REST protocol this app uses
// (POST / with a JSON command array -> {"result": ...}) in front of a local Redis.
// Lets you run the full app offline without an Upstash account. NOT for production.
//
//   redis-server --port 6379 &
//   node scripts/local-upstash-proxy.mjs          # listens on http://127.0.0.1:8079
//   UPSTASH_REDIS_REST_URL=http://127.0.0.1:8079 UPSTASH_REDIS_REST_TOKEN=local-dev-token npm run dev
import http from "node:http";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
const token = process.env.PROXY_TOKEN ?? "local-dev-token";
const port = Number(process.env.PORT ?? 8079);

http
  .createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.headers.authorization !== `Bearer ${token}`) return send(401, { error: "Unauthorized" });
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try {
      const cmd = JSON.parse(raw);
      if (!Array.isArray(cmd) || cmd.length === 0) return send(400, { error: "ERR invalid command" });
      const result = await redis.call(String(cmd[0]), ...cmd.slice(1).map(String));
      // Like Upstash, honour "Upstash-Encoding: base64": the SDK expects bulk strings base64-encoded ("OK" is left as is).
      const enc = req.headers["upstash-encoding"] === "base64";
      const encode = (v) => (typeof v === "string" ? (v === "OK" ? v : Buffer.from(v).toString("base64")) : Array.isArray(v) ? v.map(encode) : v);
      send(200, { result: enc ? encode(result) : result });
    } catch (e) {
      send(400, { error: e instanceof Error ? e.message : "ERR" });
    }
  })
  .listen(port, "127.0.0.1", () => console.log(`Upstash-compatible proxy on http://127.0.0.1:${port}`));
