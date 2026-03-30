// ═══ VOL.2 — Integration VMS Live (F2.11) ═══

import React, { useState } from 'react'
import { Monitor, Wifi, WifiOff, CheckCircle, XCircle, RefreshCw, Settings, Camera } from 'lucide-react'
import { DemoBanner, ConnectionStatus } from '../../shared/components/DemoBanner'

type VmsProvider = 'milestone' | 'genetec' | 'dahua_dss' | 'hikvision_ivms'
type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error'

interface VmsConfig {
  provider: VmsProvider
  label: string
  logo: string
  apiUrl: string
  status: ConnectionStatus
  camerasSynced: number
  lastSync: string | null
}

const VMS_PROVIDERS: VmsConfig[] = [
  { provider: 'milestone', label: 'Milestone XProtect', logo: 'MI', apiUrl: '', status: 'disconnected', camerasSynced: 0, lastSync: null },
  { provider: 'genetec', label: 'Genetec Security Center', logo: 'GN', apiUrl: '', status: 'disconnected', camerasSynced: 0, lastSync: null },
  { provider: 'dahua_dss', label: 'Dahua DSS', logo: 'DH', apiUrl: 'https://dss.cosmosangre.ci:8443', status: 'connected', camerasSynced: 48, lastSync: '2026-03-24T08:30:00' },
  { provider: 'hikvision_ivms', label: 'Hikvision iVMS-4200', logo: 'HK', apiUrl: '', status: 'disconnected', camerasSynced: 0, lastSync: null },
]

const statusConfig: Record<ConnectionStatus, { color: string; label: string; icon: React.ElementType }> = {
  connected: { color: '#22c55e', label: 'Connecte', icon: CheckCircle },
  disconnected: { color: '#6b7280', label: 'Deconnecte', icon: WifiOff },
  connecting: { color: '#f59e0b', label: 'Connexion...', icon: RefreshCw },
  error: { color: '#ef4444', label: 'Erreur', icon: XCircle },
}

interface CameraLiveStatus {
  id: string
  reference: string
  vmsStatus: 'online' | 'offline' | 'alert'
  fps: number
  recording: boolean
  lastAlert?: string
}

const LIVE_CAMERAS: CameraLiveStatus[] = [
  { id: 'lc-01', reference: 'CAM-RDC-01', vmsStatus: 'online', fps: 25, recording: true },
  { id: 'lc-02', reference: 'CAM-RDC-02', vmsStatus: 'online', fps: 25, recording: true },
  { id: 'lc-03', reference: 'CAM-RDC-03', vmsStatus: 'alert', fps: 15, recording: true, lastAlert: 'Mouvement detecte zone 3' },
  { id: 'lc-04', reference: 'CAM-B1-01', vmsStatus: 'online', fps: 25, recording: true },
  { id: 'lc-05', reference: 'CAM-B1-02', vmsStatus: 'offline', fps: 0, recording: false },
  { id: 'lc-06', reference: 'CAM-R1-01', vmsStatus: 'online', fps: 25, recording: true },
]

