// ═══ TOUR EDITOR — Create / edit guided tours ═══
//
// Side panel UI:
//   • List of tours (create / select / delete)
//   • Selected tour: name, description, floor
//   • Step list with drag-reorder (index arrows), per-step edit
//   • "Add step by clicking on plan" mode — parent calls addStepAtPoint()
//
// Usage:
//   <TourEditor
//     onAddStepMode={(active) => setStepPlaceMode(active)}
//     pendingStepFloor={activeFloor}
//   />
//   // When user clicks on plan in step-add mode:
//   tourEditor.addStepAtPoint(x, y)   ← via ref

import { useState, useImperativeHandle, forwardRef } from 'react'
import { Plus, Trash2, Play, ArrowUp, ArrowDown, MapPin, ChevronDown, ChevronRight } from 'lucide-react'
import { useTourStore } from './stores/tourStore'
import type { TourStep } from './stores/tourStore'
import {
  FLOOR_LEVEL_META,
  type FloorLevelKey,
} from '../proph3t/libraries/spaceTypeLibrary'

const FLOOR_OPTIONS: FloorLevelKey[] = ['b2', 'b1', 'rdc', 'r1', 'r2', 'r3', 'terrasse']

// ── Exposed ref API ───────────────────────────────────────────────────────

export interface TourEditorRef {
  /** Call this when the user clicks on the plan in step-add mode. */
  addStepAtPoint: (x: number, y: number) => void
}

// ── Step row ──────────────────────────────────────────────────────────────

