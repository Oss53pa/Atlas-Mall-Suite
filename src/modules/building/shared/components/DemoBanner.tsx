// ═══ DemoBanner — Banniere mode demonstration non-dismissable ═══
// Obligatoire sur toute section affichant des donnees simulees (regle d'or securite)

import { AlertTriangle, Wifi, WifiOff, Settings } from 'lucide-react'

export type DataSource = 'live' | 'demo' | 'config_required'

interface DemoBannerProps {
  dataSource: DataSource
  onConfigure?: () => void
  systemName?: string  // ex: "VMS", "Supabase", "PROPH3T"
}

export function DemoBanner({ dataSource, onConfigure, systemName = 'systeme operationnel' }: DemoBannerProps) {
  if (dataSource === 'live') return null

  return (
    <div className="rounded-lg p-3 flex items-center gap-3 mb-4 bg-amber-500/5 border border-amber-500/20">
      <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-amber-400 font-semibold text-[12px]">Mode Demonstration</p>
        <p className="text-amber-400/70 text-[11px]">
          Les donnees affichees sont simulees. Ce tableau de bord necessite une connexion
          au {systemName} pour afficher des donnees reelles.
        </p>
      </div>
      {onConfigure && (
        <button
          onClick={onConfigure}
          className="flex items-center gap-1.5 text-[10px] text-amber-400 hover:text-amber-300 whitespace-nowrap px-2 py-1 rounded border border-amber-500/20 hover:bg-amber-500/10 transition-colors"
        >
          <Settings size={12} /> Configurer
        </button>
      )}
    </div>
  )
}

interface ConnectionStatusProps {
  dataSource: DataSource
  className?: string
}

export function ConnectionStatus({ dataSource, className = '' }: ConnectionStatusProps) {
  const config = {
    live: { icon: Wifi, label: 'Connecte', color: '#22c55e', dot: 'bg-green-500' },
    demo: { icon: WifiOff, label: 'Hors ligne — demo', color: '#f59e0b', dot: 'bg-amber-500' },
    config_required: { icon: Settings, label: 'Configuration requise', color: '#ef4444', dot: 'bg-red-500' },
  }[dataSource]

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] ${className}`} style={{ color: config.color }}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${dataSource === 'live' ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  )
}
