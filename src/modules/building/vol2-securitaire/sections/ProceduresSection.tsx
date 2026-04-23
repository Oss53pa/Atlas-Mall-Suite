import { useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { useSecurityConfigForProject } from '../hooks/useSecurityConfigForProject'

const certifColors = {
  valide: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', text: '#22c55e' },
  a_renouveler: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b' },
  expire: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', text: '#ef4444' },
}

const certifLabels = { valide: 'Valide', a_renouveler: '< 3 mois', expire: 'Expiré' }

export default function ProceduresSection() {
  const [openProc, setOpenProc] = useState<string | null>(null)
  const { procedures, securityAgents: agents } = useSecurityConfigForProject()

  const enseignesFormees = 78
  const totalEnseignes = 95

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>VOL. 2 — PLAN SÉCURITAIRE</p>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>ZONE 05</span>
          <h1 className="text-[28px] font-light text-white">Procédures & formation</h1>
        </div>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>Protocoles opérationnels et programme de formation continue.</p>
      </div>

      {/* Fiches procédures */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Procédures opérationnelles</h2>
        {procedures.map((proc) => (
          <div key={proc.id}>
            <button
              onClick={() => setOpenProc(openProc === proc.id ? null : proc.id)}
              className="w-full rounded-[10px] p-4 flex items-center gap-3 text-left transition-all"
              style={{
                background: openProc === proc.id ? 'rgba(56,189,248,0.05)' : '#141e2e',
                border: `1px solid ${openProc === proc.id ? 'rgba(56,189,248,0.3)' : '#1e2a3a'}`,
              }}
            >
              <ClipboardList size={16} style={{ color: '#38bdf8' }} />
              <span className="text-[13px] font-medium text-white flex-1">{proc.title}</span>
              <span className="text-[11px]" style={{ color: '#4a5568' }}>{openProc === proc.id ? '▲' : '▼'}</span>
            </button>
            {openProc === proc.id && (
              <div className="mt-1 rounded-[10px] p-5" style={{ background: '#0f1623', border: '1px solid #1e2a3a' }}>
                <pre className="text-[13px] leading-[1.8] whitespace-pre-wrap font-sans" style={{ color: '#94a3b8' }}>{proc.content}</pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Formation SSIAP */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Formation SSIAP — Personnel</h2>
        <div className="rounded-[10px] overflow-hidden" style={{ border: '1px solid #1e2a3a' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: '#0f1623' }}>
                {['Nom', 'Poste', 'SSIAP', 'Date certification', 'Renouvellement', 'Statut'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#4a5568', borderBottom: '1px solid #1e2a3a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((ag) => {
                const sc = certifColors[ag.status]
                return (
                  <tr key={ag.nom} style={{ borderBottom: '1px solid #1e2a3a' }} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white font-medium">{ag.nom}</td>
                    <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{ag.poste}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: '#38bdf8' }}>{ag.ssiap}</td>
                    <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{ag.dateCertif}</td>
                    <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{ag.renouvellement}</td>
                    <td className="px-4 py-3"><span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}>{certifLabels[ag.status]}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sensibilisation commerçants */}
      <div className="rounded-[10px] p-6" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <h2 className="text-sm font-semibold text-white mb-4">Sensibilisation commerçants</h2>
        <div className="flex items-center gap-6">
          <div>
            <span className="text-3xl font-bold" style={{ color: '#38bdf8' }}>{Math.round((enseignesFormees / totalEnseignes) * 100)}%</span>
            <p className="text-[12px] mt-1" style={{ color: '#4a5568' }}>enseignes formées ({enseignesFormees}/{totalEnseignes})</p>
          </div>
          <div className="flex-1">
            <div className="h-3 rounded-full overflow-hidden" style={{ background: '#1e2a3a' }}>
              <div className="h-full rounded-full" style={{ width: `${(enseignesFormees / totalEnseignes) * 100}%`, background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)' }} />
            </div>
          </div>
        </div>
        <p className="text-[12px] mt-3" style={{ color: '#4a5568' }}>Kit sécurité envoyé : consignes évacuation, numéros d'urgence, emplacement extincteurs et issues de secours.</p>
      </div>
    </div>
  )
}
