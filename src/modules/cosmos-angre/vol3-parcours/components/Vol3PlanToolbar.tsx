// F-004 : toolbar du tab "plan" extrait de Vol3Module.tsx.
// Tous les boutons conditionnels `activeTab === 'plan' && ...` qui etaient
// dans le header sont regroupes ici. Les handlers complexes (flux, exports,
// PDF) sont passes en callbacks pour garder le couplage au state parent.

import {
  Grid3X3, Box, Signpost, Flame, Accessibility, FileText, Layers, Send,
  PlayCircle, Bell, Sparkles, ChevronDown, Eraser,
} from 'lucide-react'
import { useHiddenEntitiesStore } from '../../shared/stores/hiddenEntitiesStore'

interface FlowSummary {
  paths: { length: number }
  signage: { length: number }
  placement?: {
    coherence: { total: number }
    summary: { totalPanels: number; mandatoryPanels: number }
    panels: { length: number }
  }
  pmr?: {
    compliant: boolean
    complianceScore: number
    stats: { nonCompliantEdges: number }
  }
  navGraph?: { nodes: { length: number }; edges: { length: number } }
}

type ViewMode = '2d' | '3d' | '3d-advanced'
type TimeSlot = 'opening' | 'midday' | 'closing'

export interface Vol3PlanToolbarProps {
  activeTab: string
  floors: Array<{ id: string; level: string }>
  activeFloorId: string
  onSetActiveFloor: (id: string) => void
  viewMode: ViewMode
  onSetViewMode: (v: ViewMode) => void
  parsedPlan: unknown | null
  flowResult: FlowSummary | null
  computingFlow: boolean
  onComputeFlow: () => void
  onClearFlow: () => void
  showSpaceInfo: boolean
  onToggleSpaceInfo: () => void
  eraseMode: boolean
  onToggleEraseMode: () => void
  onOpenReport: () => void
  onOpenCleaning: () => void
  onOpenSignage: () => void
  activeAbmSlot: TimeSlot | null
  onOpenAbm: () => void
  onOpenPmr: () => void
  onExportWayfindingJson: () => void
  onExportCdcExcel: () => void
  onExportDxf: () => void
  onOpenPov: () => void
  onOpenQrExport: () => void
  projectId: string | null
  onOpenFeedbackInbox: () => void
  onOpenMemory: () => void
  onExportPdfReport: () => void
  visitorProfiles: Array<{ id: string; name: string; pmrRequired?: boolean }>
  activeProfileId: string | null
  onSetActiveProfile: (id: string | null) => void
}

function EraserButton({ eraseMode, onToggle, disabled }: {
  eraseMode: boolean; onToggle: () => void; disabled?: boolean
}) {
  const hiddenCount = useHiddenEntitiesStore(s => s.hiddenIds.length)
  const showAll = useHiddenEntitiesStore(s => s.showAll)
  return (
    <>
      <button onClick={onToggle} disabled={disabled}
        className={`ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          eraseMode ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
        }`}
        title={disabled
          ? "Importez un plan d'abord"
          : "Gomme : clic sur un pilier / hachure / faux-plafond pour le masquer individuellement"}>
        <Eraser className="w-3.5 h-3.5" />
        {eraseMode ? 'Gomme active' : 'Gommer'}
        {hiddenCount > 0 && <span className="ml-1 px-1 rounded bg-surface-0/30 text-[9px]">{hiddenCount}</span>}
      </button>
      {hiddenCount > 0 && (
        <button onClick={() => { if (confirm(`Reafficher les ${hiddenCount} entite(s) masquee(s) ?`)) showAll() }}
          className="ml-1 flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-400 hover:text-white"
          title="Tout reafficher">
          ↺
        </button>
      )}
    </>
  )
}

