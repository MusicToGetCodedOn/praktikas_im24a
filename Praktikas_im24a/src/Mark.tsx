// The masks are referenced by id, so render <MarkMasks /> once per page.
export function MarkMasks() {
  return (
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
  );
}

export function Mark() {
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
