import React, { useState } from 'react'
import { Sparkles, Plus, Zap } from 'lucide-react'
import { useVol2Store } from '../store/vol2Store'

interface CameraRow {
  id: string
  modele: string
  zone: string
  fov: number
  portee: string
  hauteur: string
  status: 'Actif' | 'Maintenance' | 'Planifié'
}

const mockCameras: CameraRow[] = [
  { id: 'CAM-001', modele: 'Axis P3265-LVE', zone: 'Hall central', fov: 110, portee: '30m', hauteur: '4m', status: 'Actif' },
  { id: 'CAM-002', modele: 'Axis Q6135-LE', zone: 'Parking B1', fov: 360, portee: '200m', hauteur: '6m', status: 'Actif' },
  { id: 'CAM-003', modele: 'Hikvision DS-2CD2387G2', zone: 'Entrée principale', fov: 120, portee: '30m', hauteur: '3.5m', status: 'Actif' },
  { id: 'CAM-004', modele: 'Dahua IPC-PDBW8842', zone: 'Food court R+2', fov: 180, portee: '15m', hauteur: '3m', status: 'Actif' },
  { id: 'CAM-005', modele: 'Axis P1378-LE', zone: 'Galerie RDC', fov: 95, portee: '50m', hauteur: '4m', status: 'Actif' },
  { id: 'CAM-006', modele: 'Axis Q6135-LE', zone: 'Périmètre ext.', fov: 360, portee: '200m', hauteur: '8m', status: 'Maintenance' },
  { id: 'CAM-007', modele: 'Hikvision DS-2CD2387G2', zone: 'Galerie R+1', fov: 120, portee: '30m', hauteur: '3.5m', status: 'Actif' },
  { id: 'CAM-008', modele: 'Axis P3265-LVE', zone: 'Zone livraisons', fov: 110, portee: '25m', hauteur: '4m', status: 'Planifié' },
]

const equipments = [
  { name: '120+ caméras IP (dômes intérieurs, bullet extérieurs)', description: 'Réseau IP unifié — serveur NVR centralisé 30 jours de stockage' },
  { name: 'Analyse vidéo IA : détection intrusion, abandon colis, attroupement', description: 'Algorithmes deep learning — alertes temps réel vers PC sécurité' },
  { name: 'PC sécurité central — mur d\'écrans 24/7', description: '12 moniteurs + mur vidéo 4×3 — supervision permanente' },
  { name: 'Stockage 30 jours conforme RGPD', description: 'Serveur NVR redondant — suppression automatique à J+30' },
  { name: 'Accès distant sécurisé', description: 'Direction et forces de l\'ordre — VPN dédié + authentification 2FA' },
]

const statusColors = {
  'Actif': { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', text: '#22c55e' },
  'Maintenance': { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b' },
  'Planifié': { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', text: '#64748b' },
}

export default function VideoSection() {
  const [filterZone, setFilterZone] = useState<string>('Toutes')
  const zones = ['Toutes', ...new Set(mockCameras.map(c => c.zone))]
  const filtered = filterZone === 'Toutes' ? mockCameras : mockCameras.filter(c => c.zone === filterZone)
  const coverageScore = 87

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>VOL. 2 — PLAN SÉCURITAIRE</p>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>ZONE 03</span>
          <h1 className="text-[28px] font-light text-white">Vidéosurveillance</h1>
        </div>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>Réseau de caméras intelligent couvrant 100% des espaces communs.</p>
      </div>

      {/* Dispositif */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Dispositif</h2>
        {equipments.map((eq) => (
          <div key={eq.name} className="rounded-[10px] p-4 flex items-start gap-3" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
            <div className="mt-0.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: '#38bdf8' }} />
            <div>
              <span className="text-[13px] font-medium text-white">{eq.name}</span>
              <p className="text-[12px] mt-1" style={{ color: '#4a5568' }}>{eq.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Score de couverture */}
      <div className="rounded-[10px] p-6" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <h2 className="text-sm font-semibold text-white mb-4">Score de couverture</h2>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold" style={{ color: '#38bdf8' }}>{coverageScore}%</span>
            <span className="text-sm" style={{ color: '#4a5568' }}>couverture globale</span>
          </div>
          <div className="flex-1">
            <div className="h-3 rounded-full overflow-hidden" style={{ background: '#1e2a3a' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${coverageScore}%`, background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)' }} />
            </div>
          </div>
          <span className="text-lg font-semibold" style={{ color: '#38bdf8' }}>{coverageScore}/100</span>
        </div>
      </div>

      {/* Inventaire caméras */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Inventaire caméras</h2>
          <div className="flex items-center gap-2">
            {/* Filter */}
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="text-[12px] rounded px-3 py-1.5 outline-none"
              style={{ background: '#0f1623', border: '1px solid #1e2a3a', color: '#94a3b8' }}
            >
              {zones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
        </div>
        <div className="rounded-[10px] overflow-hidden" style={{ border: '1px solid #1e2a3a' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: '#0f1623' }}>
                {['N°', 'Modèle', 'Zone', 'FOV', 'Portée', 'Hauteur', 'Statut'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#4a5568', borderBottom: '1px solid #1e2a3a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((cam) => {
                const sc = statusColors[cam.status]
                return (
                  <tr key={cam.id} style={{ borderBottom: '1px solid #1e2a3a' }} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono" style={{ color: '#38bdf8' }}>{cam.id}</td>
                    <td className="px-4 py-3 text-white">{cam.modele}</td>
                    <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{cam.zone}</td>
                    <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{cam.fov}°</td>
                    <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{cam.portee}</td>
                    <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{cam.hauteur}</td>
                    <td className="px-4 py-3"><span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}>{cam.status}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proph3t */}
      <div className="rounded-[10px] p-6" style={{ background: 'rgba(126,34,206,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'rgba(126,34,206,0.2)' }}><Sparkles size={16} className="text-purple-400" /></div>
          <h3 className="font-semibold text-purple-300">Proph3t — Score couverture vidéo</h3>
        </div>
        <ul className="space-y-1 text-[13px]" style={{ color: '#94a3b8' }}>
          <li>• Couverture zones communes : 96% — cible 100%</li>
          <li>• 3 angles morts détectés : parking B1 sect. C, escalier E2, issue secours N°4</li>
          <li>• Recommandation : 4 caméras supplémentaires pour couverture intégrale</li>
          <li>• Conformité EN 62676 : 94% — mise à jour firmware requise sur 8 caméras</li>
        </ul>
      </div>
    </div>
  )
}
