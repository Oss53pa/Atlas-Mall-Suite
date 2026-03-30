// ═══ StatusBadge — Badge de statut reutilisable ═══
// Remplace les 10+ implementations inline dans les sections vol1/vol2/vol3

interface StatusBadgeProps {
  label: string
  color: string
  bg?: string
  border?: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ label, color, bg, border, size = 'sm' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-[11px] px-2.5 py-1'

  return (
    <span
      className={`inline-flex items-center font-bold tracking-wider rounded-full ${sizeClasses}`}
      style={{
        color,
        background: bg ?? `${color}14`,
        border: `1px solid ${border ?? `${color}33`}`,
      }}
    >
      {label}
    </span>
  )
}

interface StatusDotProps {
  color: string
  label?: string
  size?: number
}

export function StatusDot({ color, label, size = 8 }: StatusDotProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="rounded-full flex-shrink-0"
        style={{ width: size, height: size, background: color }}
      />
      {label && <span className="text-[11px] text-slate-400">{label}</span>}
    </span>
  )
}
