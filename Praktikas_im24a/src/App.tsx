import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import tableData from './data.json';

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

function Mark() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <g className="hl-float">
        <circle className="hl-planet" cx="50" cy="50" r="25" fill="currentColor" mask="url(#pmP)" />
        <path className="hl-ring" pathLength={1} d="M94 50A44 12.5 0 0 0 6 50" transform="rotate(-28 50 50)" fill="none" stroke="currentColor" strokeWidth="5" mask="url(#pmB)" />
        <path className="hl-ring hl-front" pathLength={1} d="M6 50A44 12.5 0 0 0 94 50" transform="rotate(-28 50 50)" fill="none" stroke="currentColor" strokeWidth="5" />
      </g>
    </svg>
  );
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
  const app = useRef<HTMLDivElement>(null);
  useReveal(app);

  return (
    <div className="pl" id="app" ref={app}>
      {/* The masks are referenced by id, so they live once per page. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <mask id="pmP" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
            <rect width="100" height="100" fill="#ffffff" />
            <path d="M6 50A44 12.5 0 0 0 94 50" transform="rotate(-28 50 50)" fill="none" stroke="#000000" strokeWidth="11" />
          </mask>
          <mask id="pmB" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
            <rect width="100" height="100" fill="#ffffff" />
            <circle cx="50" cy="50" r="28" fill="#000000" />
          </mask>
        </defs>
      </svg>
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
