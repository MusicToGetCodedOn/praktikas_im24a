import { createHash } from 'node:crypto';

// Visitor log for the stats tab in the admin panel. The underscore keeps Vercel
// from turning this file into its own endpoint.
//
// Stored as a Redis list in Upstash (Vercel → Storage → Marketplace → Upstash
// for Redis, connect it to this project). Vercel then sets the env vars:
//   KV_REST_API_URL / KV_REST_API_TOKEN
//   (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN work too)
// Without them nothing is recorded and /api/stats says so.
//
// No raw IP address is stored: a visitor is a short hash of IP + browser, so the
// same device shows up under the same id without the address itself being kept.

const KEY = 'visits';
const MAX_EVENTS = 5000;
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|vercel-screenshot|facebookexternalhit|whatsapp|telegram/i;

export type VisitType = 'view' | 'unlock' | 'fail' | 'admin';

export interface Visit {
  t: number; // time, ms since epoch
  e: VisitType;
  p: string; // path
  v: string; // visitor id (hash)
  c: string; // country code, e.g. CH
  ci: string; // city
  b: string; // browser
  os: string;
  d: string; // Handy | Tablet | Computer
  r: string; // referrer host, '' = direct
}

function redisEnv() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export const storeReady = () => redisEnv() !== null;

async function redis(commands: (string | number)[][]) {
  const env = redisEnv();
  if (!env) throw new Error('Redis ist nicht eingerichtet.');
  const res = await fetch(`${env.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.token}` },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return (await res.json()) as { result?: unknown; error?: string }[];
}

function browser(ua: string) {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Firefox\/|FxiOS/.test(ua)) return 'Firefox';
  if (/Chrome\/|CriOS/.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Andere';
}

function os(ua: string) {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Andere';
}

function device(ua: string) {
  if (/iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) return 'Tablet';
  if (/Mobi|iPhone|Android/.test(ua)) return 'Handy';
  return 'Computer';
}

function header(h: Headers, name: string) {
  const raw = h.get(name) ?? '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

// Never throws: a broken log must not break the page or the login.
export async function recordVisit(request: Request, e: VisitType, p = '', r = '') {
  if (!storeReady()) return;
  const h = request.headers;
  const ua = h.get('user-agent') ?? '';
  if (!ua || BOT.test(ua)) return;
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || (h.get('x-real-ip') ?? '');
  const visit: Visit = {
    t: Date.now(),
    e,
    p: p || new URL(request.url).pathname,
    v: createHash('sha256').update(`${ip}|${ua}|${process.env.ADMIN_PASSWORD ?? ''}`).digest('hex').slice(0, 10),
    c: header(h, 'x-vercel-ip-country').slice(0, 2),
    ci: header(h, 'x-vercel-ip-city').slice(0, 60),
    b: browser(ua),
    os: os(ua),
    d: device(ua),
    r,
  };
  try {
    await redis([
      ['LPUSH', KEY, JSON.stringify(visit)],
      ['LTRIM', KEY, 0, MAX_EVENTS - 1],
    ]);
  } catch (err) {
    console.error(err);
  }
}

// Newest first.
export async function readVisits(): Promise<Visit[]> {
  const [res] = await redis([['LRANGE', KEY, 0, MAX_EVENTS - 1]]);
  if (res.error) throw new Error(res.error);
  return (res.result as string[]).map((s) => JSON.parse(s) as Visit);
}
