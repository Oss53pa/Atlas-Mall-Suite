
type KpiStatus = 'atteint' | 'en_cours' | 'non_atteint'

interface Kpi {
  label: string
  cible: string
  frequence: string
  source: string
  status: KpiStatus
  progress?: number
}

interface KpiGroup {
  title: string
  color: string
  kpis: Kpi[]
}

const kpiGroups: KpiGroup[] = [
  {
    title: 'Trafic & Fréquentation',
    color: '#34d399',
    kpis: [
      { label: 'Visiteurs mensuels', cible: '120 000 visiteurs/mois', frequence: 'Mensuel', source: 'Compteurs entrées + WiFi', status: 'atteint', progress: 100 },
      { label: 'Taux re-visite M+1', cible: '> 40%', frequence: 'Mensuel', source: 'WiFi analytics + App', status: 'en_cours', progress: 72 },
      { label: 'Durée moyenne visite', cible: '> 90 min', frequence: 'Hebdo', source: 'WiFi sessions', status: 'atteint', progress: 95 },
      { label: 'Pic affluence samedi', cible: '< 4 500 simultanés', frequence: 'Temps réel', source: 'Capteurs flux', status: 'atteint', progress: 85 },
    ],
  },
  {
    title: 'Satisfaction Client',
    color: '#38bdf8',
    kpis: [
      { label: 'NPS global Cosmos', cible: '> 40 (score -100/+100)', frequence: 'Trimestriel', source: 'Enquête NPS', status: 'en_cours', progress: 78 },
      { label: 'NPS parking', cible: '> 35', frequence: 'Trimestriel', source: 'Enquête parking', status: 'atteint', progress: 90 },
      { label: 'NPS food court', cible: '> 45', frequence: 'Trimestriel', source: 'Enquête F&B', status: 'atteint', progress: 95 },
      { label: 'Avis Google Maps', cible: '> 4.3 ★', frequence: 'Continu', source: 'Google Business', status: 'atteint', progress: 100 },
    ],
  },
  {
    title: 'Cosmos Club — Fidélisation',
    color: '#a77d4c',
    kpis: [
      { label: 'Membres actifs', cible: '12 000 à M+6', frequence: 'Mensuel', source: 'CRM HubSpot', status: 'en_cours', progress: 65 },
      { label: 'Upgrade Silver → Gold', cible: '> 15% à 6 mois', frequence: 'Trimestriel', source: 'CRM', status: 'en_cours', progress: 55 },
      { label: 'Panier membre vs non-membre', cible: '+35% différentiel', frequence: 'Mensuel', source: 'Caisse + CRM', status: 'atteint', progress: 88 },
      { label: 'Churn à 6 mois', cible: '< 25%', frequence: 'Semestriel', source: 'CRM HubSpot', status: 'atteint', progress: 82 },
    ],
  },
  {
    title: 'Performance Commerciale',
    color: '#f59e0b',
    kpis: [
      { label: 'CA enseignes/m²/mois', cible: '> 180k FCFA', frequence: 'Mensuel', source: 'Reporting enseignes', status: 'atteint', progress: 92 },
      { label: 'Taux occupation commerciale', cible: '> 92%', frequence: 'Trimestriel', source: 'Asset Management', status: 'atteint', progress: 97 },
      { label: 'Conversion visite → achat', cible: '> 45%', frequence: 'Mensuel', source: 'Compteurs + caisses', status: 'en_cours', progress: 68 },
      { label: 'CA food court + restaurants', cible: '> 120k/m²', frequence: 'Mensuel', source: 'F&B reporting', status: 'atteint', progress: 90 },
    ],
  },
  {
    title: 'Digital & App Cosmos',
    color: '#ef4444',
    kpis: [
      { label: 'Downloads app', cible: '10 000 en 6 mois', frequence: 'Mensuel', source: 'App Store + Play Store', status: 'en_cours', progress: 45 },
      { label: 'MAU (utilisateurs actifs)', cible: '> 3 500', frequence: 'Mensuel', source: 'Firebase Analytics', status: 'en_cours', progress: 58 },
      { label: 'Abonnés RS cumulés', cible: '15 000 à M+6', frequence: 'Mensuel', source: 'Meta + TikTok', status: 'en_cours', progress: 52 },
      { label: 'Engagement rate RS', cible: '> 4%', frequence: 'Hebdo', source: 'Social analytics', status: 'atteint', progress: 85 },
    ],
  },
]

const statusConfig: Record<KpiStatus, { bg: string; border: string; text: string; label: string }> = {
  atteint: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', text: '#22c55e', label: 'Atteint' },
  en_cours: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b', label: 'En cours' },
  non_atteint: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', text: '#ef4444', label: 'Non atteint' },
}

export default function KpiDashboard() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#ef4444' }}>VOL. 3 — M4 KPIS</p>
        <h1 className="text-[28px] font-light text-white mb-3">KPIs Dashboard · Cosmos Angré</h1>
      </div>

      {kpiGroups.map((group) => (
        <div key={group.title} className="space-y-3">
          <h2 className="text-sm font-semibold" style={{ color: group.color }}>{group.title}</h2>
          <div className="grid grid-cols-2 gap-3">
            {group.kpis.map((kpi) => {
              const sc = statusConfig[kpi.status]
              return (
                <div key={kpi.label} className="rounded-[10px] p-4" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[13px] font-medium text-white">{kpi.label}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2" style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}>{sc.label}</span>
                  </div>
                  <p className="text-lg font-semibold mb-2" style={{ color: group.color }}>{kpi.cible}</p>
                  {kpi.progress !== undefined && (
                    <div className="mb-3">
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e2a3a' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${kpi.progress}%`, background: group.color }} />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-[11px]" style={{ color: '#4a5568' }}>
                    <span>{kpi.frequence}</span>
                    <span>·</span>
                    <span>{kpi.source}</span>
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
