// ═══ LoadingSpinner — Indicateur de chargement reutilisable ═══

import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  label?: string
  size?: number
  className?: string
}

export function LoadingSpinner({ label, size = 24, className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}>
      <Loader2 size={size} className="animate-spin text-atlas-500" />
      {label && <p className="text-sm text-slate-400">{label}</p>}
    </div>
  )
}

export function LoadingPage({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner label={label ?? 'Chargement...'} size={32} />
    </div>
  )
}
