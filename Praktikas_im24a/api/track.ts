import { recordVisit } from './_visits.js';

// Page view beacon from the site (navigator.sendBeacon, body is plain text JSON).
export async function POST(request: Request) {
  let body: { p?: unknown; r?: unknown } = {};
  try {
    body = JSON.parse(await request.text()) as typeof body;
  } catch {
    // Empty or broken body: still count the view.
  }
  const p = typeof body.p === 'string' ? body.p.slice(0, 100) : '/';
  const r = typeof body.r === 'string' ? body.r.slice(0, 100) : '';
  await recordVisit(request, 'view', p, r);
  return new Response(null, { status: 204 });
}
