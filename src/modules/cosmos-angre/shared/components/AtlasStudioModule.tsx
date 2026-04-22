// ═══ Atlas Studio Module ═══
//
// Module PHASE 0 autonome :
//   Onglet 1 — IMPORT    : import DXF/DWG/PDF via PlanImportsSection
//   Onglet 2 — ÉDITEUR   : édition polygonale via SpaceEditorSection (shared)
//   Onglet 3 — MODÈLES   : bibliothèque des plans enregistrés
//
// Accessible via /projects/:projectId/studio/*
// Les modèles enregistrés ici alimentent ensuite Vol.1/Vol.2/Vol.3/Vol.4.

import { lazy, Suspense, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Upload, Edit3, Archive, Sparkles, Lock, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { usePlanModelsStore } from '../stores/planModelsStore'
import { usePlanEngineStore } from '../stores/planEngineStore'

const PlanImportsSection = lazy(() => import('./PlanImportsSection'))
const SpaceEditorSection = lazy(() => import('./SpaceEditorSection'))
const PlanModelsLibrary = lazy(() =>
  import('./PlanModelsLibrary').then(m => ({ default: m.PlanModelsLibrary }))
)

type Tab = 'import' | 'editor' | 'models'

const TABS: Array<{ id: Tab; label: string; icon: any; color: string; desc: string }> = [
  { id: 'import', label: 'Import',     icon: Upload,  color: '#0ea5e9', desc: 'Charger un plan DXF, DWG ou PDF' },
  { id: 'editor', label: 'Éditeur',    icon: Edit3,   color: '#a77d4c', desc: 'Dessiner, découper, corriger les espaces' },
  { id: 'models', label: 'Modèles',    icon: Archive, color: '#10b981', desc: 'Bibliothèque des plans enregistrés' },
]

export default function AtlasStudioModule() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const pid = projectId ?? 'cosmos-angre'

  const [tab, setTab] = useState<Tab>('import')

  const parsedPlan = usePlanEngineStore((s) => s.parsedPlan)
  const planValidated = usePlanEngineStore((s) => s.planValidated)
  // Sélections Zustand stables — on ne consomme pas les fonctions dérivées
  // du store (elles retournent des nouveaux array/objets à chaque call →
  // boucle de re-render infinie). On dérive via useMemo.
  const allModels = usePlanModelsStore((s) => s.models)
  const activeModelId = usePlanModelsStore((s) => s.activeModelIdByProject[pid])
  const models = useMemo(
    () => allModels.filter(m => m.projectId === pid),
    [allModels, pid],
  )
  const activeModel = useMemo(
    () => allModels.find(m => m.id === activeModelId) ?? undefined,
    [allModels, activeModelId],
  )

  return (
    <div className="h-full flex flex-col bg-[#080c14]">
      {/* Header */}
      <header className="px-5 py-3 border-b border-white/10 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-transparent flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(`/projects/${pid}`)}
            className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white"
            title="Retour projet"
          >
            <ArrowLeft size={14} />
          </button>
          <Sparkles size={16} className="text-atlas-400" />
          <div>
            <h1 className="text-sm font-bold text-white m-0">Atlas Studio · Phase 0</h1>
            <p className="text-[10px] text-slate-500 m-0">
              Import + édition du plan · source unique pour les 4 volumes
            </p>
          </div>
        </div>

        {/* Statut global */}
        <div className="flex items-center gap-3 text-[11px]">
          <StatusPill
            on={!!parsedPlan}
            label={parsedPlan ? 'Plan chargé' : 'Aucun plan'}
            color={parsedPlan ? '#10b981' : '#64748b'}
          />
          <StatusPill
            on={models.length > 0}
            label={`${models.length} modèle${models.length > 1 ? 's' : ''}`}
            color="#b38a5a"
          />
          {activeModel && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-atlas-500/15 border border-atlas-500/30 text-[10px] text-atlas-300">
              Actif : <strong>{activeModel.name}</strong>
            </span>
          )}
          {planValidated ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-300 font-semibold">
              <CheckCircle2 size={10} /> VALIDÉ
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-300 font-semibold">
              <Lock size={10} /> NON VERROUILLÉ
            </span>
          )}
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex items-center px-4 border-b border-white/5 bg-surface-1/40 flex-shrink-0">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-[12px] font-medium transition-all border-b-2 ${
                active
                  ? 'text-white border-current'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
              style={{ color: active ? t.color : undefined }}
              title={t.desc}
            >
              <Icon size={14} />
              {t.label}
              {t.id === 'models' && models.length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                  {models.length}
                </span>
              )}
            </button>
          )
        })}

        <div className="flex-1" />

        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pr-2">
          {TABS.find(t => t.id === tab)?.desc}
        </div>
      </nav>

      {/* Guide quand aucun plan */}
      {!parsedPlan && tab !== 'import' && (
        <div className="flex-shrink-0 mx-4 mt-3 px-4 py-2 rounded-lg border border-amber-900/40 bg-amber-950/20 text-[11px] text-amber-200 flex items-center gap-2">
          <AlertCircle size={12} /> Aucun plan importé. Commencez par l'onglet <strong className="ml-1">Import</strong>.
        </div>
      )}

      {/* Contenu onglet */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Suspense fallback={<LoadingBlock label={`Chargement ${TABS.find(t => t.id === tab)?.label}…`} />}>
          {tab === 'import' && (
            <div className="h-full overflow-y-auto">
              <PlanImportsSection
                volumeColor="#b38a5a"
                volumeLabel="ATLAS STUDIO · IMPORT"
                floors={[
                  { id: 'floor-b1',  level: 'B1' as any, order: 0, widthM: 180, heightM: 120, zones: [], transitions: [] },
                  { id: 'floor-rdc', level: 'RDC' as any, order: 1, widthM: 200, heightM: 140, zones: [], transitions: [] },
                  { id: 'floor-r1',  level: 'R+1' as any, order: 2, widthM: 200, heightM: 140, zones: [], transitions: [] },
                ]}
                activeFloorId="floor-rdc"
                onImportComplete={() => {
                  // Après import, basculer automatiquement sur l'éditeur
                  setTab('editor')
                }}
              />
            </div>
          )}
          {tab === 'editor' && <SpaceEditorSection />}
          {tab === 'models' && <PlanModelsLibrary projectId={pid} />}
        </Suspense>
      </div>

      {/* Footer — CTA enregistrer */}
      {tab === 'editor' && parsedPlan && (
        <footer className="flex-shrink-0 px-4 py-2 border-t border-white/10 bg-surface-1/60 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 m-0">
            Une fois vos modifications terminées, enregistrez le plan comme modèle pour qu'il soit
            utilisable dans les volumes.
          </p>
          <button
            onClick={() => setTab('models')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-atlas-500 to-purple-600 text-white hover:opacity-90"
          >
            Enregistrer comme modèle →
          </button>
        </footer>
      )}
    </div>
  )
}

function StatusPill({ on, label, color }: { on: boolean; label: string; color: string }) {
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium"
      style={{
        background: on ? `${color}15` : 'transparent',
        borderColor: on ? `${color}40` : '#334155',
        color: on ? color : '#64748b',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? color : '#64748b' }} />
      {label}
    </span>
  )
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center text-slate-500 text-sm">
      <div className="w-4 h-4 border-2 border-slate-600 border-t-purple-500 rounded-full animate-spin mr-2" />
      {label}
    </div>
  )
}
