// ═══ SpaceContextMenu — Menu clic-droit sur un espace du plan ═══
//
// Apparaît au curseur quand l'utilisateur fait clic-droit sur un espace
// dans MallMap2D. Propose des actions rapides :
//   • Renommer (prompt inline)
//   • Changer le type (mini picker)
//   • Éditer dans Atlas Studio (navigation avec ?focus=spaceId)
//   • Supprimer (avec confirm)

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil, Tag, ExternalLink, Trash2, X } from 'lucide-react'
import type { DetectedSpace } from '../planReader/planEngineTypes'
import { useEditableSpaceStore } from '../stores/editableSpaceStore'

export interface SpaceContextMenuState {
  space: DetectedSpace
  x: number
  y: number
}

interface Props {
  state: SpaceContextMenuState | null
  onClose: () => void
}

export function SpaceContextMenu({ state, onClose }: Props) {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const ref = useRef<HTMLDivElement>(null)
  const [showTypePicker, setShowTypePicker] = useState(false)

  const editableSpaces = useEditableSpaceStore(s => s.spaces)
  const setSpaces = useEditableSpaceStore(s => s.setSpaces)

  // Ferme au clic hors du menu
  useEffect(() => {
    if (!state) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() })
    return () => document.removeEventListener('mousedown', onDoc)
  }, [state, onClose])

  if (!state) return null
  const { space, x, y } = state

  // Position du menu : évite de sortir de l'écran
  const menuW = 240, menuH = 220
  const px = Math.min(x, window.innerWidth - menuW - 10)
  const py = Math.min(y, window.innerHeight - menuH - 10)

  // Editable space correspondant (s'il existe)
  const editable = editableSpaces.find(es => es.id === space.id)

  const handleRename = () => {
    const current = editable?.name ?? space.label ?? ''
    const newName = prompt(`Renommer l'espace "${space.label}" :`, current)
    if (newName === null || newName.trim() === '') { onClose(); return }
    if (editable) {
      setSpaces(editableSpaces.map(es =>
        es.id === space.id ? { ...es, name: newName.trim() } : es,
      ))
    } else {
      // Crée un editable space partiel basé sur le DetectedSpace
      setSpaces([...editableSpaces, {
        id: space.id,
        name: newName.trim(),
        type: (space.type ?? 'autres') as never,
        polygon: space.polygon.map(p => ({ x: p[0], y: p[1] })),
        floorLevel: 'rdc' as never,
        validated: false,
      }])
    }
    onClose()
  }

  const handleEditInStudio = () => {
    const pid = projectId ?? 'cosmos-angre'
    navigate(`/projects/${pid}/studio?focus=${encodeURIComponent(space.id)}`)
    onClose()
  }

  const handleDelete = () => {
    if (!confirm(`Supprimer "${space.label}" du plan modélisé ?\n(L'espace DXF d'origine reste intact, seul l'override éditable est retiré.)`)) {
      onClose()
      return
    }
    setSpaces(editableSpaces.filter(es => es.id !== space.id))
    onClose()
  }

  const handleChangeType = (newType: string) => {
    if (editable) {
      setSpaces(editableSpaces.map(es =>
        es.id === space.id ? { ...es, type: newType as never } : es,
      ))
    } else {
      setSpaces([...editableSpaces, {
        id: space.id,
        name: space.label || space.id,
        type: newType as never,
        polygon: space.polygon.map(p => ({ x: p[0], y: p[1] })),
        floorLevel: 'rdc' as never,
        validated: false,
      }])
    }
    onClose()
  }

  // Types courants pour quick-pick (les autres dans Atlas Studio)
  const QUICK_TYPES = [
    { code: 'commerce_mode', label: '🛍️ Commerce mode' },
    { code: 'restauration', label: '🍽️ Restauration' },
    { code: 'circulation', label: '🚶 Circulation' },
    { code: 'mail_central', label: '🏛️ Mail central' },
    { code: 'wc', label: '🚻 Sanitaires' },
    { code: 'ascenseur', label: '🛗 Ascenseur' },
    { code: 'escalator', label: '↗️ Escalator' },
    { code: 'parking', label: '🅿️ Parking' },
    { code: 'reserve', label: '📦 Réserve' },
    { code: 'technique', label: '🔧 Local technique' },
  ]

  return (
    <div
      ref={ref}
      className="fixed z-[300] bg-surface-1 border border-amber-500/40 rounded-lg shadow-2xl min-w-[240px]"
      style={{ left: px, top: py }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between bg-amber-950/30">
        <div className="text-[11px] font-bold text-amber-100 truncate flex-1">
          {space.label || space.id}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white ml-2"><X size={12} /></button>
      </div>
      <div className="text-[10px] text-slate-500 px-3 py-1 border-b border-white/5">
        Type : <span className="font-mono text-cyan-300">{String(space.type ?? 'inconnu')}</span> ·
        Aire : <span className="font-mono">{space.areaSqm.toFixed(0)} m²</span>
      </div>

      {!showTypePicker ? (
        <div className="py-1">
          <MenuButton icon={<Pencil size={12} />} label="Renommer" onClick={handleRename} />
          <MenuButton icon={<Tag size={12} />} label="Changer le type" onClick={() => setShowTypePicker(true)} chevron />
          <MenuButton icon={<ExternalLink size={12} />} label="Éditer dans Atlas Studio" onClick={handleEditInStudio} highlight />
          <div className="border-t border-white/10 my-1" />
          <MenuButton icon={<Trash2 size={12} />} label="Supprimer (override)" onClick={handleDelete} danger />
        </div>
      ) : (
        <div className="py-1 max-h-[260px] overflow-y-auto">
          <div className="px-3 py-1 text-[9px] uppercase text-slate-500 tracking-widest flex items-center justify-between">
            <span>Choisir un type</span>
            <button onClick={() => setShowTypePicker(false)} className="text-slate-400 hover:text-white text-[10px]">← retour</button>
          </div>
          {QUICK_TYPES.map(t => (
            <button
              key={t.code}
              onClick={() => handleChangeType(t.code)}
              className="w-full text-left px-3 py-1.5 text-[11px] text-slate-200 hover:bg-amber-900/30 transition flex items-center gap-2"
            >
              <span>{t.label}</span>
            </button>
          ))}
          <div className="border-t border-white/10 my-1" />
          <MenuButton
            icon={<ExternalLink size={11} />}
            label="Plus de types dans Atlas Studio…"
            onClick={handleEditInStudio}
            highlight
          />
        </div>
      )}
    </div>
  )
}

function MenuButton({
  icon, label, onClick, chevron, highlight, danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  chevron?: boolean
  highlight?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 transition ${
        danger
          ? 'text-rose-300 hover:bg-rose-950/40'
          : highlight
            ? 'text-amber-200 hover:bg-amber-950/40 font-semibold'
            : 'text-slate-200 hover:bg-slate-800'
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {chevron && <span className="text-slate-500">▸</span>}
    </button>
  )
}
