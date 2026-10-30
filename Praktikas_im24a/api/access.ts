import { createHash, timingSafeEqual } from 'node:crypto';

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
    return Response.json({ error: 'Falsches Passwort.' }, { status: 401 });
  }

  return Response.json({ ok: true });
}
