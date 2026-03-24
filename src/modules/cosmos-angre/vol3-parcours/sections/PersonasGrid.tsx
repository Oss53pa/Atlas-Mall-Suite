import React from 'react'

interface PersonaSummary {
  id: string
  initials: string
  name: string
  subtitle: string
  color: string
  tags: string[]
}

const personas: PersonaSummary[] = [
  { id: 'awa_moussa', initials: 'A+M', name: 'Awa & Moussa', subtitle: 'Famille CSP+ · 2 enfants', color: '#34d399', tags: ['Angré 7ème tranche', '2×/semaine', 'Gold'] },
  { id: 'serge', initials: 'S', name: 'Serge', subtitle: 'Jeune pro digital · Riviera', color: '#38bdf8', tags: ['Riviera 3', 'Early adopter', 'Silver'] },
  { id: 'pamela', initials: 'P', name: 'Pamela', subtitle: 'PA · High Net Worth', color: '#8b5cf6', tags: ['Cocody Ambassades', 'Exigeante', 'Platinum'] },
  { id: 'aminata', initials: 'A', name: 'Aminata', subtitle: 'Étudiante · Gen Z · Micro-influenceuse', color: '#ec4899', tags: ['Angré Star 12', 'TikTok', 'Silver'] },
]

interface Props {
  onSelectPersona?: (id: string) => void
}

export default function PersonasGrid({ onSelectPersona }: Props) {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#8b5cf6' }}>VOL. 3 — M2 PERSONAS</p>
        <h1 className="text-[28px] font-light text-white mb-3">4 Personas Cosmos</h1>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>
          Quatre profils types de visiteurs du centre commercial Cosmos Angré — chacun avec ses motivations, frustrations et parcours spécifiques.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {personas.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectPersona?.(p.id)}
            className="rounded-[10px] p-6 text-left transition-all hover:scale-[1.01]"
            style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${p.color}60` }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e2a3a' }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold"
                style={{ background: `${p.color}20`, color: p.color, border: `2px solid ${p.color}40` }}
              >
                {p.initials}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{p.name}</h3>
                <p className="text-[13px]" style={{ color: '#4a5568' }}>{p.subtitle}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: `${p.color}12`, color: p.color, border: `1px solid ${p.color}25` }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
