import { useState } from 'react'

type Priority = 'critique' | 'important' | 'secondaire'
type TPType = 'physique' | 'digital' | 'humain'

interface Touchpoint {
  id: number
  name: string
  phase: string
  type: TPType
  responsable: string
  description: string
  priorite: Priority
}

const touchpoints: Touchpoint[] = [
  { id: 1, name: 'Signalétique directionnelle 12 panneaux', phase: 'Approche', type: 'physique', responsable: 'Operations + Mairie Cocody', description: '12 panneaux Bd Latrille, Bd Mitterrand, carrefours Angré. Éclairage solaire nocturne.', priorite: 'critique' },
  { id: 2, name: 'Fiche Google Maps + Waze', phase: 'Approche', type: 'digital', responsable: 'Marketing digital', description: 'Fiche vérifiée, photos HD façade + intérieur, horaires, FAQ, avis > 4.3★.', priorite: 'critique' },
  { id: 3, name: 'Système guidage parking ANPR', phase: 'Parking', type: 'physique', responsable: 'Operations + DSI', description: 'Capteurs IoT + compteurs LED + zones A-B-C-D + ANPR reconnaissance plaques.', priorite: 'critique' },
  { id: 4, name: 'App Cosmos — parking & paiement', phase: 'Parking', type: 'digital', responsable: 'DSI + CRM', description: 'Localisation véhicule GPS indoor, paiement NFC/Orange Money/Wave, réservation Platinum.', priorite: 'important' },
  { id: 5, name: 'Accueil hôtesses bilingues', phase: 'Entrée', type: 'humain', responsable: 'RH + Formation', description: '2 hôtesses FR/EN desk principal, protocole accueil standardisé Cosmos, welcome pack 1ère visite.', priorite: 'critique' },
  { id: 6, name: 'Bornes wayfinding tactiles 55"', phase: 'Entrée', type: 'digital', responsable: 'DSI', description: '4 bornes plan interactif, recherche boutique/produit, itinéraire intérieur, multilingue FR/EN.', priorite: 'important' },
  { id: 7, name: 'Parfum signature Cosmos', phase: 'Entrée', type: 'physique', responsable: 'Operations', description: 'Diffuseur automatisé, senteur boisée-vanillée exclusive, identité olfactive The Mall.', priorite: 'secondaire' },
  { id: 8, name: 'Atrium + espace événementiel 120m²', phase: 'Hall central', type: 'physique', responsable: 'Events Manager', description: 'Scène modulable, son Bose, éclairage scénographique, mobilier événementiel. Location B2B possible.', priorite: 'important' },
  { id: 9, name: 'WiFi haute densité Cosmos', phase: 'Hall central', type: 'digital', responsable: 'DSI', description: 'WiFi gratuit 200+ connexions, portail captif inscription Cosmos Club, débit garanti 50 Mbps.', priorite: 'critique' },
  { id: 10, name: 'Vitrines charte Cosmos', phase: 'Shopping', type: 'physique', responsable: 'Tenant Coordination', description: 'Charte vitrines standardisée : éclairage 4000K, dimensions, matériaux. Rotation saisonnière obligatoire.', priorite: 'important' },
  { id: 11, name: 'Points de repos design 60m', phase: 'Shopping', type: 'physique', responsable: 'Operations + Design', description: 'Banquettes gold/navy tous les 60m, plantes, prises USB, éclairage doux.', priorite: 'important' },
  { id: 12, name: 'Food court 12 enseignes R+2', phase: 'Restauration', type: 'physique', responsable: 'F&B Manager', description: '12 enseignes (local + international), 400 places, design unifié, terrasse rooftop 80 places.', priorite: 'critique' },
  { id: 13, name: 'QR commande + paiement mobile', phase: 'Restauration', type: 'digital', responsable: 'DSI + F&B', description: 'QR code table, carte digitale, paiement Orange Money/Wave/CB, file virtuelle notification.', priorite: 'important' },
  { id: 14, name: 'Desk Cosmos Club + conciergerie', phase: 'Fidélisation', type: 'humain', responsable: 'CRM Manager', description: 'Inscription, upgrade, réclamations, avantages. Conciergerie Platinum : voiturier, portage, réservations.', priorite: 'critique' },
  { id: 15, name: 'App Cosmos Club native', phase: 'Fidélisation', type: 'digital', responsable: 'DSI + CRM', description: 'React Native iOS/Android. Points, niveau, offres, historique, parking, événements, réservation restaurant.', priorite: 'critique' },
]

