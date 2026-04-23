import { WifiOff } from 'lucide-react'

interface OfflineBannerProps {
  isOffline: boolean
  pendingChanges: number
}

export default function OfflineBanner({ isOffline, pendingChanges }: OfflineBannerProps) {
  if (!isOffline) return null

  return (
    <div className="flex-none flex items-center gap-2 px-4 py-1.5 bg-amber-900/40 border-b border-amber-700/30 text-amber-300 text-xs">
      <WifiOff className="w-3.5 h-3.5" />
      <span className="font-medium">Mode hors-ligne</span>
      {pendingChanges > 0 && (
        <span className="text-amber-400/80">
          — {pendingChanges} modification{pendingChanges > 1 ? 's' : ''} en attente de synchronisation
        </span>
      )}
    </div>
  )
}