function StepRow({
  step, index, total, tourId, onMoveUp, onMoveDown,
}: {
  step: TourStep
  index: number
  total: number
  tourId: string
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const updateStep = useTourStore((s) => s.updateStep)
  const deleteStep = useTourStore((s) => s.deleteStep)
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-white/8 bg-white/3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>
        <span className="flex-1 text-xs text-white/70 truncate">{step.title || '(sans titre)'}</span>
        {/* Move buttons */}
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-0.5 text-white/25 hover:text-white/60 disabled:opacity-15 transition-colors"
        >
          <ArrowUp size={11} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-0.5 text-white/25 hover:text-white/60 disabled:opacity-15 transition-colors"
        >
          <ArrowDown size={11} />
        </button>
        {/* Expand */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-0.5 text-white/30 hover:text-white/60 transition-colors"
        >
          {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
        {/* Delete */}
        <button
          onClick={() => { if (confirm(`Supprimer l'étape "${step.title}" ?`)) deleteStep(tourId, step.id) }}
          className="p-0.5 text-white/20 hover:text-red-400 transition-colors"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Expanded edit form */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/8 pt-2">
          <input
            value={step.title}
            onChange={(e) => updateStep(tourId, step.id, { title: e.target.value })}
            placeholder="Titre de l'étape"
            className="w-full px-2 py-1 rounded bg-white/6 border border-white/10 text-white/80 text-xs placeholder:text-white/25 outline-none focus:border-cyan-500/50"
          />
          <textarea
            value={step.description ?? ''}
            onChange={(e) => updateStep(tourId, step.id, { description: e.target.value })}
            placeholder="Description (optionnelle)"
            rows={2}
            className="w-full px-2 py-1 rounded bg-white/6 border border-white/10 text-white/80 text-xs placeholder:text-white/25 outline-none focus:border-cyan-500/50 resize-none"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[9px] text-white/30 uppercase tracking-wider block mb-1">Durée (s)</label>
              <input
                type="number" min={1} max={120}
                value={step.duration}
                onChange={(e) => updateStep(tourId, step.id, { duration: Math.max(1, Number(e.target.value)) })}
                className="w-full px-2 py-1 rounded bg-white/6 border border-white/10 text-white/80 text-xs outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="flex-1">
              <label className="text-[9px] text-white/30 uppercase tracking-wider block mb-1">Étage</label>
              <select
                value={step.floorLevel}
                onChange={(e) => updateStep(tourId, step.id, { floorLevel: e.target.value as FloorLevelKey })}
                className="w-full px-2 py-1 rounded bg-[#0f172a] border border-white/10 text-white/70 text-xs outline-none focus:border-cyan-500/50"
              >
                {FLOOR_OPTIONS.map((f) => (
                  <option key={f} value={f}>{FLOOR_LEVEL_META[f]?.label ?? f.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
          <input
            value={step.mediaUrl ?? ''}
            onChange={(e) => updateStep(tourId, step.id, { mediaUrl: e.target.value || undefined })}
            placeholder="URL media (image)"
            className="w-full px-2 py-1 rounded bg-white/6 border border-white/10 text-white/80 text-xs placeholder:text-white/25 outline-none focus:border-cyan-500/50"
          />
          <div className="text-[9px] text-white/25 flex items-center gap-1">
            <MapPin size={9} />
            Position : ({step.x.toFixed(1)}m, {step.y.toFixed(1)}m)
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────

interface TourEditorProps {
  /** Notifies parent whether "click on plan to place step" mode is active. */
  onAddStepMode?: (active: boolean) => void
  /** The floor level that will be assigned to newly placed steps. */
  pendingStepFloor?: FloorLevelKey
  /** Called when the tour player should start. */
  onStartTour?: (tourId: string) => void
  className?: string
}

const TourEditor = forwardRef<TourEditorRef, TourEditorProps>(function TourEditor(
  { onAddStepMode, pendingStepFloor = 'rdc', onStartTour, className = '' },
  ref,
) {
  const tours       = useTourStore((s) => s.tours)
  const createTour  = useTourStore((s) => s.createTour)
  const updateTour  = useTourStore((s) => s.updateTour)
  const deleteTour  = useTourStore((s) => s.deleteTour)
  const addStep     = useTourStore((s) => s.addStep)
  const reorder     = useTourStore((s) => s.reorderSteps)
  const startTour   = useTourStore((s) => s.startTour)

  const [selectedId, setSelectedId]       = useState<string | null>(tours[0]?.id ?? null)
  const [addStepMode, setAddStepMode]     = useState(false)
  const [newTourName, setNewTourName]     = useState('')
  const [showCreateForm, setShowCreate]   = useState(false)

  const selected = tours.find((t) => t.id === selectedId)

  // ── Exposed ref ──────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    addStepAtPoint: (x, y) => {
      if (!selectedId || !addStepMode) return
      addStep(selectedId, {
        title: `Étape ${(selected?.steps.length ?? 0) + 1}`,
        x, y,
        floorLevel: pendingStepFloor,
        duration: 5,
      })
      setAddStepMode(false)
      onAddStepMode?.(false)
    },
  }))

  const toggleAddStepMode = () => {
    const next = !addStepMode
    setAddStepMode(next)
    onAddStepMode?.(next)
  }

  const handleCreateTour = () => {
    if (!newTourName.trim()) return
    const id = createTour(newTourName.trim(), pendingStepFloor)
    setSelectedId(id)
    setNewTourName('')
    setShowCreate(false)
  }

  const handleStartTour = (id: string) => {
    startTour(id)
    onStartTour?.(id)
  }

  return (
    <div className={`flex flex-col h-full bg-[#0b1120] text-xs overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
        <h3 className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">Visites guidées</h3>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="w-6 h-6 rounded-md flex items-center justify-center bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="px-3 py-2 border-b border-white/8 bg-cyan-500/5 space-y-2">
          <input
            autoFocus
            value={newTourName}
            onChange={(e) => setNewTourName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTour(); if (e.key === 'Escape') setShowCreate(false) }}
            placeholder="Nom de la visite"
            className="w-full px-2 py-1.5 rounded bg-white/6 border border-cyan-500/30 text-white/80 text-xs placeholder:text-white/30 outline-none"
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleCreateTour}
              disabled={!newTourName.trim()}
              className="flex-1 py-1 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs disabled:opacity-30 hover:bg-cyan-500/30 transition-colors"
            >
              Créer
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewTourName('') }}
              className="px-3 py-1 rounded border border-white/10 text-white/40 text-xs hover:text-white/60 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Tour list */}
      {tours.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-white/20 p-4 text-center">
          <MapPin size={24} strokeWidth={1.2} />
          <p>Aucune visite guidée</p>
          <p className="text-[10px]">Créez une visite pour positionner des étapes sur le plan.</p>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Tour selector chips */}
        {tours.length > 0 && (
          <div className="flex gap-1.5 flex-wrap px-3 py-2 border-b border-white/8">
            {tours.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={[
                  'px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all truncate max-w-[120px]',
                  selectedId === t.id
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'border-white/10 text-white/40 hover:text-white/60 hover:border-white/20',
                ].join(' ')}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        {/* Selected tour detail */}
        {selected && (
          <div className="flex-1 overflow-y-auto">
            {/* Tour meta */}
            <div className="px-3 pt-2 pb-2 space-y-1.5 border-b border-white/8">
              <input
                value={selected.name}
                onChange={(e) => updateTour(selected.id, { name: e.target.value })}
                className="w-full px-2 py-1 rounded bg-white/5 border border-white/8 text-white/80 text-xs outline-none focus:border-cyan-500/40"
              />
              <input
                value={selected.description ?? ''}
                onChange={(e) => updateTour(selected.id, { description: e.target.value || undefined })}
                placeholder="Description de la visite (optionnel)"
                className="w-full px-2 py-1 rounded bg-white/5 border border-white/8 text-white/50 text-xs outline-none focus:border-cyan-500/40 placeholder:text-white/20"
              />
              {/* Actions */}
              <div className="flex gap-1.5 pt-0.5">
                <button
                  onClick={toggleAddStepMode}
                  className={[
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    addStepMode
                      ? 'bg-cyan-500/25 border-cyan-500/60 text-cyan-300'
                      : 'border-white/15 text-white/50 hover:border-white/30 hover:text-white/70',
                  ].join(' ')}
                >
                  <MapPin size={11} />
                  {addStepMode ? 'Cliquez sur le plan…' : 'Placer étape'}
                </button>
                <button
                  onClick={() => handleStartTour(selected.id)}
                  disabled={!selected.steps.length}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-green-500/40 bg-green-500/10 text-green-300 text-xs font-medium hover:bg-green-500/20 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                >
                  <Play size={11} /> Lancer
                </button>
                <button
                  onClick={() => { if (confirm(`Supprimer "${selected.name}" ?`)) { deleteTour(selected.id); setSelectedId(tours.find(t => t.id !== selected.id)?.id ?? null) } }}
                  className="p-1.5 rounded-lg border border-white/10 text-white/25 hover:text-red-400 hover:border-red-500/30 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Steps */}
            <div className="px-3 py-2 space-y-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-white/30">
                  {selected.steps.length} étape{selected.steps.length !== 1 ? 's' : ''}
                </span>
              </div>
              {selected.steps.length === 0 && (
                <p className="text-white/25 text-[11px] text-center py-3">
                  Aucune étape — cliquez "Placer étape" puis cliquez sur le plan.
                </p>
              )}
              {[...selected.steps]
                .sort((a, b) => a.order - b.order)
                .map((step, i) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    index={i}
                    total={selected.steps.length}
                    tourId={selected.id}
                    onMoveUp={() => reorder(selected.id, i, i - 1)}
                    onMoveDown={() => reorder(selected.id, i, i + 1)}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

export default TourEditor
