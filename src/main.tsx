import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initMonitoring } from './lib/monitoring';
import App from './App.tsx';
import './index.css';

// Initialize Sentry monitoring before rendering (production only)
initMonitoring();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// M24 — Enregistre le service worker après first paint (offline-first)
if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    import('./modules/cosmos-angre/shared/offline/serviceWorkerClient')
      .then(mod => mod.registerServiceWorker())
      .catch(() => { /* silent */ })
  })
}
