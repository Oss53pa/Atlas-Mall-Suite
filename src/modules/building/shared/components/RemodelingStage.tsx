// ═══ REMODELING STAGE ═══
//
// Phase 2 du workflow projet (après import) :
//   - L'utilisateur voit TOUS les espaces détectés
//   - Il clique sur chacun → SpaceDetailModal pour l'identifier
//   - Barre de progression (X validés / Y total)
//   - Bouton final « Enregistrer comme base de travail » (validatePlan)
//     → déverrouille l'accès aux 4 volumes
//
// Le plan DOIT passer par cette étape avant que les volumes métier ne s'ouvrent.
// L'utilisateur peut revenir ici à tout moment (bouton « Retour à l'édition »
// dans AppLayout) pour modifier la base.

import { useMemo, useState } from 'react'
import {
  CheckCircle2, AlertCircle, Lock, Unlock, Search, Filter,
  Layers, Save, ChevronRight, Eye, EyeOff, Trash2, Sparkles,
  PanelRight, PanelLeftClose, Pencil,
} from 'lucide-react'
import { usePlanEngineStore } from '../stores/planEngineStore'
import { SpaceDetailModal } from './SpaceDetailModal'
import { SPACE_TYPE_META, autoDetectSpaceType } from '../proph3t/libraries/spaceTypeLibrary'
import { PlanCleaningPanel } from './PlanCleaningPanel'
import { PlanDrawEditor } from './PlanDrawEditor'

type FilterKind = 'all' | 'validated' | 'pending' | 'excluded'

