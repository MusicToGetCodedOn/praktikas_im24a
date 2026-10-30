import { useId, useState } from 'react';

// Password input with an eye button that shows or hides what was typed.
export default function PasswordField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="fld">
      <label htmlFor={id}>Passwort</label>
      <span className="pw">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoFocus
        />
        <button
          type="button"
          className="ic"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
          aria-pressed={visible}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </span>
    </div>
  );
}
