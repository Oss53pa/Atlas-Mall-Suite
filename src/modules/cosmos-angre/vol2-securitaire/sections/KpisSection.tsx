import { useContentStore } from '../../shared/store/contentStore'
import EditableText, { EditableKpi } from '../../shared/components/EditableText'

type KpiStatus = 'conforme' | 'surveiller' | 'non_conforme'

const statusConfig: Record<KpiStatus, { bg: string; border: string; text: string; label: string }> = {
  conforme: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', text: '#22c55e', label: 'Conforme' },
  surveiller: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b', label: 'A surveiller' },
  non_conforme: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', text: '#ef4444', label: 'Non conforme' },
}

const STATUS_CYCLE: KpiStatus[] = ['conforme', 'surveiller', 'non_conforme']

export default function KpisSection() {
  const kpiGroups = useContentStore((s) => s.vol2KpiGroups)
  const setVol2Kpi = useContentStore((s) => s.setVol2Kpi)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>
          VOL. 2 — PLAN SECURITAIRE
        </p>
        <h1 className="text-[28px] font-light text-white mb-3">KPIs Securite</h1>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>
          Tableau de bord des indicateurs de performance securite — suivi en temps reel et conformite.
        </p>
      </div>

      {kpiGroups.map((group, gi) => (
        <div key={group.title} className="space-y-3">
          <h2 className="text-sm font-semibold text-white">{group.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {group.kpis.map((kpi, ki) => {
              const sc = statusConfig[kpi.status]
              return (
                <div
                  key={`${gi}-${ki}`}
                  className="rounded-[10px] p-4"
                  style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <EditableText
                      value={kpi.label}
                      onChange={(v) => setVol2Kpi(gi, ki, { label: v })}
                      className="text-[13px] font-medium text-white"
                      tag="span"
                    />
                    <button
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}
                      onClick={() => {
                        const nextIdx = (STATUS_CYCLE.indexOf(kpi.status) + 1) % STATUS_CYCLE.length
                        setVol2Kpi(gi, ki, { status: STATUS_CYCLE[nextIdx] })
                      }}
                      title="Cliquer pour changer le statut"
                    >
                      {sc.label}
                    </button>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <EditableKpi
                      value={kpi.valeurActuelle}
                      onChange={(v) => setVol2Kpi(gi, ki, { valeurActuelle: v })}
                      className="text-lg font-semibold"
                      style={{ color: sc.text }}
                    />
                    <span className="text-[11px]" style={{ color: '#4a5568' }}>
                      cible :{' '}
                      <EditableKpi
                        value={kpi.cible}
                        onChange={(v) => setVol2Kpi(gi, ki, { cible: v })}
                        className="inline"
                      />
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]" style={{ color: '#4a5568' }}>
                    <EditableText
                      value={kpi.frequence}
                      onChange={(v) => setVol2Kpi(gi, ki, { frequence: v })}
                      tag="span"
                    />
                    <span>·</span>
                    <EditableText
                      value={kpi.source}
                      onChange={(v) => setVol2Kpi(gi, ki, { source: v })}
                      tag="span"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