export function RemodelingStage() {
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)
  const setParsedPlan = usePlanEngineStore(s => s.setParsedPlan)
  const spaceStates = usePlanEngineStore(s => s.spaceStates)
  const planValidated = usePlanEngineStore(s => s.planValidated)
  const planValidatedAt = usePlanEngineStore(s => s.planValidatedAt)
  const validatePlan = usePlanEngineStore(s => s.validatePlan)
  const invalidatePlan = usePlanEngineStore(s => s.invalidatePlan)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKind>('all')
  const [layersPanelOpen, setLayersPanelOpen] = useState(true)
  const [cleaningOpen, setCleaningOpen] = useState(false)
  const [drawEditorOpen, setDrawEditorOpen] = useState(false)

  const spaces = parsedPlan?.spaces ?? []

  const enriched = useMemo(() => spaces.map(s => {
    const state = spaceStates[s.id]
    const notes = state?.notes ?? ''
    const validated = /"validated"\s*:\s*true/.test(notes)
    const typeKey = (() => {
      const m = notes.match(/"typeKey"\s*:\s*"([^"]+)"/)
      return m ? m[1] : autoDetectSpaceType(s.label, s.type)
    })()
    return {
      space: s,
      label: state?.label || s.label,
      validated,
      typeKey,
      color: state?.color,
    }
  }), [spaces, spaceStates])

  const filtered = useMemo(() => enriched.filter(e => {
    if (filter === 'validated' && !e.validated) return false
    if (filter === 'pending' && e.validated) return false
    if (filter === 'excluded' && e.typeKey !== 'a_exclure') return false
    if (search) {
      const q = search.toLowerCase()
      if (!e.label.toLowerCase().includes(q)) return false
    }
    return true
  }), [enriched, filter, search])

  const stats = useMemo(() => ({
    total: enriched.length,
    validated: enriched.filter(e => e.validated).length,
    pending: enriched.filter(e => !e.validated && e.typeKey !== 'a_exclure').length,
    excluded: enriched.filter(e => e.typeKey === 'a_exclure').length,
  }), [enriched])

  const completionPct = stats.total > 0 ? (stats.validated / stats.total) * 100 : 0
  const canLockBaseline = stats.total > 0 && stats.pending === 0

  const handleBulkValidate = () => {
    const setSpaceState = usePlanEngineStore.getState().setSpaceState
    for (const e of enriched) {
      if (e.validated) continue
      if (e.typeKey === 'a_exclure') continue
      const current = spaceStates[e.space.id]?.notes ?? ''
      // Ajoute validated: true au bloc atlas
      const m = current.match(/```atlas\n([\s\S]*?)\n```/)
      let attrs: Record<string, unknown> = {}
      let freeNote = current
      if (m) {
        try { attrs = JSON.parse(m[1]) } catch { attrs = {} }
        freeNote = current.slice(0, m.index).trim()
      }
      attrs.validated = true
      const nextNotes = `${freeNote}\n\`\`\`atlas\n${JSON.stringify(attrs, null, 2)}\n\`\`\``.trim()
      setSpaceState(e.space.id, { notes: nextNotes })
    }
  }

  // ── Gestion des calques ─────────────────
  const layers = parsedPlan?.layers ?? []
  const entitiesByLayer = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of parsedPlan?.entities ?? []) {
      map.set(e.layer, (map.get(e.layer) ?? 0) + 1)
    }
    return map
  }, [parsedPlan?.entities])

  const wallsByLayer = useMemo(() => {
    const map = new Map<string, number>()
    for (const w of parsedPlan?.wallSegments ?? []) {
      map.set(w.layer, (map.get(w.layer) ?? 0) + 1)
    }
    return map
  }, [parsedPlan?.wallSegments])

  const toggleLayer = (layerName: string) => {
    if (!parsedPlan) return
    const updated = parsedPlan.layers.map(l =>
      l.name === layerName ? { ...l, visible: !l.visible } : l
    )
    setParsedPlan({ ...parsedPlan, layers: updated })
  }

  const deleteLayer = (layerName: string) => {
    if (!parsedPlan) return
    const entityCount = entitiesByLayer.get(layerName) ?? 0
    const wallCount = wallsByLayer.get(layerName) ?? 0
    const total = entityCount + wallCount
    if (!confirm(
      `Supprimer le calque « ${layerName} » ?\n\n` +
      `Seront retirés :\n` +
      `• ${entityCount} entité(s)\n` +
      `• ${wallCount} segment(s) de mur\n` +
      `Total : ${total} élément(s).\n\n` +
      `Cette action est réversible via Cmd/Ctrl+Z pour cette session uniquement.`
    )) return

    const entities = parsedPlan.entities.filter(e => e.layer !== layerName)
    const wallSegments = parsedPlan.wallSegments.filter(w => w.layer !== layerName)
    const dimensions = (parsedPlan.dimensions ?? []).filter(d => d.layer !== layerName)
    const remainingLayers = parsedPlan.layers.filter(l => l.name !== layerName)

    setParsedPlan({
      ...parsedPlan,
      layers: remainingLayers,
      entities,
      wallSegments,
      dimensions,
    })
  }

  const deleteAllInvisible = () => {
    if (!parsedPlan) return
    const invisible = parsedPlan.layers.filter(l => !l.visible).map(l => l.name)
    if (invisible.length === 0) {
      alert('Aucun calque masqué à supprimer.')
      return
    }
    if (!confirm(
      `Supprimer ${invisible.length} calque(s) masqué(s) ?\n\n${invisible.join(', ')}`
    )) return

    const invisibleSet = new Set(invisible)
    setParsedPlan({
      ...parsedPlan,
      layers: parsedPlan.layers.filter(l => !invisibleSet.has(l.name)),
      entities: parsedPlan.entities.filter(e => !invisibleSet.has(e.layer)),
      wallSegments: parsedPlan.wallSegments.filter(w => !invisibleSet.has(w.layer)),
      dimensions: (parsedPlan.dimensions ?? []).filter(d => !invisibleSet.has(d.layer)),
    })
  }

  if (!parsedPlan) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-0">
        <div className="text-center max-w-md p-8">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Aucun plan importé</h2>
          <p className="text-sm text-slate-400">
            Importez d'abord un plan (DXF/DWG/PDF) via l'onglet « Plans importés »
            avant de passer au remodelage.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-surface-0 text-slate-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-indigo-950/40 to-purple-950/30">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] tracking-widest uppercase text-atlas-300 font-bold">
                Phase 2 · Remodelage
              </span>
              {planValidated ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-300 font-semibold">
                  <Lock size={10} /> BASE VERROUILLÉE
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-300 font-semibold">
                  <Unlock size={10} /> ÉDITION EN COURS
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-white m-0">
              Identification des espaces
            </h1>
            <p className="text-[12px] text-slate-400 m-0 mt-1">
              Cliquez chaque espace pour renseigner son identité (type, numéro, catégorie, usage…).
              Une fois tous validés, enregistrez la base pour débloquer les 4 volumes métier.
              {planValidatedAt && (
                <span className="text-emerald-400 ml-2">
                  · Dernière validation : {new Date(planValidatedAt).toLocaleString('fr-FR')}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawEditorOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-atlas-500 hover:bg-atlas-500 text-white"
              title="Dessiner espaces, places parking, flèches…"
            >
              <Pencil size={12} /> Dessiner
            </button>
            {planValidated ? (
              <button
                onClick={() => {
                  if (confirm('Déverrouiller la base de travail ? Les volumes métier seront inaccessibles jusqu\'à la prochaine validation.')) {
                    invalidatePlan()
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Unlock size={12} /> Modifier la base
              </button>
            ) : (
              <button
                onClick={validatePlan}
                disabled={!canLockBaseline}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                title={canLockBaseline ? 'Enregistrer comme base de travail' : `Il reste ${stats.pending} espace(s) à valider`}
              >
                <Save size={14} /> Enregistrer comme base
              </button>
            )}
          </div>
        </div>

        {/* Progression */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>Progression validation</span>
            <span className="tabular-nums">
              {stats.validated} / {stats.total} · {completionPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${completionPct}%`,
                background: completionPct === 100
                  ? 'linear-gradient(90deg, #10b981, #14b8a6)'
                  : 'linear-gradient(90deg, #b38a5a, #b38a5a)',
              }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
          <StatCard label="Total" value={stats.total} color="#64748b" />
          <StatCard label="Validés" value={stats.validated} color="#10b981" />
          <StatCard label="À traiter" value={stats.pending} color="#f59e0b" />
          <StatCard label="Exclus" value={stats.excluded} color="#64748b" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-white/5 bg-surface-1/40 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un espace…"
            className="w-full bg-surface-1 text-white text-[12px] rounded-lg pl-9 pr-3 py-2 border border-white/10 focus:border-atlas-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-surface-1 p-0.5">
          <Filter size={12} className="text-slate-500 ml-2" />
          {(['all', 'pending', 'validated', 'excluded'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                filter === f ? 'bg-atlas-500/30 text-atlas-200' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f === 'all' ? 'Tous' : f === 'pending' ? 'À traiter' : f === 'validated' ? 'Validés' : 'Exclus'}
            </button>
          ))}
        </div>

        {!planValidated && stats.pending > 0 && (
          <button
            onClick={handleBulkValidate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-amber-600/20 border border-amber-500/30 text-amber-200 hover:bg-amber-600/30 ml-auto"
            title="Valider en masse tous les espaces non traités (conserve leur auto-détection)"
          >
            <CheckCircle2 size={12} /> Valider tous auto ({stats.pending})
          </button>
        )}
      </div>

      {/* Zone principale : liste espaces + panneau calques latéral */}
      <div className="flex-1 flex min-h-0">

      {/* Liste d'espaces */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {search ? `Aucun espace ne correspond à « ${search} »` : 'Aucun espace avec ce filtre'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filtered.map(e => {
              const typeMeta = SPACE_TYPE_META[e.typeKey as keyof typeof SPACE_TYPE_META]
              return (
                <button
                  key={e.space.id}
                  onClick={() => setEditingId(e.space.id)}
                  className={`text-left rounded-lg border p-3 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                    e.validated
                      ? 'border-emerald-700/40 bg-emerald-950/20 hover:bg-emerald-950/30'
                      : 'border-white/10 bg-surface-1/40 hover:bg-surface-1/80 hover:border-atlas-500/30'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                      style={{
                        background: `${e.color ?? typeMeta?.color ?? '#b38a5a'}20`,
                        color: e.color ?? typeMeta?.color ?? '#d4b280',
                      }}
                    >
                      {typeMeta?.icon ?? '📐'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-[12px] font-semibold text-white truncate">
                          {e.label || 'Sans nom'}
                        </span>
                        {e.validated && (
                          <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {typeMeta?.label ?? e.space.type} · {e.space.areaSqm.toFixed(0)} m²
                      </div>
                      <code className="text-[9px] text-slate-600 font-mono block mt-0.5">
                        {e.space.id.slice(0, 8)}
                      </code>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 flex-shrink-0 mt-0.5" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Panneau Calques (sidebar droite) */}
      {layersPanelOpen && (
        <aside className="w-72 border-l border-white/10 bg-surface-1/60 flex flex-col flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-atlas-400" />
              <h3 className="text-[12px] font-bold text-white m-0">Calques</h3>
              <span className="text-[10px] text-slate-500">
                {layers.length}
              </span>
            </div>
            <button
              onClick={() => setLayersPanelOpen(false)}
              className="p-1 rounded hover:bg-white/10 text-slate-400"
              title="Masquer le panneau"
            >
              <PanelLeftClose size={12} />
            </button>
          </div>

          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-1.5">
            <button
              onClick={() => setCleaningOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-semibold bg-gradient-to-r from-atlas-500 to-blue-600 text-white hover:opacity-90"
              title="Nettoyage automatique (minimal / standard / complet)"
            >
              <Sparkles size={11} /> Nettoyer
            </button>
            <button
              onClick={deleteAllInvisible}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-semibold bg-red-900/40 border border-red-700/50 text-red-200 hover:bg-red-900/60"
              title="Supprimer définitivement tous les calques masqués"
            >
              <Trash2 size={11} /> Masqués
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {layers.length === 0 && (
              <div className="text-center py-6 text-[11px] text-slate-500">
                Aucun calque
              </div>
            )}
            {layers.map(l => {
              const entities = entitiesByLayer.get(l.name) ?? 0
              const walls = wallsByLayer.get(l.name) ?? 0
              const total = entities + walls
              return (
                <div
                  key={l.name}
                  className={`group flex items-center gap-1.5 px-3 py-1.5 border-b border-white/[0.03] hover:bg-white/5 transition ${
                    l.visible ? '' : 'opacity-50'
                  }`}
                >
                  <button
                    onClick={() => toggleLayer(l.name)}
                    className="p-0.5 text-slate-400 hover:text-white flex-shrink-0"
                    title={l.visible ? 'Masquer' : 'Afficher'}
                  >
                    {l.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <code
                      className="text-[10px] font-mono text-slate-200 truncate block"
                      title={l.name}
                    >
                      {l.name}
                    </code>
                    <div className="text-[9px] text-slate-500">
                      {total} élément{total > 1 ? 's' : ''}
                      {walls > 0 && ` · ${walls} mur${walls > 1 ? 's' : ''}`}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteLayer(l.name)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 flex-shrink-0 transition"
                    title="Supprimer ce calque définitivement"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="px-4 py-2 border-t border-white/10 bg-surface-0/50 text-[9px] text-slate-600">
            <strong className="text-slate-400">Survol d'un calque</strong> : icône 🗑 pour supprimer.
            Clic œil pour masquer. Le nettoyage automatique classe les calques par rôle métier.
          </div>
        </aside>
      )}

      {/* Bouton rouvrir le panneau calques s'il est fermé */}
      {!layersPanelOpen && (
        <button
          onClick={() => setLayersPanelOpen(true)}
          className="absolute top-1/2 right-0 -translate-y-1/2 p-2 rounded-l-lg bg-slate-800 hover:bg-slate-700 border border-r-0 border-white/10 text-slate-400 hover:text-white z-10"
          title="Afficher le panneau Calques"
        >
          <PanelRight size={14} />
        </button>
      )}
      </div>

      {/* Panneau Nettoyage (modal) */}
      {cleaningOpen && parsedPlan && (
        <PlanCleaningPanel
          plan={parsedPlan}
          onClose={() => setCleaningOpen(false)}
          onApply={(cleaned) => setParsedPlan(cleaned)}
        />
      )}

      {/* Éditeur de dessin plein écran */}
      {drawEditorOpen && (
        <PlanDrawEditor onClose={() => setDrawEditorOpen(false)} />
      )}

      {/* Modal édition */}
      {editingId && (() => {
        const sp = spaces.find(s => s.id === editingId)
        if (!sp) return null
        return (
          <SpaceDetailModal
            space={sp}
            onClose={() => setEditingId(null)}
            onValidated={() => setEditingId(null)}
          />
        )
      })()}
    </div>
  )
}

// ─── Helpers ─────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-surface-1/40 px-3 py-2">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-lg font-bold tabular-nums mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

