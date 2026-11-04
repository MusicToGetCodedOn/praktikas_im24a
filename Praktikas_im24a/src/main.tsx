import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import Admin from './Admin.tsx'

const isAdmin = window.location.pathname.replace(/\/+$/, '') === '/admin'

// Own visitor log for the admin "Besucher" tab (see api/_visits.ts).
if (import.meta.env.PROD && !isAdmin) {
  let r = ''
  try {
    const ref = new URL(document.referrer)
    if (ref.host !== window.location.host) r = ref.host
  } catch {
    // no referrer
  }
  try {
    navigator.sendBeacon('/api/track', JSON.stringify({ p: window.location.pathname, r }))
  } catch {
    // tracking must never break the page
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Analytics />
    {isAdmin ? <Admin /> : <App />}
  </StrictMode>,
)
