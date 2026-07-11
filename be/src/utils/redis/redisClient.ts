import Redis, { RedisOptions } from "ioredis";

// Optional override for environments where DNS returns an unreachable address
// family by default (e.g. NAT64-only networks failing on the literal IPv4 hop).
const family = process.env.REDIS_FAMILY ? Number(process.env.REDIS_FAMILY) : undefined;

function makeClient(label: string) {
  const url = process.env.REDIS_URL;
  if (url) {
    const client = new Redis(url, {
      // good production defaults
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      family,
      tls: url.startsWith("rediss://")
        ? { servername: new URL(url).hostname }
        : undefined,
    } as RedisOptions);
    client.on("error", (e) => console.error(`[redis:${label}]`, e.message));
    return client;
  }

  // Otherwise build from discrete env vars
  const host = process.env.REDIS_HOST!;
  const port = Number(process.env.REDIS_PORT!);
  const username = process.env.REDIS_USERNAME;
  const password = process.env.REDIS_PASSWORD;

  const useTLS = process.env.REDIS_TLS === "true";

  const opts: RedisOptions = {
    host,
    port,
    username,
    password,
    family,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    ...(useTLS ? { tls: { servername: host } } : {}),
  };

  const client = new Redis(opts);
  client.on("error", (e) => console.error(`[redis:${label}]`, e.message));
  return client;
}

export const redis = makeClient("main");
export const sub   = makeClient("sub");
export const pub   = makeClient("pub");

export async function safeEvalSha(sha: string, ...args: unknown[]) {
  return redis.evalsha(sha, 0, ...(args as string[]));
}
