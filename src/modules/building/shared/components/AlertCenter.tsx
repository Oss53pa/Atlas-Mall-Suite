import { useState } from 'react'
import { Bell, X, AlertTriangle, Info, ShieldAlert, Check } from 'lucide-react'
import type { Alert } from '../proph3t/alertEngine'

interface AlertCenterProps {
  alerts: Alert[]
  onAcknowledge: (id: string) => void
  onResolve: (id: string) => void
}

const severityConfig = {
  critical: { icon: ShieldAlert, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  info: { icon: Info, color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.25)' },
}

export default function AlertCenter({ alerts, onAcknowledge, onResolve }: AlertCenterProps) {
  const [open, setOpen] = useState(false)
  const unacknowledged = alerts.filter(a => !a.acknowledged)
  const criticalCount = unacknowledged.filter(a => a.severity === 'critical').length

  return (
    <>
      {/* Floating bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-transform hover:scale-110"
        style={{
          background: criticalCount > 0 ? '#ef4444' : '#1e2a3a',
          border: '1px solid #2d3a4a',
        }}
      >
        <Bell size={20} className="text-white" />
        {unacknowledged.length > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
            style={{ background: '#ef4444' }}
          >
            {unacknowledged.length}
          </span>
        )}
      </button>

      {/* Alert panel */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-50 w-96 max-h-[70vh] rounded-xl overflow-hidden shadow-2xl flex flex-col"
          style={{ background: '#0f1729', border: '1px solid #1e2a3a' }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2a3a' }}>
            <h3 className="text-sm font-semibold text-white">Alertes ({alerts.length})</h3>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {alerts.length === 0 && (
              <p className="text-center text-[13px] py-8" style={{ color: '#4a5568' }}>Aucune alerte active</p>
            )}
            {alerts.map(alert => {
              const cfg = severityConfig[alert.severity]
              const Icon = cfg.icon
              return (
                <div
                  key={alert.id}
                  className="rounded-lg p-3"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, opacity: alert.acknowledged ? 0.5 : 1 }}
                >
                  <div className="flex items-start gap-2">
                    <Icon size={16} style={{ color: cfg.color, marginTop: 2, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white">{alert.title}</p>
                      <p className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>{alert.message}</p>
                      {alert.action_required && (
                        <p className="text-[11px] mt-1 font-medium" style={{ color: cfg.color }}>{alert.action_required}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {!alert.acknowledged && (
                          <button
                            onClick={() => onAcknowledge(alert.id)}
                            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}
                          >
                            <Check size={10} /> Acquitter
                          </button>
                        )}
                        <button
                          onClick={() => onResolve(alert.id)}
                          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
                        >
                          Resoudre
                        </button>
                        <span className="text-[10px] ml-auto" style={{ color: '#4a5568' }}>
                          {new Date(alert.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
