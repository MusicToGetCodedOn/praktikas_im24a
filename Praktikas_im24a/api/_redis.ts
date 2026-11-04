// Shared Upstash Redis access (REST API, no extra dependency). The underscore
// keeps Vercel from turning this file into its own endpoint.
//
// Vercel → Storage → Marketplace → "Upstash for Redis", connected to this
// project, sets KV_REST_API_URL / KV_REST_API_TOKEN
// (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN work too).

function redisEnv() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export const storeReady = () => redisEnv() !== null;

export const STORE_MISSING =
  'Kein Speicher verbunden. In Vercel unter Storage eine Upstash-Redis-Datenbank mit dem Projekt verbinden und neu deployen.';

// Runs the commands as one pipeline; one result per command.
export async function redis(commands: (string | number)[][]) {
  const env = redisEnv();
  if (!env) throw new Error('Redis ist nicht eingerichtet.');
  const res = await fetch(`${env.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.token}` },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  const failed = out.find((r) => r.error);
  if (failed) throw new Error(failed.error);
  return out.map((r) => r.result);
}
