import { useEffect, useMemo, useState } from 'react';

// "Besucher" tab of the admin panel. Data comes from /api/stats (see api/_visits.ts).

type VisitType = 'view' | 'unlock' | 'fail' | 'admin';

interface Visit {
  t: number;
  e: VisitType;
  p: string;
  v: string;
  c: string;
  ci: string;
  b: string;
  os: string;
  d: string;
  r: string;
}

const RANGES = [7, 30, 90] as const;
const EVENTS: Record<VisitType, string> = {
  view: 'Aufruf',
  unlock: 'Entsperrt',
  fail: 'Falsches Passwort',
  admin: 'Admin-Login',
};

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['de'], { type: 'region' });
  } catch {
    return null;
  }
})();

function country(code: string) {
  if (!code) return '';
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

const place = (v: Visit) => [v.ci, country(v.c)].filter(Boolean).join(', ') || 'Unbekannt';
const dayKey = (t: number) => new Date(t).toLocaleDateString('sv-SE'); // YYYY-MM-DD, local time
const fmtShort = new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit' });
const fmtLong = new Intl.DateTimeFormat('de-CH', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtTime = new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const isVisitor = (v: Visit) => v.e !== 'admin';

interface Day {
  key: string;
  date: Date;
  visitors: Set<string>;
  views: number;
  unlocks: number;
  fails: number;
}

// Axis top: the next of 2/4/6/8/10 × 10ⁿ, so the midline is a whole number.
function niceTop(max: number) {
  if (max <= 2) return 2;
  const p = 10 ** Math.floor(Math.log10(max));
  return [2, 4, 6, 8, 10].map((m) => m * p).find((x) => x >= max) ?? 10 * p;
}

function breakdown(visits: Visit[], key: (v: Visit) => string) {
  const m = new Map<string, Set<string>>();
  for (const v of visits) {
    const k = key(v);
    if (!m.has(k)) m.set(k, new Set());
    m.get(k)!.add(v.v);
  }
  const rows = [...m].map(([label, s]) => ({ label, n: s.size })).sort((a, b) => b.n - a.n);
  if (rows.length > 6) {
    const rest = rows.splice(5);
    rows.push({ label: 'Andere', n: rest.reduce((sum, r) => sum + r.n, 0) });
  }
  return rows;
}

async function fetchVisits(password: string) {
  let res: Response;
  try {
    res = await fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
  } catch {
    throw new Error('Server nicht erreichbar.');
  }
  const data = (await res.json().catch(() => ({}))) as { visits?: Visit[]; error?: string };
  if (!res.ok || !data.visits) throw new Error(data.error ?? 'Server nicht erreichbar.');
  return { visits: data.visits, at: Date.now() };
}

export default function Stats({ password }: { password: string }) {
  const [data, setData] = useState<{ visits: Visit[]; at: number } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [hover, setHover] = useState<number | null>(null);
  const [filter, setFilter] = useState<VisitType | 'all'>('all');
  const [shown, setShown] = useState(30);

  async function load() {
    setBusy(true);
    setError('');
    try {
      setData(await fetchVisits(password));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let alive = true;
    fetchVisits(password).then(
      (d) => alive && setData(d),
      (err: Error) => alive && setError(err.message),
    ).finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [password]);

  const visits = data?.visits ?? null;
  const s = useMemo(() => {
    const all = data?.visits ?? [];
    const start = new Date(data?.at ?? 0);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (range - 1));
    const inRange = all.filter((v) => v.t >= start.getTime());

    const days: Day[] = [];
    for (let i = 0; i < range; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push({ key: dayKey(date.getTime()), date, visitors: new Set(), views: 0, unlocks: 0, fails: 0 });
    }
    const byKey = new Map(days.map((d) => [d.key, d]));
    for (const v of inRange) {
      const d = byKey.get(dayKey(v.t));
      if (!d || !isVisitor(v)) continue;
      d.visitors.add(v.v);
      if (v.e === 'view') d.views++;
      if (v.e === 'unlock') d.unlocks++;
      if (v.e === 'fail') d.fails++;
    }

    const people = inRange.filter(isVisitor);
    const perVisitor = new Map<string, number>();
    for (const v of all) if (isVisitor(v)) perVisitor.set(v.v, (perVisitor.get(v.v) ?? 0) + 1);

    return {
      inRange,
      days,
      top: niceTop(Math.max(0, ...days.map((d) => d.visitors.size))),
      visitors: new Set(people.map((v) => v.v)).size,
      views: people.filter((v) => v.e === 'view').length,
      unlocks: people.filter((v) => v.e === 'unlock').length,
      fails: people.filter((v) => v.e === 'fail').length,
      perVisitor,
      groups: [
        { title: 'Orte', rows: breakdown(people, place) },
        { title: 'Geräte', rows: breakdown(people, (v) => v.d) },
        { title: 'Browser', rows: breakdown(people, (v) => v.b) },
        { title: 'Betriebssystem', rows: breakdown(people, (v) => v.os) },
        { title: 'Herkunft', rows: breakdown(people, (v) => v.r || 'Direkt / Link') },
      ],
    };
  }, [data, range]);

  if (visits === null) {
    return (
      <div className="st">
        {error ? (
          <>
            <p className="msg err" role="alert">{error}</p>
            <div className="bar">
              <button type="button" className="btn ghost" onClick={load} disabled={busy}>
                Erneut versuchen
              </button>
            </div>
          </>
        ) : (
          <p className="st-empty">Lade Besucherdaten …</p>
        )}
      </div>
    );
  }

  const n = s.days.length;
  const labelEvery = Math.ceil(n / 7);
  const hd = hover === null ? null : s.days[hover];
  const log = s.inRange.filter((v) => filter === 'all' || v.e === filter);

  return (
    <div className="st">
      <div className="st-filters">
        <div className="seg" role="group" aria-label="Zeitraum">
          {RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>
              {r} Tage
            </button>
          ))}
        </div>
        <button type="button" className="btn ghost" onClick={load} disabled={busy}>
          {busy ? 'Lade …' : 'Aktualisieren'}
        </button>
      </div>
      {error && <p className="msg err" role="alert">{error}</p>}

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-l">Besucher</span>
          <span className="kpi-v">{s.visitors}</span>
          <span className="kpi-s">verschiedene Geräte</span>
        </div>
        <div className="kpi">
          <span className="kpi-l">Seitenaufrufe</span>
          <span className="kpi-v">{s.views}</span>
        </div>
        <div className="kpi">
          <span className="kpi-l">Entsperrt</span>
          <span className="kpi-v">{s.unlocks}</span>
          <span className="kpi-s">richtiges Passwort</span>
        </div>
        <div className="kpi">
          <span className="kpi-l">Fehlversuche</span>
          <span className="kpi-v">{s.fails}</span>
          <span className="kpi-s">falsches Passwort</span>
        </div>
      </div>

      <section className="st-card" aria-labelledby="st-chart-h">
        <h3 id="st-chart-h" className="st-h">Besucher pro Tag</h3>
        <div className="chart" onMouseLeave={() => setHover(null)}>
          <div className="chart-y" aria-hidden="true">
            {[s.top, s.top / 2, 0].map((t) => (
              <span key={t} style={{ bottom: `${(t / s.top) * 100}%` }}>{t}</span>
            ))}
          </div>
          <div className="chart-plot" role="img" aria-label={`Besucher pro Tag, letzte ${range} Tage. Insgesamt ${s.visitors} Besucher.`}>
            {[s.top, s.top / 2].map((t) => (
              <span key={t} className="grid" style={{ bottom: `${(t / s.top) * 100}%` }} />
            ))}
            {s.days.map((d, i) => (
              <div
                key={d.key}
                className={hover === i ? 'col on' : 'col'}
                onMouseEnter={() => setHover(i)}
                onClick={() => setHover(i)}
              >
                {d.visitors.size > 0 && <span className="b" style={{ height: `${(d.visitors.size / s.top) * 100}%` }} />}
              </div>
            ))}
            {hd && hover !== null && (
              <div
                className={`tip ${hover < n * 0.2 ? 'l' : hover > n * 0.8 ? 'r' : ''}`}
                style={{ left: `${((hover + 0.5) / n) * 100}%` }}
              >
                <strong>{fmtLong.format(hd.date)}</strong>
                <span><b>{hd.visitors.size}</b> Besucher</span>
                <span><b>{hd.views}</b> Aufrufe</span>
                <span><b>{hd.unlocks}</b> entsperrt</span>
                <span><b>{hd.fails}</b> {hd.fails === 1 ? 'Fehlversuch' : 'Fehlversuche'}</span>
              </div>
            )}
          </div>
          <div className="chart-x" aria-hidden="true">
            {s.days.map((d, i) => (
              <span key={d.key}>{(n - 1 - i) % labelEvery === 0 ? fmtShort.format(d.date) : ''}</span>
            ))}
          </div>
        </div>
        <details className="st-tbl">
          <summary>Als Tabelle anzeigen</summary>
          <table>
            <thead>
              <tr><th>Tag</th><th>Besucher</th><th>Aufrufe</th><th>Entsperrt</th><th>Fehlversuche</th></tr>
            </thead>
            <tbody>
              {[...s.days].reverse().map((d) => (
                <tr key={d.key}>
                  <td>{fmtShort.format(d.date)}</td>
                  <td>{d.visitors.size}</td>
                  <td>{d.views}</td>
                  <td>{d.unlocks}</td>
                  <td>{d.fails}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <div className="st-groups">
        {s.groups.map((g) => {
          const max = Math.max(1, ...g.rows.map((r) => r.n));
          return (
            <section key={g.title} className="st-card">
              <h3 className="st-h">{g.title}</h3>
              {g.rows.length === 0 ? (
                <p className="st-empty">Noch keine Daten.</p>
              ) : (
                <ul className="hb">
                  {g.rows.map((r) => (
                    <li key={r.label}>
                      <span className="hb-l">{r.label}</span>
                      <span className="hb-n">{r.n}</span>
                      <span className="hb-t"><span style={{ width: `${(r.n / max) * 100}%` }} /></span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section className="st-card" aria-labelledby="st-log-h">
        <div className="st-log-head">
          <h3 id="st-log-h" className="st-h">Letzte Besuche</h3>
          <label className="st-sel">
            <span className="sr">Ereignis filtern</span>
            <select value={filter} onChange={(e) => { setFilter(e.target.value as VisitType | 'all'); setShown(30); }}>
              <option value="all">Alle Ereignisse</option>
              {(Object.keys(EVENTS) as VisitType[]).map((k) => (
                <option key={k} value={k}>{EVENTS[k]}</option>
              ))}
            </select>
          </label>
        </div>
        {log.length === 0 ? (
          <p className="st-empty">Keine Einträge in diesem Zeitraum.</p>
        ) : (
          <div className="st-scroll">
            <table className="lg">
              <thead>
                <tr><th>Zeit</th><th>Ereignis</th><th>Ort</th><th>Gerät</th><th>Herkunft</th><th>Besucher</th></tr>
              </thead>
              <tbody>
                {log.slice(0, shown).map((v, i) => (
                  <tr key={`${v.t}-${i}`}>
                    <td className="lg-t">{fmtTime.format(v.t)}</td>
                    <td><span className={`ev ev-${v.e}`}>{EVENTS[v.e]}</span></td>
                    <td>{place(v)}</td>
                    <td>{v.d} · {v.os} · {v.b}</td>
                    <td className="lg-m">{v.r || 'Direkt'}</td>
                    <td className="lg-m" title={isVisitor(v) ? `${s.perVisitor.get(v.v) ?? 0} Einträge von diesem Gerät` : undefined}>
                      #{v.v.slice(0, 6)}{isVisitor(v) && (s.perVisitor.get(v.v) ?? 0) > 1 ? ` · ${s.perVisitor.get(v.v)}×` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {log.length > shown && (
          <div className="bar">
            <button type="button" className="btn ghost" onClick={() => setShown((x) => x + 50)}>
              Mehr anzeigen ({log.length - shown} weitere)
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