const phases = ['Tout', 'Approche', 'Parking', 'Entrée', 'Hall central', 'Shopping', 'Restauration', 'Fidélisation']

const prioriteConfig: Record<Priority, { bg: string; border: string; text: string }> = {
  critique: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', text: '#ef4444' },
  important: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b' },
  secondaire: { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', text: '#64748b' },
}

const typeConfig: Record<TPType, { bg: string; text: string }> = {
  physique: { bg: 'rgba(20,184,166,0.12)', text: '#14b8a6' },
  digital: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  humain: { bg: 'rgba(167,125,76,0.12)', text: '#a77d4c' },
}

export default function TouchpointsMatrix() {
  const [activePhase, setActivePhase] = useState('Tout')
  const filtered = activePhase === 'Tout' ? touchpoints : touchpoints.filter(t => t.phase === activePhase)

  const countByType = { physique: touchpoints.filter(t => t.type === 'physique').length, digital: touchpoints.filter(t => t.type === 'digital').length, humain: touchpoints.filter(t => t.type === 'humain').length }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#f59e0b' }}>VOL. 3 — M3 TOUCHPOINTS</p>
        <h1 className="text-[28px] font-light text-white mb-3">Matrice Touchpoints</h1>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm">
        <span><strong className="text-white">{touchpoints.length}</strong> <span style={{ color: '#4a5568' }}>TOUCHPOINTS TOTAL</span></span>
        <span style={{ color: '#1e2a3a' }}>|</span>
        <span><span style={{ color: '#14b8a6' }}>Physique : {countByType.physique}</span></span>
        <span style={{ color: '#1e2a3a' }}>|</span>
        <span><span style={{ color: '#3b82f6' }}>Digital : {countByType.digital}</span></span>
        <span style={{ color: '#1e2a3a' }}>|</span>
        <span><span style={{ color: '#a77d4c' }}>Humain : {countByType.humain}</span></span>
      </div>

      {/* Phase filters */}
      <div className="flex flex-wrap gap-2">
        {phases.map((phase) => {
          const count = phase === 'Tout' ? touchpoints.length : touchpoints.filter(t => t.phase === phase).length
          return (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className="text-[12px] font-medium px-3 py-1.5 rounded-full transition-all"
              style={{
                background: activePhase === phase ? 'rgba(52,211,153,0.12)' : 'transparent',
                border: `1px solid ${activePhase === phase ? 'rgba(52,211,153,0.4)' : '#1e2a3a'}`,
                color: activePhase === phase ? '#34d399' : '#4a5568',
              }}
            >
              {phase} ({count})
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-[10px] overflow-hidden" style={{ border: '1px solid #1e2a3a' }}>
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ background: '#0f1623' }}>
              {['Touchpoint', 'Phase', 'Type', 'Responsable', 'Description', 'Priorité'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#4a5568', borderBottom: '1px solid #1e2a3a' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((tp) => {
              const pc = prioriteConfig[tp.priorite]
              const tc = typeConfig[tp.type]
              return (
                <tr key={tp.id} style={{ borderBottom: '1px solid #1e2a3a' }} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white font-medium max-w-[200px]">{tp.name}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{tp.phase}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.text }}>{tp.type}</span>
                  </td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{tp.responsable}</td>
                  <td className="px-4 py-3 max-w-[300px]" style={{ color: '#64748b' }}>{tp.description}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text }}>{tp.priorite}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
