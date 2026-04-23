// ═══ VOL.3 — Détail Persona (dynamique) ═══
// Branché sur experienceStore.

import { ArrowLeft, Edit3, Trash2, Save } from 'lucide-react'
import { useState } from 'react'
import { useExperienceForProject } from '../hooks/useExperienceForProject'
import { useExperienceStore } from '../store/experienceStore'

interface Props {
  /** Soit un id exact du store, soit un slug legacy (awa_moussa/serge/pamela/aminata) mappé par position. */
  personaId?: string
  /** Alternative : index direct 0-based dans la liste du projet. */
  personaIndex?: number
  onBack?: () => void
}

// Mapping slugs legacy (depuis la sidebar hardcodée) vers index dans le store
const LEGACY_SLUG_TO_INDEX: Record<string, number> = {
  awa_moussa: 0, serge: 1, pamela: 2, aminata: 3,
}

export default function PersonaDetail({ personaId, personaIndex, onBack }: Props) {
  const { projectId, personas } = useExperienceForProject()
  const updatePersona = useExperienceStore(s => s.updatePersona)
  const deletePersona = useExperienceStore(s => s.deletePersona)
  const [editing, setEditing] = useState(false)

  const persona = (() => {
    if (personaIndex !== undefined) return personas[personaIndex]
    if (!personaId) return personas[0]
    const byId = personas.find(p => p.id === personaId)
    if (byId) return byId
    // Fallback legacy slug
    const idx = LEGACY_SLUG_TO_INDEX[personaId]
    if (idx !== undefined) return personas[idx]
    return undefined
  })()

  if (!persona) {
    return (
      <div className="p-8 text-center">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 mx-auto">
            <ArrowLeft size={14} /> Retour
          </button>
        )}
        <p className="text-gray-500 text-sm">Aucun persona disponible pour ce projet.</p>
        <p className="text-gray-600 text-[11px] mt-2">Ajoutez des personas depuis la section « Personas » ou relancez le template.</p>
      </div>
    )
  }

  const handleSave = (field: keyof typeof persona, value: string | string[]) => {
    updatePersona(projectId, persona.id, { [field]: value })
  }

  const handleDelete = () => {
    if (confirm(`Supprimer le persona « ${persona.name} » ?`)) {
      deletePersona(projectId, persona.id)
      onBack?.()
    }
  }

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        {onBack ? (
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
            <ArrowLeft size={14} /> Retour aux personas
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button onClick={() => setEditing(!editing)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-[12px] text-gray-300 hover:text-white">
            {editing ? <><Save size={12} /> Terminer</> : <><Edit3 size={12} /> Modifier</>}
          </button>
          <button onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-[12px] text-red-400 hover:bg-red-500/20">
            <Trash2 size={12} /> Supprimer
          </button>
        </div>
      </div>

      <div className="flex items-start gap-6 mb-8">
        <div className="flex-shrink-0 w-20 h-20 rounded-full bg-atlas-500/20 border border-atlas-500/40 flex items-center justify-center text-3xl">
          {persona.avatar ?? '👤'}
        </div>
        <div className="flex-1">
          <InlineField value={persona.name} editing={editing} onSave={(v) => handleSave('name', v)}
            className="text-3xl font-light text-white mb-1" />
          <InlineField value={persona.role} editing={editing} onSave={(v) => handleSave('role', v)}
            className="text-gray-400 text-[14px]" />
          <InlineField value={persona.age} editing={editing} onSave={(v) => handleSave('age', v)}
            className="text-gray-500 text-[12px] mt-1" />
        </div>
      </div>

      <Section title="Description">
        <InlineField value={persona.description} editing={editing} onSave={(v) => handleSave('description', v)}
          multiline className="text-gray-300 text-[14px] leading-relaxed" />
      </Section>

      {persona.contexte && (
        <Section title="Contexte">
          <InlineField value={persona.contexte} editing={editing} onSave={(v) => handleSave('contexte', v)}
            multiline className="text-gray-300 text-[14px]" />
        </Section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <ListSection title="Frustrations" color="#ef4444" items={persona.frustrations} editing={editing}
          onSave={(v) => handleSave('frustrations', v)} />
        <ListSection title="Besoins" color="#10b981" items={persona.besoins} editing={editing}
          onSave={(v) => handleSave('besoins', v)} />
      </div>

      {persona.motivations && persona.motivations.length > 0 && (
        <ListSection title="Motivations" color="#38bdf8" items={persona.motivations} editing={editing}
          onSave={(v) => handleSave('motivations', v)} />
      )}

      <ListSection title="Canaux préférés" color="#a855f7" items={persona.canauxPreferes} editing={editing}
        onSave={(v) => handleSave('canauxPreferes', v)} />

      {persona.parcoursType && (
        <Section title="Parcours type">
          <InlineField value={persona.parcoursType} editing={editing} onSave={(v) => handleSave('parcoursType', v)}
            multiline className="text-gray-300 text-[14px] leading-relaxed italic" />
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl p-5 border border-white/[0.06] mb-4" style={{ background: '#15181d' }}>
      <h2 className="text-[11px] font-semibold text-atlas-400 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </section>
  )
}

function ListSection({ title, color, items, editing, onSave }: {
  title: string; color: string; items: string[]; editing: boolean; onSave: (v: string[]) => void
}) {
  const [draft, setDraft] = useState(items.join('\n'))
  return (
    <section className="rounded-xl p-5 border border-white/[0.06] mb-4" style={{ background: '#15181d' }}>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color }}>{title}</h2>
      {editing ? (
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onSave(draft.split('\n').map(s => s.trim()).filter(Boolean))}
          rows={Math.max(3, items.length + 1)}
          className="w-full bg-transparent border border-white/[0.15] rounded p-2 text-[13px] text-white outline-none focus:border-atlas-500 font-mono"
          placeholder="Un item par ligne" />
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="text-[13px] text-gray-300 flex items-start gap-2">
              <span className="text-[10px] mt-1 flex-shrink-0" style={{ color }}>●</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function InlineField({ value, editing, onSave, className = '', multiline = false }: {
  value: string; editing: boolean; onSave: (v: string) => void; className?: string; multiline?: boolean
}) {
  const [draft, setDraft] = useState(value)
  if (!editing) return <div className={className}>{value}</div>
  return multiline ? (
    <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => onSave(draft)}
      rows={3}
      className={`w-full bg-transparent border border-white/[0.15] rounded p-2 outline-none focus:border-atlas-500 ${className}`} />
  ) : (
    <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => onSave(draft)}
      className={`w-full bg-transparent border border-white/[0.15] rounded px-2 py-1 outline-none focus:border-atlas-500 ${className}`} />
  )
}
