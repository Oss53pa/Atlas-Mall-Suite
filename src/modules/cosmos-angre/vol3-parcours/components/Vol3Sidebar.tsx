// F-004 : Sidebar navigation extraite de Vol3Module.tsx.
// Rendu pur — aucun etat local, tout vient des props.

import { ChevronDown } from 'lucide-react'
import type { NavGroup, Vol3Tab } from '../sidebarConfig'
import SaveStatusIndicator, { type SaveStatus } from '../../shared/components/SaveStatusIndicator'
import { PlanModelSelector } from '../../shared/components/PlanModelSelector'

interface Vol3SidebarProps {
  navGroups: NavGroup[]
  activeTab: Vol3Tab
  onSelectTab: (tab: Vol3Tab) => void
  openGroups: Record<string, boolean>
  onToggleGroup: (key: string) => void
  saveStatus: SaveStatus
}

export function Vol3Sidebar({
  navGroups, activeTab, onSelectTab, openGroups, onToggleGroup, saveStatus,
}: Vol3SidebarProps) {
  return (
    <aside className="flex-none w-60 border-r border-white/[0.04] bg-surface-1 overflow-y-auto">
      {/* Sidebar header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.04]">
        <div className="text-[12px] font-bold text-white tracking-tight">Cosmos Angré</div>
        <div className="text-[9px] text-gray-500 font-mono mt-0.5 tracking-wider">VOL. 3 — PARCOURS CLIENT</div>
      </div>

      {/* Navigation groups */}
      <nav className="py-2 px-2">
        {navGroups.map((group) => {
          const groupAccent = group.color
          return (
            <div key={group.key}>
              {group.separator && <div className="divider mx-1" />}

              {/* Group header */}
              <button
                onClick={() => onToggleGroup(group.key)}
                className="w-full flex items-center gap-2 px-2 py-2 cursor-pointer rounded-lg hover:bg-white/[0.02] transition-colors duration-150"
              >
                <div className="w-0.5 h-3.5 rounded-full flex-none" style={{ background: group.color, opacity: 0.5 }} />
                <group.icon className="w-3 h-3 flex-none" style={{ color: group.color, opacity: 0.7 }} />
                <span className="text-[10px] font-semibold tracking-[0.1em] flex-1 text-left text-gray-500">
                  {group.label}
                </span>
                <ChevronDown className={`w-3 h-3 text-gray-600 transition-transform duration-200 ${openGroups[group.key] ? '' : '-rotate-90'}`} />
              </button>

              {/* Group items with smooth transition */}
              <div className={`overflow-hidden transition-all duration-200 ${openGroups[group.key] ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="pb-1 pl-1">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelectTab(item.id)}
                        className={`w-full flex items-center gap-2.5 pl-4 pr-3 py-[7px] rounded-lg text-left transition-all duration-150 ${
                          isActive
                            ? 'bg-white/[0.06] text-white'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'
                        }`}
                        style={isActive ? { boxShadow: `inset 2px 0 0 ${groupAccent}` } : undefined}
                      >
                        <item.icon className="w-3.5 h-3.5 flex-none" style={isActive ? { color: groupAccent } : undefined} />
                        <span className="text-[11px] font-medium truncate">{item.label}</span>
                        {item.dot && (
                          <span className="glow-dot flex-none ml-auto" style={{ background: '#f59e0b' }} />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* Plan model selector (commun aux volumes) */}
      <div className="px-3 py-2 border-t border-white/[0.04]">
        <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-1.5">Modèle de plan</p>
        <PlanModelSelector projectId="cosmos-angre" accentColor="#34d399" />
      </div>

      {/* Save status */}
      <div className="px-4 py-2 border-t border-white/[0.04]">
        <SaveStatusIndicator status={saveStatus} />
      </div>
    </aside>
  )
}
