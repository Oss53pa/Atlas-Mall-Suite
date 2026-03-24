import React, { useState } from 'react'

type Priority = 'haute' | 'moyenne'
type Phase = 'Pré-ouverture' | 'Ouverture' | 'Post-ouverture' | 'Croisière'

interface Action {
  id: string
  title: string
  description: string
  priorite: Priority
  phase: Phase
  date: string
  responsable: string
}

const actions: Action[] = [
  { id: 'A01', title: 'Charte signalétique Cosmos complète', description: 'Concevoir la charte graphique de toute la signalétique (intérieure + extérieure + parking + étages). Polices Inter/Cormorant. Couleurs navy/gold/crème.', priorite: 'haute', phase: 'Pré-ouverture', date: 'Juillet 2026', responsable: 'Marketing + Fernand (design)' },
  { id: 'A02', title: 'Installation 12 panneaux + totem + bâche', description: 'Autorisation mairie Cocody, pose 12 panneaux Bd Latrille/Mitterrand, totem lumineux H4m, bâche façade 600m².', priorite: 'haute', phase: 'Pré-ouverture', date: 'Septembre 2026', responsable: 'Operations + Mairie Cocody' },
  { id: 'A03', title: 'App Cosmos Club iOS + Android', description: 'Développement React Native : fidélité, parking GPS indoor, événements, commande food court, réservation restaurant. Intégration Orange Money + Wave.', priorite: 'haute', phase: 'Pré-ouverture', date: 'Août 2026', responsable: 'DSI + Agence mobile' },
  { id: 'A04', title: 'Formation personnel accueil Cosmos', description: 'Former 25 personnes : hôtesses, sécurité, conciergerie, agents parking. Protocole accueil Cosmos, gestion conflits, service Platinum.', priorite: 'haute', phase: 'Pré-ouverture', date: 'Septembre 2026', responsable: 'RH + Cabinet formation' },
  { id: 'A05', title: 'CRM HubSpot + automatisations', description: 'Configuration CRM, 15 workflows automatisés (bienvenue, upgrade, anniversaire, win-back, NPS), segments personas.', priorite: 'haute', phase: 'Pré-ouverture', date: 'Août 2026', responsable: 'CRM Manager + DSI' },
  { id: 'A06', title: 'Système parking ANPR + capteurs IoT', description: 'Installation capteurs 450 places sous-sol + caméras ANPR + bornes paiement (CB, Orange Money, Wave). Test charge.', priorite: 'haute', phase: 'Pré-ouverture', date: 'Septembre 2026', responsable: 'DSI + Intégrateur parking' },
  { id: 'A07', title: 'Activation Cosmos Club J0', description: 'Inscriptions physiques desk + tablettes, activation cartes membres, lancement avantages inauguraux (Gold offert 6 mois aux 1 000 premiers).', priorite: 'haute', phase: 'Ouverture', date: '16 Oct 2026', responsable: 'CRM + Accueil' },
  { id: 'A08', title: 'Protocole accueil J0 Soft Opening', description: '2 500 invités : hôtesses renforcées ×6, signalétique événement, welcome packs, DJ, photographe, sécurité renforcée.', priorite: 'haute', phase: 'Ouverture', date: '16 Oct 2026', responsable: 'Operations + Events' },
  { id: 'A09', title: 'Lancement food court + Le Cosmos', description: 'Ouverture simultanée 12 enseignes food court + terrasse rooftop + restaurant Le Cosmos. Test QR commande J-7.', priorite: 'haute', phase: 'Ouverture', date: '16 Oct 2026', responsable: 'F&B Manager + DSI' },
  { id: 'A10', title: 'Enquête NPS complète M+1', description: 'NPS global + parking + food court + enseignes + accueil. Échantillon 500 visiteurs. Rapport + plan correctif.', priorite: 'moyenne', phase: 'Post-ouverture', date: 'Novembre 2026', responsable: 'Marketing + CRM' },
  { id: 'A11', title: 'Optimisation signalétique & flux M+2', description: 'Analyser heatmaps WiFi, ajuster signalétique étages, ajouter points repos si zones mortes détectées.', priorite: 'moyenne', phase: 'Post-ouverture', date: 'Décembre 2026', responsable: 'Operations + DSI' },
  { id: 'A12', title: 'Programme « Cosmos Vivant » mensuel', description: 'Lancer le calendrier événementiel : 1er vendredi concert, 2ème samedi atelier enfants, 3ème jeudi afterwork, dernier dimanche marché créateurs CI.', priorite: 'moyenne', phase: 'Post-ouverture', date: 'Décembre 2026', responsable: 'Events Manager' },
  { id: 'A13', title: 'Bilan parcours client An 1', description: 'Rapport complet : NPS, KPIs, analytics flux, benchmark Playce/Cap Sud, recommandations, budget ajustements An 2.', priorite: 'haute', phase: 'Croisière', date: 'Octobre 2027', responsable: 'Direction + Marketing + CRM' },
]

const allPhases: Phase[] = ['Pré-ouverture', 'Ouverture', 'Post-ouverture', 'Croisière']
const phaseColors: Record<Phase, string> = { 'Pré-ouverture': '#3b82f6', 'Ouverture': '#22c55e', 'Post-ouverture': '#f59e0b', 'Croisière': '#8b5cf6' }
const prioriteColors: Record<Priority, string> = { haute: '#ef4444', moyenne: '#f59e0b' }

export default function PlanAction() {
  const [activePhase, setActivePhase] = useState<string>('Toutes')

  const filtered = activePhase === 'Toutes' ? actions : actions.filter(a => a.phase === activePhase)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#06b6d4' }}>VOL. 3 — M5 PLAN D'ACTION</p>
        <h1 className="text-[28px] font-light text-white mb-3">Plan d'action · 13 actions · 4 phases</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {['Toutes', ...allPhases].map((phase) => {
          const count = phase === 'Toutes' ? actions.length : actions.filter(a => a.phase === phase).length
          const color = phase === 'Toutes' ? '#34d399' : phaseColors[phase as Phase]
          return (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className="text-[12px] font-medium px-3 py-1.5 rounded-full transition-all"
              style={{
                background: activePhase === phase ? `${color}15` : 'transparent',
                border: `1px solid ${activePhase === phase ? `${color}50` : '#1e2a3a'}`,
                color: activePhase === phase ? color : '#4a5568',
              }}
            >
              {phase} ({count})
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {filtered.map((action) => {
          const pc = phaseColors[action.phase]
          return (
            <div key={action.id} className="rounded-[10px] p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono font-bold" style={{ color: '#34d399' }}>{action.id}</span>
                  <h3 className="text-[14px] font-semibold text-white">{action.title}</h3>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${prioriteColors[action.priorite]}12`, border: `1px solid ${prioriteColors[action.priorite]}30`, color: prioriteColors[action.priorite] }}>{action.priorite}</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${pc}12`, border: `1px solid ${pc}30`, color: pc }}>{action.phase}</span>
                </div>
              </div>
              <p className="text-[12px] leading-[1.7] mb-3" style={{ color: '#94a3b8' }}>{action.description}</p>
              <div className="flex items-center gap-4 text-[11px]" style={{ color: '#4a5568' }}>
                <span>📅 {action.date}</span>
                <span>👤 {action.responsable}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
