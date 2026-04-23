// ═══ SectionLayout — Mise en page de section reutilisable ═══
// Structure coherente : header avec label volume + titre + contenu

interface SectionLayoutProps {
  volumeLabel: string
  volumeColor: string
  title: string
  subtitle?: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function SectionLayout({
  volumeLabel,
  volumeColor,
  title,
  subtitle,
  children,
  actions,
  className = '',
}: SectionLayoutProps) {
  return (
    <div className={`p-6 space-y-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p
            className="text-[11px] tracking-[0.2em] font-medium mb-2"
            style={{ color: volumeColor }}
          >
            {volumeLabel}
          </p>
          <h1 className="text-[28px] font-display font-bold text-white leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

interface PanelProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function Panel({ title, children, className = '' }: PanelProps) {
  return (
    <div className={`rounded-xl p-5 border border-white/[0.06] bg-surface-2 ${className}`}>
      {title && (
        <h3 className="text-white font-semibold mb-4">{title}</h3>
      )}
      {children}
    </div>
  )
}
