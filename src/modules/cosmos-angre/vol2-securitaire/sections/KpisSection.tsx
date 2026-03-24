import React, { useState } from 'react'

type KpiStatus = 'conforme' | 'surveiller' | 'non_conforme'

interface Kpi {
  label: string
  cible: string
  valeurActuelle: string
  frequence: string
  source: string
  status: KpiStatus
}

interface KpiGroup {
  title: string
  kpis: Kpi[]
}

const kpiGroups: KpiGroup[] = [
  {
    title: 'Trafic & Accès',
    kpis: [
      { label: 'Visiteurs journaliers', cible: '> 4 000/j', valeurActuelle: '4 250/j', frequence: 'Quotidien', source: 'Compteurs flux', status: 'conforme' },
      { label: 'Délai moyen contrôle accès', cible: '< 8 sec', valeurActuelle: '6.2 sec', frequence: 'Temps réel', source: 'Badges RFID', status: 'conforme' },
      { label: 'Incidents signalés / mois', cible: '< 5', valeurActuelle: '3', frequence: 'Mensuel', source: 'Journal PC sécurité', status: 'conforme' },
      { label: 'Taux résolution < 15 min', cible: '> 90%', valeurActuelle: '87%', frequence: 'Mensuel', source: 'Journal interventions', status: 'surveiller' },
    ],
  },
  {
    title: 'Vidéosurveillance',
    kpis: [
      { label: 'Couverture zones communes', cible: '100%', valeurActuelle: '96%', frequence: 'Hebdomadaire', source: 'Audit caméras', status: 'surveiller' },
      { label: 'Disponibilité système CCTV', cible: '> 99.5%', valeurActuelle: '99.7%', frequence: 'Temps réel', source: 'DSI monitoring', status: 'conforme' },
      { label: 'Durée stockage images', cible: '30 jours', valeurActuelle: '30 jours', frequence: 'Continu', source: 'Serveur NVR', status: 'conforme' },
      { label: 'Temps réponse alarme IA', cible: '< 3 sec', valeurActuelle: '2.1 sec', frequence: 'Temps réel', source: 'Analyse vidéo', status: 'conforme' },
    ],
  },
  {
    title: 'Sécurité incendie',
    kpis: [
      { label: 'Délai évacuation simulé', cible: '< 3 min', valeurActuelle: '2 min 45s', frequence: 'Trimestriel', source: 'Exercices trimestriels', status: 'conforme' },
      { label: 'Disponibilité sprinklers', cible: '100%', valeurActuelle: '100%', frequence: 'Mensuel', source: 'Maintenance SSI', status: 'conforme' },
      { label: 'Tests détecteurs fumée', cible: 'Trimestriel', valeurActuelle: 'Dernier: Jan 2026', frequence: 'Trimestriel', source: 'Prestataire SSI', status: 'conforme' },
    ],
  },
]

const statusConfig: Record<KpiStatus, { bg: string; border: string; text: string; label: string }> = {
  conforme: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', text: '#22c55e', label: 'Conforme' },
  surveiller: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b', label: 'À surveiller' },
  non_conforme: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', text: '#ef4444', label: 'Non conforme' },
}

export default function KpisSection() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>
          VOL. 2 — PLAN SÉCURITAIRE
        </p>
        <h1 className="text-[28px] font-light text-white mb-3">KPIs Sécurité</h1>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>
          Tableau de bord des indicateurs de performance sécurité — suivi en temps réel et conformité.
        </p>
      </div>

      {kpiGroups.map((group) => (
        <div key={group.title} className="space-y-3">
          <h2 className="text-sm font-semibold text-white">{group.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {group.kpis.map((kpi) => {
              const sc = statusConfig[kpi.status]
              return (
                <div
                  key={kpi.label}
                  className="rounded-[10px] p-4"
                  style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[13px] font-medium text-white">{kpi.label}</span>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}
                    >
                      {sc.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-lg font-semibold" style={{ color: sc.text }}>{kpi.valeurActuelle}</span>
                    <span className="text-[11px]" style={{ color: '#4a5568' }}>cible : {kpi.cible}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]" style={{ color: '#4a5568' }}>
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
