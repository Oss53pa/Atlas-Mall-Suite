import { Sparkles } from 'lucide-react'

interface Equipment {
  name: string
  description: string
  status: 'Opérationnel' | 'En cours' | 'Planifié'
}

const equipments: Equipment[] = [
  { name: 'Portiques compteurs de flux', description: 'Entrées principales — comptage bidirectionnel temps réel', status: 'Opérationnel' },
  { name: 'Badges RFID personnel + biométrie zones sensibles', description: 'Accès différencié par zone et niveau d\'habilitation', status: 'Opérationnel' },
  { name: 'SAS livraisons avec vérification identité', description: 'Zone de livraison sécurisée — contrôle identité + badge temporaire', status: 'En cours' },
  { name: 'Interphones vidéo sur accès techniques', description: 'Accès locaux techniques, TGBT, local SSI — vérification visuelle', status: 'Opérationnel' },
  { name: 'Registre numérique visiteurs', description: 'Tablette accueil — enregistrement visiteurs avec photo + badge temporaire', status: 'Planifié' },
]

const statusColors = {
  'Opérationnel': { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', text: '#22c55e' },
  'En cours': { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b' },
  'Planifié': { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', text: '#64748b' },
}

interface AccessRight {
  zone: string
  niveau: string
  typeAcces: string
  badge: boolean
  biometrie: boolean
  sas: boolean
  reference: string
}

const accessRights: AccessRight[] = [
  { zone: 'Galeries commerciales', niveau: 'RDC / R+1', typeAcces: 'Public', badge: false, biometrie: false, sas: false, reference: 'ACC-001' },
  { zone: 'Parking sous-sol', niveau: 'B1', typeAcces: 'Semi-public', badge: false, biometrie: false, sas: false, reference: 'ACC-002' },
  { zone: 'Locaux techniques', niveau: 'B1 / R+1', typeAcces: 'Restreint', badge: true, biometrie: false, sas: false, reference: 'ACC-003' },
  { zone: 'PC Sécurité', niveau: 'RDC', typeAcces: 'Restreint', badge: true, biometrie: true, sas: false, reference: 'ACC-004' },
  { zone: 'Local TGBT', niveau: 'B1', typeAcces: 'Restreint', badge: true, biometrie: true, sas: false, reference: 'ACC-005' },
  { zone: 'Zone livraisons', niveau: 'B1', typeAcces: 'Contrôlé', badge: true, biometrie: false, sas: true, reference: 'ACC-006' },
  { zone: 'Direction', niveau: 'R+1', typeAcces: 'Restreint', badge: true, biometrie: false, sas: false, reference: 'ACC-007' },
]

export default function AccesSection() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>VOL. 2 — PLAN SÉCURITAIRE</p>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>ZONE 02</span>
          <h1 className="text-[28px] font-light text-white">Contrôle d'accès</h1>
        </div>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>Gestion des flux entrants et sortants — visiteurs, personnel, livraisons.</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Dispositif</h2>
        {equipments.map((eq) => {
          const sc = statusColors[eq.status]
          return (
            <div key={eq.name} className="rounded-[10px] p-4 flex items-start justify-between" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: '#38bdf8' }} />
                <div>
                  <span className="text-[13px] font-medium text-white">{eq.name}</span>
                  <p className="text-[12px] mt-1" style={{ color: '#4a5568' }}>{eq.description}</p>
                </div>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-4" style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}>{eq.status}</span>
            </div>
          )
        })}
      </div>

      {/* Matrice des droits */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Matrice des droits d'accès</h2>
        <div className="rounded-[10px] overflow-hidden" style={{ border: '1px solid #1e2a3a' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: '#0f1623' }}>
                {['Zone', 'Niveau', 'Type accès', 'Badge', 'Biométrie', 'SAS', 'Réf.'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#4a5568', borderBottom: '1px solid #1e2a3a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accessRights.map((ar) => (
                <tr key={ar.reference} style={{ borderBottom: '1px solid #1e2a3a' }} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white font-medium">{ar.zone}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{ar.niveau}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{ar.typeAcces}</td>
                  <td className="px-4 py-3">{ar.badge ? <span style={{ color: '#22c55e' }}>●</span> : <span style={{ color: '#334155' }}>○</span>}</td>
                  <td className="px-4 py-3">{ar.biometrie ? <span style={{ color: '#22c55e' }}>●</span> : <span style={{ color: '#334155' }}>○</span>}</td>
                  <td className="px-4 py-3">{ar.sas ? <span style={{ color: '#22c55e' }}>●</span> : <span style={{ color: '#334155' }}>○</span>}</td>
                  <td className="px-4 py-3 font-mono text-[11px]" style={{ color: '#38bdf8' }}>{ar.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-[10px] p-6" style={{ background: 'rgba(126,34,206,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'rgba(126,34,206,0.2)' }}><Sparkles size={16} className="text-purple-400" /></div>
          <h3 className="font-semibold text-purple-300">Proph3t — Recommandations portes</h3>
        </div>
        <ul className="space-y-1 text-[13px]" style={{ color: '#94a3b8' }}>
          <li>• PC Sécurité : porte blindée A2P BP3 + lecteur biométrique Morpho — réf. GUNNEBO SecureLine</li>
          <li>• Zone livraisons : SAS double porte avec interphone vidéo — réf. CAME BPT</li>
          <li>• Locaux techniques : contrôle badge Mifare DESFire EV2 — réf. NEDAP AEOS</li>
        </ul>
      </div>
    </div>
  )
}
