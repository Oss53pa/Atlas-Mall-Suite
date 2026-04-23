// F-004 : router des sections non-plan de Vol.3 extrait de Vol3Module.tsx.
// Centralise les 28 branches `activeTab === '...'` qui affichaient leur section
// lazy-loadee en pleine largeur. Logique inchangee — les callbacks complexes
// (plan_imports) restent passes en prop pour preserver le couplage a l'etat parent.

import React, { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import type { Vol3Tab } from '../sidebarConfig'

const ParcoursSectionLazy = lazy(() => import('./ParcoursSection'))
const ParcoursClientSectionLazy = lazy(() => import('./ParcoursClientSection'))
const WayfindingSectionLazy = lazy(() => import('./WayfindingSection'))
const SignaleticsSectionLazy = lazy(() => import('./SignaleticsSection'))
const HeatmapSectionLazy = lazy(() => import('./HeatmapSection'))
const RapportSectionLazy = lazy(() => import('./RapportSection'))
const ChatSectionLazy = lazy(() => import('./ChatSection'))
const IntroSectionLazy = lazy(() => import('./IntroSection'))
const JourneyMapSectionLazy = lazy(() => import('./JourneyMapSection'))
const SwimlaneSectionLazy = lazy(() => import('./SwimlaneSection'))
const PersonasGridLazy = lazy(() => import('./PersonasGrid'))
const PersonaDetailLazy = lazy(() => import('./PersonaDetail'))
const TouchpointsMatrixLazy = lazy(() => import('./TouchpointsMatrix'))
const KpiDashboardLazy = lazy(() => import('./KpiDashboard'))
const PlanActionLazy = lazy(() => import('./PlanAction'))
const SignaletiquePageLazy = lazy(() => import('./SignaletiquePage'))
const ExperienceDashboardLazy = lazy(() => import('./ExperienceDashboard'))
const ActionTrackerLazy = lazy(() => import('./ActionTracker'))
const SignaletiquTrackerLazy = lazy(() => import('./SignaletiquTracker'))
const TouchpointTrackerLazy = lazy(() => import('./TouchpointTracker'))
const FeedbackModuleLazy = lazy(() => import('./FeedbackModule'))
const DwellTimeOptimizerLazy = lazy(() => import('./DwellTimeOptimizer'))
const RevenuePredictorLazy = lazy(() => import('./RevenuePredictor'))
const SeasonalPlanningLazy = lazy(() => import('./SeasonalPlanning'))
const TenantMixValidatorLazy = lazy(() => import('./TenantMixValidator'))
const SpaceEditorSectionLazy = lazy(() => import('./SpaceEditorSection'))
const VolumeHistoryTabLazy = lazy(() => import('../../shared/components/VolumeHistoryTab'))
const VolumeReportsTabLazy = lazy(() => import('../../shared/components/VolumeReportsTab'))
const GodModeSignageHostLazy = lazy(() => import('./GodModeSignageHost'))

interface Vol3NonPlanRouterProps {
  activeTab: Vol3Tab
  /** Rendu de l'onglet `plan_imports` delegue au parent (couple a useVol3Store + callback). */
  renderPlanImports: () => React.ReactNode
}

export function Vol3NonPlanRouter({ activeTab, renderPlanImports }: Vol3NonPlanRouterProps) {
  return (
    <main className="flex-1 min-w-0 overflow-y-auto" style={{ background: '#080c14' }}>
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        </div>
      }>
        {activeTab === 'intro' && <IntroSectionLazy />}
        {activeTab === 'journeymap' && <JourneyMapSectionLazy />}
        {activeTab === 'parcoursvisuel' && <ParcoursSectionLazy />}
        {activeTab === 'swimlane' && <SwimlaneSectionLazy />}
        {activeTab === 'personas' && <PersonasGridLazy />}
        {activeTab === 'awa_moussa' && <PersonaDetailLazy personaId="awa_moussa" />}
        {activeTab === 'serge' && <PersonaDetailLazy personaId="serge" />}
        {activeTab === 'pamela' && <PersonaDetailLazy personaId="pamela" />}
        {activeTab === 'aminata' && <PersonaDetailLazy personaId="aminata" />}
        {activeTab === 'touchpoints' && <TouchpointsMatrixLazy />}
        {activeTab === 'kpis' && <KpiDashboardLazy />}
        {activeTab === 'action' && <PlanActionLazy />}
        {activeTab === 'signaletique_page' && <SignaletiquePageLazy />}
        {activeTab === 'parcours' && <ParcoursClientSectionLazy />}
        {activeTab === 'wayfinding' && <WayfindingSectionLazy />}
        {activeTab === 'signaletique' && <SignaleticsSectionLazy />}
        {activeTab === 'heatmap' && <HeatmapSectionLazy />}
        {activeTab === 'rapport' && <RapportSectionLazy />}
        {activeTab === 'chat' && <ChatSectionLazy />}
        {activeTab === 'exp_dashboard' && <ExperienceDashboardLazy />}
        {activeTab === 'action_tracker' && <ActionTrackerLazy />}
        {activeTab === 'signa_tracker' && <SignaletiquTrackerLazy />}
        {activeTab === 'touch_tracker' && <TouchpointTrackerLazy />}
        {activeTab === 'feedbacks' && <FeedbackModuleLazy />}
        {activeTab === 'dwell_time' && <DwellTimeOptimizerLazy />}
        {activeTab === 'revenue_predictor' && <RevenuePredictorLazy />}
        {activeTab === 'seasonal' && <SeasonalPlanningLazy />}
        {activeTab === 'tenant_mix_validator' && <TenantMixValidatorLazy />}
        {activeTab === 'space_editor' && <SpaceEditorSectionLazy />}
        {activeTab === 'history' && (
          <VolumeHistoryTabLazy volumeId="vol3" volumeColor="#34d399" volumeName="Parcours client" />
        )}
        {activeTab === 'reports' && (
          <VolumeReportsTabLazy
            volumeId="vol3"
            volumeColor="#34d399"
            volumeName="Parcours client"
            projectName="The Mall"
          />
        )}
        {activeTab === 'god_mode_signage' && <GodModeSignageHostLazy />}
        {activeTab === 'plan_imports' && renderPlanImports()}
      </Suspense>
    </main>
  )
}
