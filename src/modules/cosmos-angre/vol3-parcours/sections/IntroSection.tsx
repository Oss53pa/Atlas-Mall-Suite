import React from 'react'
import { Map, Users, Grid3X3, BarChart2, Calendar, Signpost } from 'lucide-react'
import { useContentStore } from '../../shared/store/contentStore'
import EditableText from '../../shared/components/EditableText'

const modules = [
  { id: 'M1', label: 'JOURNEY MAP', icon: Map, color: '#34d399' },
  { id: 'M2', label: '4 PERSONAS', icon: Users, color: '#a77d4c' },
  { id: 'M3', label: 'TOUCHPOINTS', icon: Grid3X3, color: '#f59e0b' },
  { id: 'M4', label: 'KPIS', icon: BarChart2, color: '#ef4444' },
  { id: 'M5', label: "PLAN D'ACTION", icon: Calendar, color: '#06b6d4' },
  { id: 'M6', label: 'SIGNALETIQUE', icon: Signpost, color: '#22c55e' },
]

export default function IntroSection() {
  const subtitle = useContentStore((s) => s.vol3IntroSubtitle)
  const description = useContentStore((s) => s.vol3IntroDescription)
  const setField = useContentStore((s) => s.setField)
  const setContent = useContentStore((s) => s.setContent)
  const content = useContentStore((s) => s.content)

  const parcoursText = content['vol3_parcours_text'] ?? "Le parcours client Cosmos Angre est structure en 7 etapes cles, de l'approche vehicule a la fidelisation via le programme Cosmos Club. Chaque etape est analysee selon 10 couches : physique, digital, emotion visiteur, touchpoints, solution proposee, responsable, priorite, statut, budget et indicateurs."

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <EditableText
          value={subtitle}
          onChange={(v) => setField('vol3IntroSubtitle', v)}
          className="text-[11px] tracking-[0.2em] font-medium mb-2"
          style={{ color: '#34d399' }}
          tag="p"
        />
        <h1 className="text-[28px] font-light text-white mb-3">Introduction</h1>
        <EditableText
          value={description}
          onChange={(v) => setField('vol3IntroDescription', v)}
          className="text-[13px] leading-[1.7]"
          style={{ color: '#4a5568' }}
          tag="p"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {modules.map((m) => {
          const Icon = m.icon
          return (
            <div key={m.id} className="rounded-[10px] p-4 flex items-center gap-3" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${m.color}15` }}>
                <Icon size={18} style={{ color: m.color }} />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider" style={{ color: m.color }}>{m.id}</span>
                <p className="text-[13px] text-white">{m.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-[10px] p-6" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <h3 className="text-sm font-semibold text-white mb-4">Le parcours en 7 etapes</h3>
        <EditableText
          value={parcoursText}
          onChange={(v) => setContent('vol3_parcours_text', v)}
          className="text-[13px] leading-[1.7] mb-6"
          style={{ color: '#94a3b8' }}
          tag="p"
          multiline
        />
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { n: 1, label: 'Approche', dur: '~10 min' },
            { n: 2, label: 'Parking', dur: '~5 min' },
            { n: 3, label: 'Entree', dur: '~3 min' },
            { n: 4, label: 'Hall central', dur: '~15 min' },
            { n: 5, label: 'Shopping', dur: '~45 min' },
            { n: 6, label: 'Restauration', dur: '~40 min' },
            { n: 7, label: 'Fidelisation', dur: 'continu' },
          ].map((step, i, arr) => (
            <React.Fragment key={step.n}>
              <div className="flex-shrink-0 rounded-full px-4 py-2 text-center" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
                <span className="text-[10px] font-bold" style={{ color: '#34d399' }}>{step.n}</span>
                <p className="text-[12px] text-white font-medium">{step.label}</p>
                <p className="text-[10px]" style={{ color: '#4a5568' }}>{step.dur}</p>
              </div>
              {i < arr.length - 1 && <span style={{ color: '#1e2a3a' }}>&rarr;</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
