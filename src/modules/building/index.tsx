import React from 'react'
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import { useOnboardingStore } from './shared/stores/onboardingStore'
import type { OnboardingResult } from './shared/components/OnboardingWizard'
import { ErrorBoundary } from './shared/components/ErrorBoundary'
import { usePlanHydration } from './shared/hooks/usePlanHydration'
import { useEditableSpacesCloudSync } from './shared/hooks/useEditableSpacesCloudSync'
import { usePlanEngineStore } from './shared/stores/planEngineStore'
import { Lock, AlertCircle } from 'lucide-react'
import { lazyWithReload } from '@/lib/lazyWithReload'

const OnboardingWizard = lazyWithReload(() => import('./shared/components/OnboardingWizard'))
const Vol1Module = lazyWithReload(() => import('./vol1-commercial'))
const Vol2Module = lazyWithReload(() => import('./vol2-securitaire'))
const Vol3Module = lazyWithReload(() => import('./vol3-parcours'))
const Vol4Module = lazyWithReload(() => import('./vol4-wayfinder'))
const Proph3tGlobalMount = lazyWithReload(() =>
  import('./shared/proph3t/components/Proph3tGlobalMount').then(m => ({ default: m.Proph3tGlobalMount }))
)
// Vol3D is now embedded inside Vol2/Vol3 as a view mode, not a standalone route
const Vol3DModule = lazyWithReload(() => import('./vol-3d'))
const SceneEditor = lazyWithReload(() => import('./scene-editor'))
const EditPlanFloatingButton = lazyWithReload(() =>
  import('./shared/components/EditPlanFloatingButton').then(m => ({ default: m.EditPlanFloatingButton }))
)
const AtlasStudioModule = lazyWithReload(() => import('./shared/components/AtlasStudioModule'))
const GeometryQualityDashboard = lazyWithReload(() =>
  import('./shared/components/GeometryQualityDashboard').then(m => ({ default: m.GeometryQualityDashboard }))
)

const LoadingFallback = () => (
  <div className="min-h-screen bg-surface-0 flex items-center justify-center">
    <div className="text-gray-400 flex items-center gap-3">
      <div className="w-5 h-5 border-2 border-gray-600 border-t-purple-500 rounded-full animate-spin" />
      Chargement du module...
    </div>
  </div>
)

