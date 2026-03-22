import React from 'react'
import type { LucideIcon } from 'lucide-react'

interface ToolbarButtonProps {
  icon: LucideIcon
  label: string
  active?: boolean
  onClick: () => void
  badge?: string | number
  className?: string
}

export default function ToolbarButton({ icon: Icon, label, active, onClick, badge, className = '' }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors
        ${active
          ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-transparent'
        }
        ${className}
      `}
    >
      <Icon className="w-4 h-4" />
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
          {badge}
        </span>
      )}
    </button>
  )
}
