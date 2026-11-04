import { createHash, timingSafeEqual } from 'node:crypto';
import { STORE_MISSING, storeReady } from './_redis.js';
import { readVisits } from './_visits.js';

// Visitor log for the "Besucher" tab in the admin panel.

function passwordOk(given: unknown) {
  const expected = process.env.ADMIN_PASSWORD;
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
    return Response.json({ error: 'Falsches Passwort.' }, { status: 401 });
  }
  if (!storeReady()) {
    return Response.json({ error: STORE_MISSING }, { status: 503 });
  }

  try {
    return Response.json({ visits: await readVisits() });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Besucherdaten konnten nicht geladen werden.' }, { status: 502 });
  }
}
