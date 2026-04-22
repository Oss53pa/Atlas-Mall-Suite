// ═══ EMPTY STATE — Contextual guidance for empty sections ═══

import {
  Shield,
  ShoppingBag,
  Route,
  Layers,
  Upload,
  Sparkles
} from 'lucide-react'

type Illustration = 'security' | 'commercial' | 'journey' | 'generic'

interface EmptyStateProps {
  section: string
  illustration?: Illustration
  message: string
  primaryAction: { label: string; onClick: () => void }
  secondaryAction?: { label: string; onClick: () => void }
}

const ILLUSTRATIONS: Record<Illustration, { icon: typeof Shield; color: string; bg: string }> = {
  security:   { icon: Shield,      color: '#38bdf8', bg: 'rgba(56,189,248,0.06)' },
  commercial: { icon: ShoppingBag, color: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
  journey:    { icon: Route,       color: '#22c55e', bg: 'rgba(34,197,94,0.06)' },
  generic:    { icon: Layers,      color: '#b38a5a', bg: 'rgba(179,138,90,0.06)' },
}

export default function EmptyState({
  section,
  illustration = 'generic',
  message,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  const ill = ILLUSTRATIONS[illustration]
  const Icon = ill.icon

  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      {/* Illustration */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: ill.bg, border: `1px solid ${ill.color}20` }}
      >
        <Icon size={36} style={{ color: ill.color, opacity: 0.6 }} />
      </div>

      {/* Section name */}
      <div className="text-[10px] font-mono tracking-wider text-slate-600 mb-2">{section}</div>

      {/* Message */}
      <p className="text-[13px] text-slate-400 max-w-md leading-relaxed mb-6">{message}</p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={primaryAction.onClick}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium text-white transition-colors"
          style={{ background: ill.color }}
        >
          <Upload size={14} />
          {primaryAction.label}
        </button>
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[12px] text-slate-300 hover:bg-white/10 transition-colors"
          >
            <Sparkles size={14} />
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Pre-configured empty states for common sections ──────────

export function EmptyStateSecurity({ onImport, onAutoPlace }: { onImport: () => void; onAutoPlace?: () => void }) {
  return (
    <EmptyState
      section="PLAN SECURITAIRE"
      illustration="security"
      message="Aucune camera placee. Commencez par importer votre plan DXF ou laissez Proph3t placer automatiquement les cameras sur la base de votre plan de zones."
      primaryAction={{ label: 'Importer un plan', onClick: onImport }}
      secondaryAction={onAutoPlace ? { label: 'Proph3t auto-placement', onClick: onAutoPlace } : undefined}
    />
  )
}

export function EmptyStateCommercial({ onImport }: { onImport: () => void }) {
  return (
    <EmptyState
      section="PLAN COMMERCIAL"
      illustration="commercial"
      message="Aucune cellule commerciale configuree. Importez votre plan pour detecter automatiquement les zones ou creez les manuellement."
      primaryAction={{ label: 'Importer un plan', onClick: onImport }}
      secondaryAction={{ label: 'Creer manuellement', onClick: onImport }}
    />
  )
}

export function EmptyStateJourney({ onImport, onAutoGenerate }: { onImport: () => void; onAutoGenerate?: () => void }) {
  return (
    <EmptyState
      section="PARCOURS CLIENT"
      illustration="journey"
      message="Aucun point d'interet configure. Importez votre plan pour que Proph3t detecte automatiquement les zones et genere le parcours visiteur."
      primaryAction={{ label: 'Importer un plan', onClick: onImport }}
      secondaryAction={onAutoGenerate ? { label: 'Generer automatiquement', onClick: onAutoGenerate } : undefined}
    />
  )
}