export default function VmsIntegration() {
  const [providers, setProviders] = useState(VMS_PROVIDERS)
  const [selectedProvider, setSelectedProvider] = useState<VmsProvider>('dahua_dss')

  const activeProvider = providers.find(p => p.provider === selectedProvider)
  const onlineCount = LIVE_CAMERAS.filter(c => c.vmsStatus === 'online').length
  const alertCount = LIVE_CAMERAS.filter(c => c.vmsStatus === 'alert').length
  const offlineCount = LIVE_CAMERAS.filter(c => c.vmsStatus === 'offline').length

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <DemoBanner dataSource={activeProvider?.connected ? 'live' : 'demo'} systemName="VMS (Milestone / Genetec)" />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>VOL. 2 — PLAN SECURITAIRE</p>
          <h1 className="text-[28px] font-display font-bold text-white mb-2">Integration VMS Live</h1>
          <p className="text-[13px]" style={{ color: '#4a5568' }}>Connexion API vers les systemes de videosurveillance — statut temps reel des cameras.</p>
        </div>
        <ConnectionStatus dataSource={activeProvider?.connected ? 'live' : 'demo'} />
      </div>

      {/* VMS Providers */}
      <div className="grid grid-cols-4 gap-3">
        {providers.map((p) => {
          const cfg = statusConfig[p.status]
          const Icon = cfg.icon
          const isActive = selectedProvider === p.provider
          return (
            <button key={p.provider} onClick={() => setSelectedProvider(p.provider)} className="rounded-xl p-4 text-left" style={{ background: isActive ? '#141e2e' : '#0b1120', border: `1px solid ${isActive ? '#38bdf8' + '40' : '#1e2a3a'}` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold" style={{ background: `${cfg.color}15`, color: cfg.color }}>{p.logo}</div>
                <Icon size={14} style={{ color: cfg.color }} />
              </div>
              <p className="text-[12px] text-white font-medium">{p.label}</p>
              <p className="text-[10px] mt-1" style={{ color: cfg.color }}>{cfg.label}</p>
              {p.camerasSynced > 0 && <p className="text-[10px] mt-0.5" style={{ color: '#4a5568' }}>{p.camerasSynced} cameras sync.</p>}
            </button>
          )
        })}
      </div>

      {/* Connected provider detail */}
      {activeProvider?.status === 'connected' && (
        <>
          {/* Live stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{onlineCount}</p>
              <p className="text-[10px]" style={{ color: '#4a5568' }}>En ligne</p>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{alertCount}</p>
              <p className="text-[10px]" style={{ color: '#4a5568' }}>En alerte</p>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{offlineCount}</p>
              <p className="text-[10px]" style={{ color: '#4a5568' }}>Hors ligne</p>
            </div>
          </div>

          {/* Camera live status */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2a3a' }}>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: '#0f1623' }}>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Camera</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Statut</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">FPS</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Enregistrement</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Alerte</th>
                </tr>
              </thead>
              <tbody>
                {LIVE_CAMERAS.map((cam) => {
                  const color = cam.vmsStatus === 'online' ? '#22c55e' : cam.vmsStatus === 'alert' ? '#f59e0b' : '#ef4444'
                  return (
                    <tr key={cam.id} style={{ borderTop: '1px solid #1e2a3a' }}>
                      <td className="px-4 py-3 text-white font-mono">{cam.reference}</td>
                      <td className="text-center px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                          <span style={{ color }}>{cam.vmsStatus}</span>
                        </span>
                      </td>
                      <td className="text-center px-4 py-3 text-slate-300">{cam.fps}</td>
                      <td className="text-center px-4 py-3">
                        {cam.recording ? <span style={{ color: '#22c55e' }}>REC</span> : <span style={{ color: '#ef4444' }}>OFF</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-[11px]">{cam.lastAlert ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Config for disconnected */}
      {activeProvider?.status === 'disconnected' && (
        <div className="rounded-xl p-6 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <Settings size={24} className="mx-auto mb-3 text-slate-500" />
          <p className="text-white font-medium mb-2">Configurer {activeProvider.label}</p>
          <p className="text-[12px] text-slate-500 mb-4">Entrez l'URL API et les credentials pour connecter le VMS.</p>
          <div className="max-w-sm mx-auto space-y-2">
            <input placeholder="URL API (ex: https://vms.example.com:8443)" className="w-full text-[12px] bg-[#0b1120] text-white rounded-lg px-3 py-2 border border-[#1e2a3a] outline-none placeholder:text-slate-600" />
            <input placeholder="Utilisateur" className="w-full text-[12px] bg-[#0b1120] text-white rounded-lg px-3 py-2 border border-[#1e2a3a] outline-none placeholder:text-slate-600" />
            <input placeholder="Mot de passe" type="password" className="w-full text-[12px] bg-[#0b1120] text-white rounded-lg px-3 py-2 border border-[#1e2a3a] outline-none placeholder:text-slate-600" />
            <button className="w-full text-[12px] px-4 py-2 rounded-lg font-medium" style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8' }}>
              Tester la connexion
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
