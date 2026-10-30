import { useState, type FormEvent } from 'react';
import { Mark, MarkMasks } from './Mark';

interface Entry {
  name: string;
  firma: string;
  link: string;
}

interface Row extends Entry {
  id: number;
}

let nextId = 0;
const toRows = (entries: Entry[]): Row[] => entries.map((e) => ({ ...e, id: nextId++ }));

type Status = { kind: 'ok' | 'err'; text: string } | null;

async function callAdmin(body: { password: string; entries?: Entry[] }) {
  let res: Response;
  try {
    res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Server nicht erreichbar.');
  }
  const data = (await res.json().catch(() => ({}))) as { entries?: Entry[]; error?: string };
  if (!res.ok || !data.entries) throw new Error(data.error ?? 'Server nicht erreichbar.');
  return data.entries;
}

export default function Admin() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      setRows(toRows(await callAdmin({ password })));
    } catch (err) {
      setStatus({ kind: 'err', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!rows) return;
    setBusy(true);
    setStatus(null);
    try {
      const entries = rows.map(({ name, firma, link }) => ({ name, firma, link }));
      setRows(toRows(await callAdmin({ password, entries })));
      setStatus({ kind: 'ok', text: 'Gespeichert. Die Seite ist in etwa einer Minute aktualisiert.' });
    } catch (err) {
      setStatus({ kind: 'err', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const update = (id: number, field: keyof Entry, value: string) =>
    setRows((rs) => rs && rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  const remove = (id: number) => setRows((rs) => rs && rs.filter((r) => r.id !== id));
  const move = (i: number, by: number) =>
    setRows((rs) => {
      if (!rs || i + by < 0 || i + by >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });
  const add = () => setRows((rs) => rs && [...rs, ...toRows([{ name: '', firma: '', link: 'https://' }])]);

  return (
    <div className="pl">
      <MarkMasks />
      <div className="site adm">
        <div className="top">
          <a className="logo" href="/" aria-label="Zur Rangliste">
            <Mark />
          </a>
        </div>

        <section className="list" aria-labelledby="a-h">
          <div className="head">
            <h2 id="a-h" className="d">
              <span className="lift">Admin</span>
            </h2>
          </div>

          {rows === null ? (
            <form className="login" onSubmit={login}>
              <div className="fld">
                <label htmlFor="pw">Passwort</label>
                <span className="pw">
                  <input
                    id="pw"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="ic"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                    aria-pressed={showPassword}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                      {showPassword && <path d="M4 4l16 16" />}
                    </svg>
                  </button>
                </span>
              </div>
              <button className="btn" disabled={busy}>
                {busy ? 'Prüfe …' : 'Anmelden'}
              </button>
            </form>
          ) : (
            <form onSubmit={save}>
              <ol className="ed">
                {rows.map((r, i) => (
                  <li key={r.id}>
                    <span className="rk">{String(i + 1).padStart(2, '0')}</span>
                    <label className="fld">
                      <span>Name</span>
                      <input value={r.name} onChange={(e) => update(r.id, 'name', e.target.value)} required maxLength={200} />
                    </label>
                    <label className="fld">
                      <span>Firma</span>
                      <input value={r.firma} onChange={(e) => update(r.id, 'firma', e.target.value)} required maxLength={200} />
                    </label>
                    <label className="fld">
                      <span>Portfolio-Link</span>
                      <input type="url" value={r.link} onChange={(e) => update(r.id, 'link', e.target.value)} required maxLength={200} />
                    </label>
                    <span className="acts">
                      <button type="button" className="ic" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Zeile ${i + 1} nach oben`}>↑</button>
                      <button type="button" className="ic" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Zeile ${i + 1} nach unten`}>↓</button>
                      <button type="button" className="ic" onClick={() => remove(r.id)} disabled={rows.length === 1} aria-label={`Zeile ${i + 1} löschen`}>✕</button>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="bar">
                <button type="button" className="btn ghost" onClick={add}>+ Eintrag</button>
                <button className="btn" disabled={busy}>
                  {busy ? 'Speichere …' : 'Speichern'}
                </button>
              </div>
            </form>
          )}

          {status && (
            <p className={`msg ${status.kind}`} role={status.kind === 'err' ? 'alert' : 'status'}>
              {status.text}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