export default function CosmosAngre() {
  // Recharge le parsedPlan depuis IndexedDB si besoin (après refresh / navigation)
  usePlanHydration()

  const { projectId } = useParams<{ projectId: string }>()

  // Sync cloud best-effort des EditableSpace → Supabase cells.
  // Debounce 8 s, no-op hors-ligne, pas de blocage UI.
  useEditableSpacesCloudSync({ projectId: projectId ?? '', enabled: !!projectId })

  const onboardingCompleted = useOnboardingStore((s) => s.completed)
  const markComplete = useOnboardingStore((s) => s.markComplete)

  const handleOnboardingComplete = (result: OnboardingResult) => {
    markComplete(result.project.name, result.floors.volumes, result.floors.floorCount)
  }

  const handleSkip = () => {
    const defaultName = projectId === 'cosmos-angre' ? 'The Mall' : (projectId ?? 'Nouveau projet')
    markComplete(defaultName, ['vol1', 'vol2', 'vol3', 'vol4'], 3)
  }

  if (!onboardingCompleted) {
    return (
      <React.Suspense fallback={<LoadingFallback />}>
        <OnboardingWizard onComplete={handleOnboardingComplete} onSkip={handleSkip} />
      </React.Suspense>
    )
  }

  // Guard : si le plan n'est pas validé, rediriger vers remodelage

  return (
    <React.Suspense fallback={<LoadingFallback />}>
      <>
        <Routes>
          {/* Accueil projet = Atlas Studio (Phase 0 — import + édition + modèles) */}
          <Route index element={<Navigate to="studio" replace />} />
          <Route path="studio/*" element={<ErrorBoundary fallbackTitle="Erreur Atlas Studio"><AtlasStudioModule /></ErrorBoundary>} />
          {/* Ancienne page Remodelage — redirige vers Atlas Studio (source unique) */}
          <Route path="remodelage/*" element={<Navigate to="../studio" replace />} />
          {/* Volumes métier — protégés par le guard BaselineGuard */}
          <Route path="vol1/*" element={<BaselineGuard projectId={projectId}><ErrorBoundary fallbackTitle="Erreur Vol.1 Commercial"><Vol1Module /></ErrorBoundary></BaselineGuard>} />
          <Route path="vol2/*" element={<BaselineGuard projectId={projectId}><ErrorBoundary fallbackTitle="Erreur Vol.2 Securitaire"><Vol2Module /></ErrorBoundary></BaselineGuard>} />
          <Route path="vol3/*" element={<BaselineGuard projectId={projectId}><ErrorBoundary fallbackTitle="Erreur Vol.3 Parcours"><Vol3Module /></ErrorBoundary></BaselineGuard>} />
          <Route path="vol4/*" element={<BaselineGuard projectId={projectId}><ErrorBoundary fallbackTitle="Erreur Vol.4 Wayfinder"><Vol4Module /></ErrorBoundary></BaselineGuard>} />
          {/* Vue 3D avancee / Editeur de scene */}
          <Route path="3d/*" element={<Vol3DModule />} />
          <Route path="scene-editor/*" element={<ErrorBoundary fallbackTitle="Erreur Editeur de Scene"><SceneEditor /></ErrorBoundary>} />
          {/* Admin — qualité géométrique des polygones de l'éditeur (dashboard + cleanup dry-run). */}
          <Route path="admin/geometry" element={<ErrorBoundary fallbackTitle="Erreur dashboard qualité"><div className="min-h-screen bg-surface-0"><GeometryQualityDashboard /></div></ErrorBoundary>} />
          <Route path="*" element={<Navigate to={`/projects/${projectId ?? 'cosmos-angre'}`} replace />} />
        </Routes>
        {/* Modal PROPH3T montée UNE SEULE FOIS au niveau projet (pas dans chaque volume) */}
        <React.Suspense fallback={null}>
          <Proph3tGlobalMount />
        </React.Suspense>
        {/* Bouton flottant "Éditer le plan" — accessible depuis tous les volumes */}
        <React.Suspense fallback={null}>
          <EditPlanFloatingButton />
        </React.Suspense>
      </>
    </React.Suspense>
  )
}

// ─── BaselineGuard ────────────────────────────────────
// Bloque l'accès aux volumes tant que le plan n'est pas validé comme base.

function BaselineGuard({
  projectId, children,
}: { projectId?: string; children: React.ReactNode }) {
  const navigate = useNavigate()
  const planValidated = usePlanEngineStore(s => s.planValidated)
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)

  if (!parsedPlan) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-0 p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="w-14 h-14 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Aucun plan importé</h2>
          <p className="text-sm text-slate-400 mb-5">
            Vous devez d'abord importer un plan avant d'utiliser les volumes métier.
          </p>
          <button
            onClick={() => navigate(`/projects/${projectId ?? 'cosmos-angre'}/remodelage`)}
            className="px-5 py-2.5 rounded-lg bg-atlas-500 hover:bg-atlas-500 text-white text-sm font-semibold"
          >
            Importer un plan →
          </button>
        </div>
      </div>
    )
  }

  if (!planValidated) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-0 p-8">
        <div className="text-center max-w-md">
          <Lock className="w-14 h-14 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Base de travail non verrouillée</h2>
          <p className="text-sm text-slate-400 mb-5">
            Le plan doit d'abord être validé comme <strong className="text-white">base de travail </strong>
            (Phase 2 · Remodelage) avant d'accéder aux volumes métier.
            Identifiez chaque espace puis cliquez <strong className="text-emerald-400">« Enregistrer comme base »</strong>.
          </p>
          <button
            onClick={() => navigate(`/projects/${projectId ?? 'cosmos-angre'}/remodelage`)}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/20"
          >
            Aller au Remodelage →
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
