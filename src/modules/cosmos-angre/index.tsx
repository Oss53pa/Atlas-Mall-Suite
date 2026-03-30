import React, { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import VolumesNav from './VolumesNav'
import { useOnboardingStore } from './shared/stores/onboardingStore'
import type { OnboardingResult } from './shared/components/OnboardingWizard'

const OnboardingWizard = React.lazy(() => import('./shared/components/OnboardingWizard'))
const Vol1Module = React.lazy(() => import('./vol1-commercial'))
const Vol2Module = React.lazy(() => import('./vol2-securitaire'))
const Vol3Module = React.lazy(() => import('./vol3-parcours'))
// Vol3D is now embedded inside Vol2/Vol3 as a view mode, not a standalone route
const Vol3DModule = React.lazy(() => import('./vol-3d'))

const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center">
    <div className="text-gray-400 flex items-center gap-3">
      <div className="w-5 h-5 border-2 border-gray-600 border-t-purple-500 rounded-full animate-spin" />
      Chargement du module...
    </div>
  </div>
)

export default function CosmosAngre() {
  const onboardingCompleted = useOnboardingStore((s) => s.completed)
  const markComplete = useOnboardingStore((s) => s.markComplete)

  const handleOnboardingComplete = (result: OnboardingResult) => {
    markComplete(result.project.name, result.floors.volumes, result.floors.floorCount)
  }

  const handleSkip = () => {
    markComplete('Cosmos Angre', ['vol1', 'vol2', 'vol3'], 3)
  }

  if (!onboardingCompleted) {
    return (
      <React.Suspense fallback={<LoadingFallback />}>
        <OnboardingWizard onComplete={handleOnboardingComplete} onSkip={handleSkip} />
      </React.Suspense>
    )
  }

  return (
    <React.Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route index element={<VolumesNav />} />
        <Route path="vol1/*" element={<Vol1Module />} />
        <Route path="vol2/*" element={<Vol2Module />} />
        <Route path="vol3/*" element={<Vol3Module />} />
        {/* Vue 3D avancée accessible via onglet dans Vol2/Vol3, route conservée pour compatibilité */}
        <Route path="3d/*" element={<Vol3DModule />} />
        <Route path="*" element={<Navigate to="/projects/cosmos-angre" replace />} />
      </Routes>
    </React.Suspense>
  )
}
