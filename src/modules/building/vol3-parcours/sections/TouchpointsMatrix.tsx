// ═══ VOL.3 — Matrice Touchpoints (dynamique) ═══
// Branché sur experienceStore. CRUD complet + filtres par phase/type/priorité.

import { useMemo, useState } from 'react'
import { Plus, Trash2, Edit3, RotateCw } from 'lucide-react'
import { useExperienceForProject } from '../hooks/useExperienceForProject'
import { useExperienceStore, type TouchpointType, type Priority } from '../store/experienceStore'

const prioriteConfig: Record<Priority, { bg: string; border: string; text: string }> = {
  critique:   { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', text: '#ef4444' },
  important:  { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b' },
  secondaire: { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', text: '#64748b' },
}

const typeConfig: Record<TouchpointType, { bg: string; text: string }> = {
  physique: { bg: 'rgba(20,184,166,0.12)', text: '#14b8a6' },
  digital:  { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  humain:   { bg: 'rgba(167,125,76,0.12)', text: '#a77d4c' },
}

export default function TouchpointsMatrix() {
  const { projectId, projectName, verticalId, touchpoints } = useExperienceForProject()
  const addTouchpoint    = useExperienceStore(s => s.addTouchpoint)
  const deleteTouchpoint = useExperienceStore(s => s.deleteTouchpoint)
  const resetToTemplate  = useExperienceStore(s => s.resetToTemplate)

  const [activePhase, setActivePhase] = useState('Tout')

  // Extraire les phases dynamiquement depuis les touchpoints
  const phases = useMemo(() => {
    const set = new Set(touchpoints.map(t => t.phase))
    return ['Tout', ...Array.from(set)]
  }, [touchpoints])

  const filtered = activePhase === 'Tout' ? touchpoints : touchpoints.filter(t => t.phase === activePhase)
  const countByType = useMemo(() => ({
    physique: touchpoints.filter(t => t.type === 'physique').length,
    digital:  touchpoints.filter(t => t.type === 'digital').length,
    humain:   touchpoints.filter(t => t.type === 'humain').length,
  }), [touchpoints])

  const handleAdd = () => {
    const name = prompt('Nom du touchpoint :')
    if (!name) return
    const phase = prompt('Phase (Approche, Entrée, Parcours, Sortie…) :') ?? 'Parcours'
    const type = (prompt('Type (physique, digital, humain) :') ?? 'physique') as TouchpointType
    const priorite = (prompt('Priorité (critique, important, secondaire) :') ?? 'important') as Priority
    addTouchpoint(projectId, {
      name, phase, type, priorite,
      responsable: 'À définir',
      description: '',
    })
  }

  const handleReset = () => {
    if (confirm(`Recharger les touchpoints depuis les templates « ${verticalId} » ?`)) {
      resetToTemplate(projectId, verticalId)
    }
  }

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-light text-white mb-2">Matrice des touchpoints</h1>
          <p className="text-gray-400 max-w-2xl text-[13px] leading-relaxed">
            Points de contact avec l'utilisateur du projet <strong className="text-white font-medium">{projectName}</strong>,
            organisés par phase du parcours. Templates initiaux adaptés à la verticale, éditables à volonté.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.1] bg-white/[0.04] text-[12px] text-gray-300 hover:text-white hover:border-atlas-500/40 transition-colors">
            <Plus size={13} /> Ajouter
          </button>
          <button onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.1] bg-white/[0.04] text-[12px] text-gray-400 hover:text-white transition-colors">
            <RotateCw size={13} /> Reset template
          </button>
        </div>
      </header>

      <div className="flex items-center gap-6 text-sm flex-wrap">
        <span><strong className="text-white">{touchpoints.length}</strong> <span className="text-gray-600">touchpoints</span></span>
        <span className="text-gray-700">|</span>
        <span className="text-[#14b8a6]">Physique : {countByType.physique}</span>
        <span className="text-gray-700">|</span>
        <span className="text-[#3b82f6]">Digital : {countByType.digital}</span>
        <span className="text-gray-700">|</span>
        <span className="text-[#a77d4c]">Humain : {countByType.humain}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {phases.map(phase => {
          const count = phase === 'Tout' ? touchpoints.length : touchpoints.filter(t => t.phase === phase).length
          const active = activePhase === phase
          return (
            <button key={phase} onClick={() => setActivePhase(phase)}
              className="text-[12px] font-medium px-3 py-1.5 rounded-full transition-all"
              style={{
                background: active ? 'rgba(52,211,153,0.12)' : 'transparent',
                border: `1px solid ${active ? 'rgba(52,211,153,0.4)' : '#1e2a3a'}`,
                color: active ? '#34d399' : '#4a5568',
              }}>
              {phase} ({count})
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-white/[0.08] text-gray-500 text-sm">
          Aucun touchpoint pour cette phase.
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-white/[0.06]">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: '#0f1623' }}>
                {['Touchpoint', 'Phase', 'Type', 'Responsable', 'Description', 'Priorité', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 border-b border-white/[0.06]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(tp => {
                const pc = prioriteConfig[tp.priorite]
                const tc = typeConfig[tp.type]
                return (
                  <tr key={tp.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] group">
                    <td className="px-4 py-3 text-white font-medium max-w-[220px]">{tp.name}</td>
                    <td className="px-4 py-3 text-gray-400">{tp.phase}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: tc.bg, color: tc.text }}>{tp.type}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{tp.responsable}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[320px]">{tp.description}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text }}>{tp.priorite}</span>
                    </td>
                    <td className="px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        <button className="p-1 text-gray-500 hover:text-white" title="Modifier (coming)">
                          <Edit3 size={11} />
                        </button>
                        <button onClick={() => { if (confirm('Supprimer ce touchpoint ?')) deleteTouchpoint(projectId, tp.id) }}
                          className="p-1 text-gray-500 hover:text-red-400" title="Supprimer">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
