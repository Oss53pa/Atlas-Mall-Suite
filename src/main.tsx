import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initMonitoring } from './lib/monitoring';
import App from './App.tsx';
import './index.css';

// Initialize Sentry monitoring before rendering (production only)
initMonitoring();

// ─── IMMÉDIAT : ferme toutes les modales qui auraient pu persister ───
// Ceinture + bretelles : même si partialize les exclut, localStorage corrompu
// ou migration peut les laisser true → on force false au démarrage
try {
  const k = 'atlas-plan-engine'
  const raw = localStorage.getItem(k)
  if (raw) {
    const parsed = JSON.parse(raw)
    if (parsed?.state) {
      parsed.state.proph3tModalOpen = false
      parsed.state.floorAttributionOpen = false
      localStorage.setItem(k, JSON.stringify(parsed))
    }
  }
} catch { /* ignore */ }

// ─── Escape key global — ferme toutes les modales PROPH3T ───
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    import('./modules/cosmos-angre/shared/stores/planEngineStore')
      .then(m => m.usePlanEngineStore.getState().closeAllModals())
      .catch(() => { /* */ })
  }
})

// Expose une commande d'urgence pour fermer les modales sans reload
;(window as any).closeAllModals = () => {
  import('./modules/cosmos-angre/shared/stores/planEngineStore')
    .then(m => {
      m.usePlanEngineStore.getState().closeAllModals()
      console.log('[Atlas] Toutes les modales fermées.')
    })
}

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
        console.log('[Atlas] Build', __BUILD_ID__ ?? 'dev')
        console.log('[Atlas] Commandes d\'urgence :')
        console.log('  • window.closeAllModals()  — ferme les modales coincées')
        console.log('  • window.nuclearReset()    — reset complet SW + caches')
        console.log('  • Touche Escape            — ferme les modales')
      })
      .catch(() => { /* silent */ })
  })
}
