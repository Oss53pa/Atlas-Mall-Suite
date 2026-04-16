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
      .then(mod => {
        mod.registerServiceWorker()
        // Expose une commande globale d'urgence : window.nuclearReset()
        ;(window as any).nuclearReset = mod.nuclearReset
        console.log('[Atlas] Build', __BUILD_ID__ ?? 'dev', '· tapez window.nuclearReset() dans la console pour reset complet')
      })
      .catch(() => { /* silent */ })
  })
}
