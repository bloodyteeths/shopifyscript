import { createClient } from "redis";

let client;
let clientPromise;

function getRedisUrl() {
  // Prefer Vercel KV style first, then generic Redis
  const url = process.env.KV_URL || process.env.REDIS_URL;
  if (!url || url === "${REDIS_URL}") return null;
  return url;
}

export async function getRedisClient() {
  if (client && client.isOpen) return client;
  if (clientPromise) return clientPromise;

  const url = getRedisUrl();
  if (!url) {
    throw new Error(
      "Redis URL not configured. Set KV_URL or REDIS_URL in environment.",
    );
  }

  client = createClient({ url });
  client.on("error", (err) => {
    console.error("Redis Client Error", err);
  });

  clientPromise = client.connect().then(() => client);
  return clientPromise;
}

export async function pingRedis() {
  const c = await getRedisClient();
  try {
    const res = await c.ping();
    return res;
  } catch (e) {
    throw e;
  }
}

export async function getJson(key) {
  const c = await getRedisClient();
  const raw = await c.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export async function setJson(key, value, ttlSeconds) {
  const c = await getRedisClient();
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  if (ttlSeconds && Number(ttlSeconds) > 0) {
    await c.set(key, payload, { EX: Number(ttlSeconds) });
    return "OK";
  }
  return c.set(key, payload);
}

