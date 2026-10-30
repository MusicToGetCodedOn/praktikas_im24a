import { createHash, timingSafeEqual } from 'node:crypto';

// Vercel function behind the admin panel. The list lives in src/data.json in
// the repo: a save commits that file and Vercel redeploys the site.
//
// Env (Vercel project settings):
//   ADMIN_PASSWORD  password for the panel
//   GITHUB_TOKEN    fine-grained token, "Contents: read and write" on the repo
//   GITHUB_REPO     optional, default MusicToGetCodedOn/praktikas_im24a
//   GITHUB_BRANCH   optional, default main

const REPO = process.env.GITHUB_REPO ?? 'MusicToGetCodedOn/praktikas_im24a';
const BRANCH = process.env.GITHUB_BRANCH ?? 'main';
const FILE = 'Praktikas_im24a/src/data.json';
const MAX_ENTRIES = 100;
const MAX_LEN = 200;

interface Entry {
  name: string;
  firma: string;
  link: string;
}

interface TableData {
  rank: string[];
  name: string[];
  firma: string[];
  link: string[];
}

function passwordOk(given: unknown) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof given !== 'string') return false;
  // Hash first so both buffers have the same length for timingSafeEqual.
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

function parseEntries(raw: unknown): Entry[] | string {
  if (!Array.isArray(raw)) return 'Liste fehlt.';
  if (raw.length === 0) return 'Die Liste braucht mindestens einen Eintrag.';
  if (raw.length > MAX_ENTRIES) return `Höchstens ${MAX_ENTRIES} Einträge.`;
  const out: Entry[] = [];
  for (const [i, item] of raw.entries()) {
    const row = `Zeile ${i + 1}`;
    if (typeof item !== 'object' || item === null) return `${row}: ungültig.`;
    const { name, firma, link } = item as Record<string, unknown>;
    if (typeof name !== 'string' || typeof firma !== 'string' || typeof link !== 'string') {
      return `${row}: ungültig.`;
    }
    const e = { name: name.trim(), firma: firma.trim(), link: link.trim() };
    if (!e.name || !e.firma || !e.link) return `${row}: Name, Firma und Link ausfüllen.`;
    if (e.name.length > MAX_LEN || e.firma.length > MAX_LEN || e.link.length > MAX_LEN) {
      return `${row}: zu lang.`;
    }
    let url: URL;
    try {
      url = new URL(e.link);
    } catch {
      return `${row}: Link ist keine gültige URL.`;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return `${row}: Link muss mit https:// beginnen.`;
    }
    out.push(e);
  }
  return out;
}

function github(path: string, init?: RequestInit) {
  return fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'im24-admin',
      ...init?.headers,
    },
  });
}

async function readFile() {
  const res = await github(`contents/${FILE}?ref=${BRANCH}`);
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const body = (await res.json()) as { sha: string; content: string };
  const data = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8')) as TableData;
  const entries: Entry[] = data.rank.map((_, i) => ({
    name: data.name[i],
    firma: data.firma[i],
    link: data.link[i],
  }));
  return { sha: body.sha, entries };
}

export async function POST(request: Request) {
  let body: { password?: unknown; entries?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }

  if (!passwordOk(body.password)) {
    return Response.json({ error: 'Falsches Passwort.' }, { status: 401 });
  }
  if (!process.env.GITHUB_TOKEN) {
    return Response.json({ error: 'GITHUB_TOKEN ist auf dem Server nicht gesetzt.' }, { status: 500 });
  }

  try {
    const current = await readFile();

    // Login: no list sent, hand back the current one from the repo.
    if (body.entries === undefined) {
      return Response.json({ entries: current.entries });
    }

    const entries = parseEntries(body.entries);
    if (typeof entries === 'string') {
      return Response.json({ error: entries }, { status: 400 });
    }

    const data: TableData = {
      rank: entries.map((_, i) => String(i + 1)),
      name: entries.map((e) => e.name),
      firma: entries.map((e) => e.firma),
      link: entries.map((e) => e.link),
    };
    const res = await github(`contents/${FILE}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: 'data: Rangliste über das Admin-Panel aktualisiert',
        content: Buffer.from(JSON.stringify(data, null, 2) + '\n').toString('base64'),
        sha: current.sha,
        branch: BRANCH,
      }),
    });
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    return Response.json({ entries });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Speichern auf GitHub fehlgeschlagen.' }, { status: 502 });
  }
}
