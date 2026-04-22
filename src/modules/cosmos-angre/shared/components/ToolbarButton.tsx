import type { LucideIcon } from 'lucide-react'

interface ToolbarButtonProps {
  icon: LucideIcon
  label: string
  active?: boolean
  onClick: () => void
  badge?: string | number
  activeColor?: string
  className?: string
}

export default function ToolbarButton({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
  activeColor,
  className = '',
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150
        ${active
          ? `bg-white/[0.08] border border-white/[0.1] shadow-sm ${activeColor ?? 'text-atlas-400'}`
          : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-300 border border-transparent'
        }
        ${className}
      `}
    >
      <Icon className="w-4 h-4" />
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 shadow-sm">
          {badge}
        </span>
      )}
    </button>
  )
}