export function Vol3PlanToolbar(props: Vol3PlanToolbarProps) {
  const {
    activeTab, floors, activeFloorId, onSetActiveFloor,
    viewMode, onSetViewMode,
    parsedPlan, flowResult, computingFlow, onComputeFlow, onClearFlow,
    showSpaceInfo, onToggleSpaceInfo,
    eraseMode, onToggleEraseMode,
    onOpenReport, onOpenCleaning, onOpenSignage,
    activeAbmSlot, onOpenAbm, onOpenPmr,
    onExportWayfindingJson, onExportCdcExcel, onExportDxf,
    onOpenPov, onOpenQrExport,
    projectId, onOpenFeedbackInbox, onOpenMemory,
    onExportPdfReport,
    visitorProfiles, activeProfileId, onSetActiveProfile,
  } = props

  if (activeTab !== 'plan') {
    // Hors plan : affiche uniquement le badge Proph3t et laisse le spacer.
    return (
      <>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-atlas-500/8 border border-atlas-500/15">
          <Sparkles className="w-3 h-3 text-atlas-400" />
          <span className="text-[10px] font-semibold text-atlas-300/80">Proph3t</span>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Floor tabs */}
      <div className="flex items-center gap-1 ml-6">
        {floors.map((f) => (
          <button key={f.id}
            onClick={() => onSetActiveFloor(f.id)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              f.id === activeFloorId
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {f.level}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* View mode toggle */}
      <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-0.5 mr-3">
        <button onClick={() => onSetViewMode('2d')}
          className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
            viewMode === '2d' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
          }`}>
          <Grid3X3 className="w-3 h-3" />2D
        </button>
        <button onClick={() => onSetViewMode('3d')}
          className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
            viewMode === '3d' ? 'bg-purple-700 text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
          title="Vue 3D volumétrique (Three.js)">
          <Box className="w-3 h-3" />3D
        </button>
        <button onClick={() => onSetViewMode('3d-advanced')}
          className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
            viewMode === '3d-advanced' ? 'bg-pink-700 text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
          title="Vue 3D avancée (module Isométrique/Perspective/Semi-réaliste)">
          3D+
        </button>
      </div>

      {/* Flux */}
      {parsedPlan && (
        <button onClick={onComputeFlow} disabled={computingFlow}
          className="ml-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-gradient-to-r from-emerald-600 to-blue-600 text-white hover:opacity-90 disabled:opacity-50"
          title="Tracer les flux entrées → sorties et positionner la signalétique recommandée (A* sur plan réel)">
          {computingFlow ? '⏳ Calcul…' : flowResult
            ? `🚶 ${flowResult.paths.length} flux · ${flowResult.signage.length} panneaux`
            : '🚶 Tracer flux & panneaux'}
        </button>
      )}
      {flowResult && (
        <button onClick={onClearFlow}
          className="ml-1 flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-400 hover:text-white"
          title="Masquer les flux et panneaux">✕</button>
      )}

      {/* Correction labels — toujours visible, desactive si pas de plan */}
      <button onClick={onToggleSpaceInfo} disabled={!parsedPlan}
        className={`ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          showSpaceInfo ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
        }`}
        title={parsedPlan
          ? "Afficher/corriger la labelisation des espaces (clic sur un espace pour le renommer ou changer sa categorie)"
          : "Importez un plan d'abord"}>
        🏷 {showSpaceInfo ? 'Labels' : 'Corriger labels'}
      </button>

      {/* Gomme : masquer piliers, hachures, faux-plafond, elements parasites */}
      <EraserButton eraseMode={eraseMode && !!parsedPlan} onToggle={onToggleEraseMode} />
      {!parsedPlan && null}

      {/* Rapport */}
      {parsedPlan && flowResult && (
        <button onClick={onOpenReport}
          className="ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90"
          title="Générer le rapport écrit détaillé des flux et de la signalétique">
          <FileText className="w-3.5 h-3.5" />Rapport
        </button>
      )}

      {/* Nettoyer plan — toujours visible, desactive si pas de plan */}
      <button onClick={onOpenCleaning} disabled={!parsedPlan}
        className="ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
        title={parsedPlan
          ? "Nettoyer le plan (retirer les calques beton / hachures / cotations / texte parasites)"
          : "Importez un plan d'abord"}>
        <Layers className="w-3.5 h-3.5" />Nettoyer plan
      </button>

      {/* Score cohérence */}
      {flowResult?.placement && (
        <button onClick={onOpenSignage}
          className="ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
          title={`Score cohérence ${flowResult.placement.coherence.total}/100 · ${flowResult.placement.summary.totalPanels} panneaux (${flowResult.placement.summary.mandatoryPanels} ERP)`}>
          <Signpost className="w-3.5 h-3.5" />Score {flowResult.placement.coherence.total}/100
        </button>
      )}

      {/* ABM */}
      {flowResult && flowResult.paths.length > 0 && (
        <button onClick={onOpenAbm}
          className={`ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${
            activeAbmSlot ? 'bg-rose-700 text-white' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
          title="Simulation ABM Social Force (3 tranches horaires) + heatmap densité">
          <Flame className="w-3.5 h-3.5" />Flux ABM{activeAbmSlot && ` · ${activeAbmSlot}`}
        </button>
      )}

      {/* PMR */}
      {flowResult?.pmr && (
        <button onClick={onOpenPmr}
          className={`ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${
            flowResult.pmr.compliant
              ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              : 'bg-orange-700 text-white hover:bg-orange-600'
          }`}
          title={`Conformité PMR ${flowResult.pmr.complianceScore}/100 · ${flowResult.pmr.stats.nonCompliantEdges} segment(s) non conforme(s)`}>
          <Accessibility className="w-3.5 h-3.5" />PMR {flowResult.pmr.complianceScore}/100
        </button>
      )}

      {/* Export JSON wayfinding */}
      {flowResult?.navGraph && (
        <button onClick={onExportWayfindingJson}
          className="ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
          title={`Exporter le graphe de navigation (${flowResult.navGraph.nodes.length} nœuds / ${flowResult.navGraph.edges.length} arêtes) pour app mobile wayfinding`}>
          <Send className="w-3.5 h-3.5" />JSON
        </button>
      )}

      {/* Export CDC Excel */}
      {flowResult?.placement && (
        <button onClick={onExportCdcExcel}
          className="ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Exporter le Cahier des Charges signalétique (Excel avec coordonnées, normes, fournisseurs CI, prix FCFA)">
          <FileText className="w-3.5 h-3.5" />CDC Excel
        </button>
      )}

      {/* Export DXF */}
      {parsedPlan && (
        <button onClick={onExportDxf}
          className="ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Exporter le DXF nettoyé (seulement les calques conservés) pour bureau d'études">
          <Layers className="w-3.5 h-3.5" />DXF
        </button>
      )}

      {/* POV */}
      {flowResult && parsedPlan && flowResult.paths.length > 0 && (
        <button onClick={onOpenPov}
          className="ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:opacity-90"
          title="Visite guidée piéton : simule le parcours depuis l'entrée avec vérification panneaux à chaque décision">
          <PlayCircle className="w-3.5 h-3.5" />Visite guidée
        </button>
      )}

      {/* QR export */}
      {flowResult?.placement && flowResult.placement.panels.length > 0 && (
        <button onClick={onOpenQrExport}
          className="ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Générer une planche QR par panneau à coller sur le terrain (feedback mobile)">
          <span className="text-sm leading-none">⫴</span>QR terrain
        </button>
      )}

      {/* Signalements */}
      {projectId && (
        <button onClick={onOpenFeedbackInbox}
          className="ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
          title="Voir les signalements remontés du terrain">
          <Bell className="w-3.5 h-3.5" />Signalements
        </button>
      )}

      {/* Memoire */}
      {projectId && (
        <button onClick={onOpenMemory}
          className="ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-gradient-to-r from-purple-700 to-indigo-700 text-white hover:opacity-90"
          title="Appliquer des corrections validées sur d'autres projets similaires">
          <Sparkles className="w-3.5 h-3.5" />Mémoire
        </button>
      )}

      {/* Rapport PDF */}
      {flowResult && parsedPlan && (
        <button onClick={onExportPdfReport}
          className="ml-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-gradient-to-r from-rose-600 to-red-700 text-white hover:opacity-90"
          title="Générer le rapport signalétique PDF annoté (couverture + score + plan + tableaux + méthodologie)">
          <FileText className="w-3.5 h-3.5" />PDF
        </button>
      )}

      {/* Profile selector */}
      <div className="relative">
        <select value={activeProfileId ?? ''}
          onChange={(e) => onSetActiveProfile(e.target.value || null)}
          className="appearance-none bg-surface-1 border border-gray-700 rounded-lg px-3 py-1.5 pr-7 text-xs text-gray-300 focus:outline-none focus:border-emerald-500">
          <option value="">Tous profils</option>
          {visitorProfiles.map((p) => (
            <option key={p.id} value={p.id}>{p.name}{p.pmrRequired ? ' (PMR)' : ''}</option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Proph3t badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-atlas-500/8 border border-atlas-500/15">
        <Sparkles className="w-3 h-3 text-atlas-400" />
        <span className="text-[10px] font-semibold text-atlas-300/80">Proph3t</span>
      </div>
    </>
  )
}
