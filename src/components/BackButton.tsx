// ═══ BackButton — Bouton "Retour" intelligent ═══
//
// Affiché en haut à gauche sur toutes les pages. Remonte d'un niveau :
//   • Sur un volume (/projects/X/vol1) → retour au workspace projet (/projects/X)
//   • Sur un workspace projet (/projects/X) → retour au dashboard (/dashboard)
//   • Sur une page transversale (/scenarios, /dce, etc.) → retour au dashboard
//   • Sur settings → retour au dashboard
//   • Sur dashboard → retour à l'accueil (/)
//
// Comportement :
//   - Utilise navigate(-1) si possible (historique navigateur)
//   - Sinon, remonte d'un niveau selon la structure URL
//   - Affiche le label de destination pour clarté

import { ArrowLeft, Home } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

interface BackButtonProps {
  /** Label personnalisé (sinon déduit automatiquement). */
  label?: string
  /** Si true, toujours retourner à l'accueil racine '/'. */
  toHome?: boolean
  /** Classes supplémentaires. */
  className?: string
}

function getParentPath(pathname: string): { path: string; label: string } {
  // /projects/:id/vol1, /vol2, /vol3, /vol4, /studio, /3d, /scene-editor
  const volMatch = pathname.match(/^(\/projects\/[^/]+)\/(vol[1-4]|studio|3d|scene-editor)/)
  if (volMatch) {
    return { path: volMatch[1], label: 'Projet' }
  }

  // /projects/:id (workspace racine)
  const projectMatch = pathname.match(/^\/projects\/[^/]+\/?$/)
  if (projectMatch) {
    return { path: '/dashboard', label: 'Mes projets' }
  }

  // Transversal / Tools
  if (['/scenarios', '/validation', '/dce', '/benchmark', '/proph3t', '/export', '/virtual-tour'].some(p => pathname.startsWith(p))) {
    return { path: '/dashboard', label: 'Mes projets' }
  }

  // Settings
  if (pathname.startsWith('/settings')) {
    return { path: '/dashboard', label: 'Mes projets' }
  }

  // Dashboard → home
  if (pathname === '/dashboard' || pathname === '/') {
    return { path: '/', label: 'Accueil' }
  }

  // Default fallback
  return { path: '/dashboard', label: 'Mes projets' }
}

export default function BackButton({ label, toHome, className = '' }: BackButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()

  // Pas de back sur la vraie home ni sur les pages auth/onboarding
  if (
    location.pathname === '/' ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/onboard')
  ) {
    return null
  }

  const parent = toHome
    ? { path: '/', label: 'Accueil' }
    : getParentPath(location.pathname)

  const displayLabel = label ?? parent.label
  const Icon = parent.path === '/' ? Home : ArrowLeft

  return (
    <button
      onClick={() => navigate(parent.path)}
      aria-label={`Retour · ${displayLabel}`}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors ${className}`}
    >
      <Icon size={13} />
      <span className="hidden sm:inline">{displayLabel}</span>
    </button>
  )
}
