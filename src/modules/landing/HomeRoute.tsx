// ═══ HomeRoute — route `/` intelligente ═══
//
// Comportement :
//   • Visiteur non connecté        → affiche la LandingPage publique
//   • Utilisateur connecté         → redirige automatiquement vers /dashboard
//   • Supabase indisponible (offline) → affiche la LandingPage (pas de garde)
//
// Évite qu'un utilisateur loggé doive re-cliquer "Connexion" pour atteindre
// son dashboard, tout en offrant une vitrine publique aux visiteurs.

import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, isOfflineMode } from '../../lib/supabase'

const LandingPage = lazy(() => import('./LandingPage'))

type AuthState = 'checking' | 'authenticated' | 'anonymous'

export default function HomeRoute() {
  const [authState, setAuthState] = useState<AuthState>('checking')

  useEffect(() => {
    // En mode offline (pas de Supabase configuré) → toujours afficher la landing
    if (isOfflineMode) {
      setAuthState('anonymous')
      return
    }

    // Check session active ; timeout 2 s pour éviter de bloquer l'affichage
    const timeout = setTimeout(() => setAuthState('anonymous'), 2000)

    void supabase.auth.getSession().then(({ data }) => {
      clearTimeout(timeout)
      setAuthState(data.session ? 'authenticated' : 'anonymous')
    }).catch(() => {
      clearTimeout(timeout)
      setAuthState('anonymous')
    })

    return () => clearTimeout(timeout)
  }, [])

  if (authState === 'checking') {
    // Splash minimaliste pendant le check (max 2 s)
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1d23' }}>
        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
          Atlas BIM
        </div>
      </div>
    )
  }

  if (authState === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#1a1d23' }} />}>
      <LandingPage />
    </Suspense>
  )
}
