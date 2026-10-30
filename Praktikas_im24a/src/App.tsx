import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type RefObject } from 'react';
import tableData from './data.json';
import { Mark, MarkMasks } from './Mark';
import PasswordField from './PasswordField';

interface TableData {
  rank: string[];
  name: string[];
  firma: string[];
  link: string[];
}

const data: TableData = tableData;

// "https://www.richardeberhardt.ch/" → "richardeberhardt.ch"
function displayUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// Blocks below the fold fade in once they are 8% into the viewport.
function useReveal(root: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = root.current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !el || !('IntersectionObserver' in window)) return;
    const vh = window.innerHeight;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            io.unobserve(en.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    el.querySelectorAll('[data-reveal]').forEach((node) => {
      if (node.getBoundingClientRect().top > vh) {
        node.classList.add('is-pre');
        io.observe(node);
      }
    });
    return () => io.disconnect();
  }, [root]);
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('site-access') === 'granted');
  const app = useRef<HTMLDivElement>(null);
  useReveal(app);

  if (!unlocked) {
    return <AccessGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="pl" id="app" ref={app}>
      <MarkMasks />
      <div className="site">
        <div className="ld" aria-hidden="true">
          <span className="ld-in">
            <Mark />
          </span>
        </div>
        <div className="top">
          <span className="logo" role="img" aria-label="Logo">
            <Mark />
          </span>
        </div>

        <section className="list" aria-labelledby="t-h">
          <div className="head" data-reveal="">
            <h2 id="t-h" className="d">
              <span className="lift">IM24 Praktikas</span>
            </h2>
          </div>
          <div data-reveal="">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="c-rank" scope="col">Rang</th>
                  <th className="c-name" scope="col">Name</th>
                  <th className="c-firm" scope="col">Firma</th>
                  <th scope="col">Portfolio</th>
                </tr>
              </thead>
              <tbody>
                {data.rank.map((rank, i) => (
                  <tr key={rank}>
                    <td className="c-rank">
                      <span className="rk">
                        <span style={{ '--i': i } as CSSProperties}>{rank.padStart(2, '0')}</span>
                      </span>
                    </td>
                    <td className="nm">{data.name[i]}</td>
                    <td className="fm">{data.firma[i]}</td>
                    <td>
                      <a className="pf" href={data.link[i]} target="_blank" rel="noopener">
                        <span className="u">{displayUrl(data.link[i])}</span>
                        <span className="rnd" aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                            <path d="M4 10L10 4M5 4h5v5" />
                          </svg>
                        </span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function AccessGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Server nicht erreichbar.');
      sessionStorage.setItem('site-access', 'granted');
      onUnlock();
    } catch (err) {
      setError((err as Error).message);
      setShake(true);
    } finally {
      setBusy(false);
    }
  }

  // Dark like the loader, so unlocking flows straight into it.
  return (
    <div className="pl">
      <MarkMasks />
      <div className="site gate">
        <section className="gate-in" aria-labelledby="access-heading">
          <span className="gate-mark">
            <Mark />
          </span>
          <p className="gate-eye">
            <span className="lift">Klasse IM24A</span>
          </p>
          <h1 id="access-heading" className="d">
            <span className="lift">IM24 Praktikas</span>
          </h1>
          <p className="gate-txt">
            <span className="lift">Die Rangliste ist geschützt. Gib das Passwort ein, um sie zu öffnen.</span>
          </p>
          <form
            className={shake ? 'gate-form shake' : 'gate-form'}
            onSubmit={submit}
            onAnimationEnd={(e) => e.animationName === 'shake' && setShake(false)}
          >
            <PasswordField value={password} onChange={setPassword} />
            <button className="rnd go" disabled={busy || !password} aria-label="Öffnen">
              {busy ? (
                <span className="spin" aria-hidden="true" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              )}
            </button>
          </form>
          <p className="msg err" role="alert">{error}</p>
        </section>
      </div>
    </div>
  );
}
