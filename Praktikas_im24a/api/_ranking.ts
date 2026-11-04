import { redis } from './_redis.js';

// The ranking lives in Redis, not in the repo: the repo is public and anything
// in it (or bundled into the site) is readable without the password. The site
// only gets the list from /api/access after the password check.

const KEY = 'ranking';
export const MAX_ENTRIES = 100;
export const MAX_LEN = 200;

export interface Entry {
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

// One-time move: the list used to be Praktikas_im24a/src/data.json in the repo.
// If Redis is still empty, take the last version of that file from GitHub (it is
// deleted on main, so look it up in the history).
const REPO = process.env.GITHUB_REPO ?? 'MusicToGetCodedOn/praktikas_im24a';
const BRANCH = process.env.GITHUB_BRANCH ?? 'main';
const OLD_FILE = 'Praktikas_im24a/src/data.json';

function github(path: string) {
  return fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'im24-admin',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
}

// raw.githubusercontent.com has no API rate limit and needs no token.
async function fileAt(ref: string): Promise<Entry[] | null> {
  const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${ref}/${OLD_FILE}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub raw ${res.status}`);
  const data = (await res.json()) as TableData;
  return data.rank.map((_, i) => ({ name: data.name[i], firma: data.firma[i], link: data.link[i] }));
}

async function fromGitHistory(): Promise<Entry[]> {
  const current = await fileAt(BRANCH);
  if (current) return current;
  // Newest commit touching the file is the one that deleted it: read its parent.
  // Needs the API (60 requests/hour without GITHUB_TOKEN, shared per IP).
  const res = await github(`commits?path=${OLD_FILE}&sha=${BRANCH}&per_page=1`);
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const [last] = (await res.json()) as { parents: { sha: string }[] }[];
  const parent = last?.parents[0]?.sha;
  return (parent && (await fileAt(parent))) || [];
}

export async function getRanking(): Promise<Entry[]> {
  const [raw] = await redis([['GET', KEY]]);
  if (typeof raw === 'string') return JSON.parse(raw) as Entry[];
  const entries = await fromGitHistory();
  if (entries.length) await redis([['SET', KEY, JSON.stringify(entries), 'NX']]);
  return entries;
}

export async function saveRanking(entries: Entry[]) {
  await redis([['SET', KEY, JSON.stringify(entries)]]);
}

export function parseEntries(raw: unknown): Entry[] | string {
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
