import { createHash, timingSafeEqual } from 'node:crypto';
import { getRanking, parseEntries, saveRanking } from './_ranking.js';
import { STORE_MISSING, storeReady } from './_redis.js';
import { recordVisit } from './_visits.js';

// Vercel function behind the admin panel. The list lives in Redis (see
// api/_ranking.ts); a save is live right away, no redeploy.
//
// Env (Vercel project settings):
//   ADMIN_PASSWORD     password for the panel
//   KV_REST_API_URL /  set by the Upstash for Redis integration
//   KV_REST_API_TOKEN

function passwordOk(given: unknown) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof given !== 'string') return false;
  // Hash first so both buffers have the same length for timingSafeEqual.
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  let body: { password?: unknown; entries?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }

  if (!passwordOk(body.password)) {
    await recordVisit(request, 'fail', '/admin');
    return Response.json({ error: 'Falsches Passwort.' }, { status: 401 });
  }
  if (!storeReady()) {
    return Response.json({ error: STORE_MISSING }, { status: 503 });
  }

  try {
    // Login: no list sent, hand back the current one.
    if (body.entries === undefined) {
      await recordVisit(request, 'admin', '/admin');
      return Response.json({ entries: await getRanking() });
    }

    const entries = parseEntries(body.entries);
    if (typeof entries === 'string') {
      return Response.json({ error: entries }, { status: 400 });
    }
    await saveRanking(entries);
    return Response.json({ entries });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Rangliste konnte nicht geladen oder gespeichert werden.' }, { status: 502 });
  }
}
