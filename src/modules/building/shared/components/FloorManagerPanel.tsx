// ═══ FLOOR MANAGER PANEL — Gestion des étages détectés + bibliothèque ═══
// Affiche la liste des étages du plan actif avec actions :
//  - Supprimer cet étage (il disparaît du plan courant)
//  - Sauvegarder cet étage seul dans la bibliothèque
//  - Sauvegarder le plan complet dans la bibliothèque
//  - Ouvrir la bibliothèque (liste des plans sauvegardés)

import React, { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Layers, Trash2, Save, BookOpen, X, Download, Upload, RotateCcw } from 'lucide-react'
import { usePlanEngineStore } from '../stores/planEngineStore'
import {
  savePlan, listPlans, loadPlan, deletePlan, extractFloor, removeFloorFromPlan,
  exportPlanJson, importPlanJson, type SavedPlanRecord,
} from '../stores/plansLibraryStore'

export function FloorManagerPanel() {
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)
  const setParsedPlan = usePlanEngineStore(s => s.setParsedPlan)
  const [open, setOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [saveModal, setSaveModal] = useState<{ kind: 'full' | 'floor-extract'; floorId?: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const floors = parsedPlan?.detectedFloors ?? []

  const removeFloor = useCallback((floorId: string) => {
    if (!parsedPlan) return
    const floor = floors.find(f => f.id === floorId)
    if (!floor) return
    if (!confirm(`Supprimer l'étage "${floor.label}" du plan courant ?\n\nCet étage sera retiré de l'affichage. Utilisez d'abord "Sauvegarder" si vous voulez le conserver.`)) return
    const newPlan = removeFloorFromPlan(parsedPlan, floorId)
    setParsedPlan(newPlan)
  }, [parsedPlan, floors, setParsedPlan])

  if (!parsedPlan) return null

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-20 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-1/90 border border-white/[0.08] text-[10px] text-slate-300 hover:bg-slate-800 shadow-lg"
        title="Gestion des étages et bibliothèque de plans"
      >
        <Layers size={12} />
        Étages ({floors.length})
      </button>

      {/* Panel */}
      {open && (
        <aside className="fixed top-32 left-3 z-30 w-80 rounded-xl bg-surface-0/95 border border-white/[0.08] shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-surface-1/50">
            <div className="flex items-center gap-2">
              <Layers size={12} className="text-cyan-400" />
              <span className="text-[12px] font-semibold text-white">Étages détectés</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setLibraryOpen(true)}
                className="p-1 text-slate-400 hover:text-white"
                title="Ouvrir la bibliothèque de plans"
              >
                <BookOpen size={12} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto p-2 space-y-1.5">
            {floors.length === 0 ? (
              <div className="text-center py-4 text-[11px] text-slate-500">
                Un seul étage détecté
              </div>
            ) : (
              floors.map(f => (
                <div key={f.id} className="rounded-lg border border-white/[0.05] bg-surface-1/40 p-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <div className="text-[11px] font-semibold text-white">{f.label}</div>
                      <div className="text-[9px] text-slate-500">
                        {f.bounds.width.toFixed(0)}×{f.bounds.height.toFixed(0)} m · {f.entityCount} entités
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSaveModal({ kind: 'floor-extract', floorId: f.id })}
                        className="p-1 rounded bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/30"
                        title="Sauvegarder cet étage dans la bibliothèque"
                      >
                        <Save size={11} />
                      </button>
                      <button
                        onClick={() => removeFloor(f.id)}
                        className="p-1 rounded bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30"
                        title="Supprimer cet étage du plan courant"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer actions */}
          <div className="border-t border-white/[0.06] px-2 py-2 flex gap-1.5">
            <button
              onClick={() => setSaveModal({ kind: 'full' })}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30"
            >
              <Save size={11} />
              Sauver plan complet
            </button>
            <button
              onClick={() => setLibraryOpen(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium bg-atlas-600/20 border border-atlas-500/40 text-atlas-300 hover:bg-atlas-600/30"
            >
              <BookOpen size={11} />
              Bibliothèque
            </button>
          </div>
        </aside>
      )}

      {/* Modal sauvegarde */}
      {saveModal && parsedPlan && (
        <SavePlanModal
          kind={saveModal.kind}
          floorId={saveModal.floorId}
          parsedPlan={parsedPlan}
          saving={saving}
          onSave={async (meta) => {
            setSaving(true)
            try {
              const id = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
              if (saveModal.kind === 'full') {
                await savePlan({
                  id,
                  name: meta.name,
                  description: meta.description,
                  tags: meta.tags,
                  kind: 'full',
                  parsedPlan,
                })
              } else if (saveModal.floorId) {
                const extracted = extractFloor(parsedPlan, saveModal.floorId)
                if (!extracted) { alert('Extraction échouée'); return }
                const floor = floors.find(f => f.id === saveModal.floorId)
                await savePlan({
                  id,
                  name: meta.name,
                  description: meta.description,
                  tags: meta.tags,
                  kind: 'floor-extract',
                  sourceFloorId: saveModal.floorId,
                  sourceFloorBounds: floor?.bounds,
                  parsedPlan: extracted,
                })
              }
              setSaveModal(null)
              alert(`Plan "${meta.name}" sauvegardé dans la bibliothèque.`)
            } finally {
              setSaving(false)
            }
          }}
          onCancel={() => setSaveModal(null)}
        />
      )}

      {/* Bibliothèque */}
      {libraryOpen && (
        <LibraryModal
          onClose={() => setLibraryOpen(false)}
          onLoad={(plan) => {
            setParsedPlan(plan.parsedPlan)
            setLibraryOpen(false)
          }}
        />
      )}
    </>
  )
}

// ─── Modal Save ─────────────────────────────────────────────

function SavePlanModal({ kind, floorId, saving, onSave, onCancel }: {
  kind: 'full' | 'floor-extract'
  floorId?: string
  parsedPlan: unknown
  saving: boolean
  onSave: (meta: { name: string; description?: string; tags?: string[] }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(kind === 'floor-extract' ? `Étage ${floorId ?? ''}` : 'Plan complet')
  const [description, setDescription] = useState('')
  const [tagsText, setTagsText] = useState('')

  return createPortal(
    <div
      className="fixed inset-0 bg-surface-0/80 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="w-full max-w-md rounded-xl bg-surface-0 border border-cyan-500/40 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <h3 className="text-[13px] font-bold text-white">
            {kind === 'full' ? 'Sauvegarder le plan complet' : `Sauvegarder l'étage ${floorId ?? ''}`}
          </h3>
          <button onClick={onCancel} className="p-1 text-slate-400 hover:text-white"><X size={14} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Nom</label>
            <input
              autoFocus
              value={name} onChange={e => setName(e.target.value)}
              className="w-full text-[12px] px-2.5 py-1.5 rounded bg-surface-1 border border-white/[0.08] text-white outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Description (optionnel)</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full text-[11px] px-2.5 py-1.5 rounded bg-surface-1 border border-white/[0.08] text-white outline-none focus:border-cyan-500 resize-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Tags (séparés par virgule)</label>
            <input
              value={tagsText} onChange={e => setTagsText(e.target.value)}
              placeholder="ex: rdc, parking, cosmos"
              className="w-full text-[11px] px-2.5 py-1.5 rounded bg-surface-1 border border-white/[0.08] text-white outline-none focus:border-cyan-500"
            />
          </div>
        </div>
        <div className="px-4 py-3 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onCancel}
            className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-[11px]">
            Annuler
          </button>
          <button
            onClick={() => onSave({
              name: name.trim() || 'Sans nom',
              description: description.trim() || undefined,
              tags: tagsText.split(',').map(t => t.trim()).filter(Boolean),
            })}
            disabled={saving || !name.trim()}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-cyan-600 text-white text-[11px] font-medium disabled:opacity-40"
          >
            <Save size={12} /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Modal Bibliothèque ─────────────────────────────────────

function LibraryModal({ onClose, onLoad }: {
  onClose: () => void
  onLoad: (plan: SavedPlanRecord) => void
}) {
  const [plans, setPlans] = useState<SavedPlanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setPlans(await listPlans()) } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { void refresh() }, [refresh])

  const filtered = plans.filter(p => {
    if (!query) return true
    const q = query.toLowerCase()
    return p.name.toLowerCase().includes(q)
      || (p.description ?? '').toLowerCase().includes(q)
      || (p.tags ?? []).some(t => t.toLowerCase().includes(q))
  })

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer "${name}" de la bibliothèque ?`)) return
    await deletePlan(id)
    await refresh()
  }

  const handleExport = async (id: string, name: string) => {
    const json = await exportPlanJson(id)
    if (!json) return
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.atlasplan.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleImport = async (file: File) => {
    setImporting(true)
    try {
      const text = await file.text()
      await importPlanJson(text)
      await refresh()
    } catch (err) {
      alert(`Import échoué : ${err instanceof Error ? err.message : String(err)}`)
    } finally { setImporting(false) }
  }

  const handleLoad = async (id: string) => {
    const plan = await loadPlan(id)
    if (plan) onLoad(plan)
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-surface-0/85 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-4xl h-[80vh] rounded-xl bg-surface-0 border border-atlas-500/40 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-gradient-to-r from-purple-950/40 to-surface-0">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-atlas-300" />
            <h3 className="text-[14px] font-bold text-white">Bibliothèque de plans</h3>
            <span className="text-[10px] text-slate-500">{plans.length} plan(s)</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white"><X size={16} /></button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-white/[0.06] bg-surface-1/40 flex items-center gap-2">
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher (nom, description, tags)…"
            className="flex-1 text-[11px] px-2.5 py-1.5 rounded bg-surface-1 border border-white/[0.06] text-white outline-none focus:border-atlas-500"
          />
          <input
            ref={fileInputRef}
            type="file" accept=".json,.atlasplan.json" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleImport(f)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-medium bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-40"
          >
            <Upload size={11} /> {importing ? 'Import…' : 'Importer JSON'}
          </button>
          <button
            onClick={refresh}
            className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white"
          >
            <RotateCcw size={11} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-[11px]">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <BookOpen size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-[12px]">{query ? 'Aucun résultat' : 'Aucun plan sauvegardé'}</p>
              <p className="text-[10px] mt-1">Sauvegardez votre premier plan depuis le panneau "Étages"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filtered.map(p => (
                <div key={p.id} className="rounded-lg border border-white/[0.06] bg-surface-1/40 p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-white truncate">{p.name}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        {p.kind === 'full' ? 'Plan complet' : `Étage ${p.sourceFloorId ?? ''}`}
                        · {(p.parsedPlan.spaces?.length ?? 0)} zones
                        · {new Date(p.savedAt).toLocaleDateString('fr-FR')}
                      </div>
                      {p.description && (
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                      )}
                      {p.tags && p.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.tags.map(t => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={() => handleLoad(p.id)}
                      className="flex-1 text-[10px] px-2 py-1 rounded bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/30">
                      Charger
                    </button>
                    <button onClick={() => handleExport(p.id, p.name)}
                      className="text-[10px] p-1 rounded bg-slate-800 border border-white/[0.06] text-slate-400 hover:text-white"
                      title="Exporter JSON">
                      <Download size={10} />
                    </button>
                    <button onClick={() => handleDelete(p.id, p.name)}
                      className="text-[10px] p-1 rounded bg-red-900/30 border border-red-500/40 text-red-300 hover:bg-red-900/50"
                      title="Supprimer">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/[0.06] text-[9px] text-slate-500">
          Les plans sont stockés localement (IndexedDB) · Import/export JSON pour partage inter-machines
        </div>
      </div>
    </div>,
    document.body,
  )
}
