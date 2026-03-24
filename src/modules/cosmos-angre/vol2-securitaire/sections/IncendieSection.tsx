import React, { useState } from 'react'
import { Sparkles, Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

const equipments = [
  { name: 'SSI catégorie A — détection automatique intégrale', description: 'Détecteurs multi-capteurs tous locaux — report centralisé CMSI' },
  { name: 'Désenfumage mécanique', description: 'Mall, parking, food court — ventilateurs extracteurs + amenées d\'air' },
  { name: 'Sprinklers zones à risque + RIA tous les 30m', description: 'Réseau sprinkler sous-sol et food court — RIA DN 25/30 galeries' },
  { name: 'Issues de secours balisées (BAES + blocs autonomes)', description: 'Balisage réglementaire NF C 71-800 — autonomie 1h minimum' },
  { name: 'Exercices d\'évacuation trimestriels', description: 'Simulation avec chronométrage — rapport conformité NF S 61-938' },
]

interface Scenario { id: string; name: string; description: string }
const scenarios: Scenario[] = [
  { id: 'food-court', name: 'Incendie Zone Food Court', description: 'Départ de feu cuisine food court R+2 — évacuation partielle R+2 puis totale' },
  { id: 'total', name: 'Évacuation totale', description: 'Alarme générale — évacuation simultanée des 3 niveaux' },
  { id: 'confinement', name: 'Confinement', description: 'Menace extérieure — confinement zones intérieures, fermeture accès' },
]

interface Exercise { date: string; type: string; result: string; status: 'ok' | 'partiel' | 'echec' }
const exercises: Exercise[] = [
  { date: '15 Jan 2026', type: 'Évacuation totale', result: '2 min 45s — conforme', status: 'ok' },
  { date: '12 Avr 2026', type: 'Incendie food court', result: 'Planifié', status: 'partiel' },
  { date: '10 Juil 2026', type: 'Confinement', result: 'Planifié', status: 'partiel' },
  { date: '08 Oct 2026', type: 'Évacuation totale (pré-ouverture)', result: 'Planifié', status: 'partiel' },
]

type Conformite = 'conforme' | 'non_conforme' | 'a_verifier'
interface ErpCheck { item: string; status: Conformite }
const erpChecks: ErpCheck[] = [
  { item: 'SSI catégorie A installé et opérationnel', status: 'conforme' },
  { item: 'Désenfumage mécanique conforme IT 246', status: 'conforme' },
  { item: 'Issues de secours (2 par compartiment minimum)', status: 'conforme' },
  { item: 'BAES conformes NF C 71-800', status: 'conforme' },
  { item: 'Sprinklers conformes NF EN 12845', status: 'conforme' },
  { item: 'Exercice évacuation réalisé (dernier < 6 mois)', status: 'conforme' },
  { item: 'Plan d\'évacuation affiché chaque niveau', status: 'a_verifier' },
  { item: 'Formation SSIAP agents de sécurité à jour', status: 'conforme' },
  { item: 'Commission de sécurité — avis favorable', status: 'a_verifier' },
  { item: 'Registre de sécurité tenu à jour', status: 'conforme' },
]

const conformiteIcons = {
  conforme: { icon: CheckCircle, color: '#22c55e', label: 'Conforme' },
  non_conforme: { icon: XCircle, color: '#ef4444', label: 'Non conforme' },
  a_verifier: { icon: AlertTriangle, color: '#f59e0b', label: 'À vérifier' },
}

export default function IncendieSection() {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>VOL. 2 — PLAN SÉCURITAIRE</p>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>ZONE 04</span>
          <h1 className="text-[28px] font-light text-white">Sécurité incendie</h1>
        </div>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>Système de sécurité incendie (SSI) conforme aux normes ERP catégorie 1.</p>
      </div>

      {/* Dispositif */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Dispositif</h2>
        {equipments.map((eq) => (
          <div key={eq.name} className="rounded-[10px] p-4 flex items-start gap-3" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
            <div className="mt-0.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: '#ef4444' }} />
            <div>
              <span className="text-[13px] font-medium text-white">{eq.name}</span>
              <p className="text-[12px] mt-1" style={{ color: '#4a5568' }}>{eq.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Simulation */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Simulation évacuation</h2>
        <div className="grid grid-cols-3 gap-3">
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setSelectedScenario(sc.id)}
              className="rounded-[10px] p-4 text-left transition-all"
              style={{
                background: selectedScenario === sc.id ? 'rgba(56,189,248,0.08)' : '#141e2e',
                border: `1px solid ${selectedScenario === sc.id ? 'rgba(56,189,248,0.4)' : '#1e2a3a'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Play size={14} style={{ color: '#38bdf8' }} />
                <span className="text-[13px] font-medium text-white">{sc.name}</span>
              </div>
              <p className="text-[11px]" style={{ color: '#4a5568' }}>{sc.description}</p>
            </button>
          ))}
        </div>
        {selectedScenario && (
          <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: '#38bdf8' }}>
            <Play size={16} /> Lancer simulation
          </button>
        )}
      </div>

      {/* Calendrier exercices */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Calendrier exercices</h2>
        <div className="rounded-[10px] overflow-hidden" style={{ border: '1px solid #1e2a3a' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: '#0f1623' }}>
                {['Date', 'Type', 'Résultat', 'Statut'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#4a5568', borderBottom: '1px solid #1e2a3a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exercises.map((ex, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1e2a3a' }}>
                  <td className="px-4 py-3 text-white">{ex.date}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{ex.type}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{ex.result}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{
                      background: ex.status === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
                      border: `1px solid ${ex.status === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
                      color: ex.status === 'ok' ? '#22c55e' : '#f59e0b',
                    }}>{ex.status === 'ok' ? 'Réalisé' : 'Planifié'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conformité ERP */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Conformité ERP catégorie 1</h2>
        <div className="space-y-2">
          {erpChecks.map((check) => {
            const cfg = conformiteIcons[check.status]
            const Icon = cfg.icon
            return (
              <div key={check.item} className="rounded-[10px] p-3 flex items-center gap-3" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
                <Icon size={16} style={{ color: cfg.color }} />
                <span className="text-[13px] text-white flex-1">{check.item}</span>
                <span className="text-[10px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
