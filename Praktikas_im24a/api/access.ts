import { createHash, timingSafeEqual } from 'node:crypto';
import { getRanking } from './_ranking.js';
import { STORE_MISSING, storeReady } from './_redis.js';
import { recordVisit } from './_visits.js';

// Password gate of the public page. The ranking is only handed out here, after
// the password check, so it is not readable from the repo or the site bundle.

function passwordOk(given: unknown) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected || typeof given !== 'string') return false;
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  let body: { password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }

  if (!passwordOk(body.password)) {
    await recordVisit(request, 'fail', '/');
    return Response.json({ error: 'Falsches Passwort.' }, { status: 401 });
  }
  if (!storeReady()) {
    return Response.json({ error: STORE_MISSING }, { status: 503 });
  }

  try {
    const entries = await getRanking();
    await recordVisit(request, 'unlock', '/');
    return Response.json({ entries });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Rangliste konnte nicht geladen werden.' }, { status: 502 });
  }
}
