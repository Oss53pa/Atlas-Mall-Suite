import { useState } from 'react'
import { Plus, Pencil, User, Accessibility } from 'lucide-react'
import { useVol3Store } from '../store/vol3Store'
import type { VisitorProfile } from '../../shared/proph3t/types'
import PersonaFormModal from '../components/PersonaFormModal'

interface Props {
  onSelectPersona?: (id: string) => void
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const COLORS = ['#34d399', '#38bdf8', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e']
const colorFor = (id: string) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}

export default function PersonasGrid({ onSelectPersona }: Props) {
  const personas = useVol3Store(s => s.visitorProfiles)
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<VisitorProfile | null>(null)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#8b5cf6' }}>VOL. 3 — M2 PERSONAS</p>
          <h1 className="text-[28px] font-light text-white mb-3">Personas</h1>
          <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>
            Profils types de visiteurs du centre commercial — saisissez ceux que vous ciblez.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setFormMode('create') }}
          className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-white transition-colors"
        >
          <Plus size={13} /> Ajouter un persona
        </button>
      </div>

      {personas.length === 0 ? (
        <div
          className="rounded-[10px] p-10 text-center"
          style={{ background: '#141e2e', border: '1px dashed #1e2a3a' }}
        >
          <User size={28} className="mx-auto text-slate-600 mb-3" />
          <p className="text-[13px] text-slate-400 mb-1">Aucun persona enregistré</p>
          <p className="text-[11px] text-slate-600 mb-4">
            Définissez vos profils visiteurs cibles pour alimenter les simulations de parcours.
          </p>
          <button
            onClick={() => { setEditing(null); setFormMode('create') }}
            className="text-[12px] px-3 py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-white transition-colors"
          >
            + Créer le premier persona
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {personas.map((p) => {
            const c = colorFor(p.id)
            return (
              <div
                key={p.id}
                className="rounded-[10px] p-6 transition-all hover:scale-[1.01] relative"
                style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${c}60` }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e2a3a' }}
              >
                <button
                  onClick={() => onSelectPersona?.(p.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold"
                      style={{ background: `${c}20`, color: c, border: `2px solid ${c}40` }}
                    >
                      {initials(p.name)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{p.name}</h3>
                      <p className="text-[12px]" style={{ color: '#4a5568' }}>
                        Vitesse {p.speed} m/s · Dwell ×{p.dwellMultiplier}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.pmrRequired && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>
                        <Accessibility size={10} /> PMR
                      </span>
                    )}
                    {p.attractors.slice(0, 4).map((a) => (
                      <span
                        key={a}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: `${c}12`, color: c, border: `1px solid ${c}25` }}
                      >
                        {a}
                      </span>
                    ))}
                    {p.attractors.length > 4 && (
                      <span className="text-[10px] text-slate-600">
                        +{p.attractors.length - 4}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => { setEditing(p); setFormMode('edit') }}
                  className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                  title="Modifier"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {formMode && (
        <PersonaFormModal
          mode={formMode}
          profile={formMode === 'edit' ? (editing ?? undefined) : undefined}
          onClose={() => { setFormMode(null); setEditing(null) }}
        />
      )}
    </div>
  )
}
