// ═══ APP LAYOUT — TopBar SaaS + Sidebar + Content ═══

import React, { useState, useRef, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Sparkles, Settings, Bell, ChevronDown, User, LogOut,
  Building2, FolderOpen, ShieldCheck, Route, Box,
  FileText, BarChart2, MessageSquare, Layers, Scale,
  ClipboardList, Globe2, Zap, HelpCircle,
} from 'lucide-react'
import { useProjectStore } from '../modules/projects/projectStore'
import { useSettingsStore } from '../modules/projects/settingsStore'

// ── Dropdown generic ──
function Dropdown({ trigger, children, align = 'left' }: {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className="absolute top-full mt-1 min-w-[220px] rounded-xl border border-white/[0.08] py-1 z-[100] shadow-2xl"
          style={{ background: '#0e1629', [align === 'right' ? 'right' : 'left']: 0 }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function DropdownItem({ icon: Icon, label, active, accent, onClick }: {
  icon?: React.ComponentType<any>; label: string; active?: boolean; accent?: string; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors ${
        active ? 'text-white bg-white/[0.06]' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
      }`}
    >
      {Icon && <Icon size={14} style={accent ? { color: accent } : undefined} />}
      <span className="truncate">{label}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
    </button>
  )
}

// ── Sidebar nav items ──
interface SidebarItem {
  id: string; label: string; icon: React.ComponentType<any>; color?: string; path?: string
}

const VOLUME_ITEMS: SidebarItem[] = [
  { id: 'vol1', label: 'Plan Commercial', icon: Building2, color: '#f59e0b', path: 'vol1' },
  { id: 'vol2', label: 'Plan Sécurité',   icon: ShieldCheck, color: '#38bdf8', path: 'vol2' },
  { id: 'vol3', label: 'Parcours Client', icon: Route, color: '#34d399', path: 'vol3' },
]

const TRANSVERSAL_ITEMS: SidebarItem[] = [
  { id: 'scenarios',  label: 'Scénarios',      icon: Layers },
  { id: 'validation', label: 'Validation Exco', icon: ClipboardList },
  { id: 'dce',        label: 'DCE / AO',        icon: FileText },
  { id: 'benchmark',  label: 'Benchmark',       icon: BarChart2 },
]

const TOOL_ITEMS: SidebarItem[] = [
  { id: 'ai',     label: 'PROPH3T AI', icon: Sparkles, color: '#a855f7' },
  { id: 'export', label: 'Export / Rapports', icon: FileText },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const projects = useProjectStore((s) => s.projects)
  const activeProject = useProjectStore((s) => s.getActiveProject())
  const setActiveProject = useProjectStore((s) => s.setActiveProject)
  const settings = useSettingsStore()

  const isHome = location.pathname === '/' || location.pathname === '/dashboard'
  const isSettings = location.pathname.startsWith('/settings')
  const isInProject = location.pathname.startsWith('/projects/')

  const currentVolPath = isInProject
    ? location.pathname.includes('/vol1') ? 'vol1'
    : location.pathname.includes('/vol2') ? 'vol2'
    : location.pathname.includes('/vol3') ? 'vol3'
    : null
    : null

  // Sidebar only on project home (VolumesNav), NOT inside volumes (they have their own sidebar)
  const isInsideVolume = currentVolPath !== null
  const isProjectHome = isInProject && !isInsideVolume
  const showSidebar = isProjectHome

  const handleSelectProject = (id: string) => {
    setActiveProject(id)
    navigate(`/projects/${id}`)
  }

  const userInitial = settings.userName ? settings.userName[0].toUpperCase() : 'U'

  return (
    <div className="flex flex-col h-screen" style={{ background: '#060a13' }}>

      {/* ═══ TOP BAR ═══ */}
      <header
        className="flex-shrink-0 flex items-center gap-2 px-3 h-11 border-b z-50"
        style={{ background: '#080c16', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {/* Logo */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="text-[12px] font-bold text-white tracking-tight hidden lg:block">Atlas Mall Suite</span>
        </button>

        <div className="w-px h-5 bg-white/[0.06] mx-1" />

        {/* Org selector */}
        <Dropdown trigger={
          <button className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors">
            <Globe2 size={12} className="text-indigo-400" />
            <span className="max-w-[120px] truncate font-medium">{settings.companyName || 'Organisation'}</span>
            <ChevronDown size={10} className="text-gray-600" />
          </button>
        }>
          <div className="px-3 py-1.5 text-[9px] text-gray-600 uppercase tracking-wider font-semibold">Organisation</div>
          <DropdownItem icon={Globe2} label={settings.companyName || 'Praedium Tech'} active accent="#818cf8" />
          <div className="border-t border-white/[0.04] my-1" />
          <DropdownItem icon={Settings} label="Paramètres organisation" onClick={() => navigate('/settings')} />
        </Dropdown>

        <div className="w-px h-4 bg-white/[0.04]" />

        {/* Project selector */}
        <Dropdown trigger={
          <button className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors">
            <FolderOpen size={12} className="text-amber-400" />
            <span className="max-w-[160px] truncate font-medium">
              {activeProject?.name ?? 'Sélectionner un projet'}
            </span>
            <ChevronDown size={10} className="text-gray-600" />
          </button>
        }>
          <div className="px-3 py-1.5 text-[9px] text-gray-600 uppercase tracking-wider font-semibold">Projets</div>
          {projects.map((p) => (
            <DropdownItem
              key={p.id}
              icon={Building2}
              label={p.name}
              active={p.id === activeProject?.id}
              accent="#f59e0b"
              onClick={() => handleSelectProject(p.id)}
            />
          ))}
          <div className="border-t border-white/[0.04] my-1" />
          <DropdownItem icon={FolderOpen} label="Tous les projets" onClick={() => navigate('/dashboard')} />
        </Dropdown>

        <div className="w-px h-4 bg-white/[0.04]" />

        {/* Role badge */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
          <Zap size={9} />
          ADMIN
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Proph3t status */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="hidden md:inline">Proph3t</span>
        </div>

        {/* Notifications */}
        <button className="relative p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-colors">
          <Bell size={14} />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 border border-[#080c16]" />
        </button>

        {/* Settings */}
        <button
          onClick={() => navigate('/settings')}
          className={`p-1.5 rounded-lg transition-colors ${
            isSettings ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
          }`}
        >
          <Settings size={14} />
        </button>

        {/* Avatar */}
        <Dropdown align="right" trigger={
          <button className="flex items-center gap-1.5 ml-1">
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
              {userInitial}
            </div>
          </button>
        }>
          <div className="px-3 py-2 border-b border-white/[0.04]">
            <p className="text-[12px] text-white font-medium">{settings.userName || 'Utilisateur'}</p>
            <p className="text-[10px] text-gray-500">{settings.userRole || 'Administrateur'}</p>
          </div>
          <DropdownItem icon={User} label="Mon profil" onClick={() => navigate('/settings')} />
          <DropdownItem icon={HelpCircle} label="Aide" />
          <div className="border-t border-white/[0.04] my-1" />
          <DropdownItem icon={LogOut} label="Déconnexion" />
        </Dropdown>
      </header>

      {/* ═══ BODY: Sidebar + Content ═══ */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — only when inside a project */}
        {showSidebar && (
          <aside
            className="w-48 flex-shrink-0 border-r overflow-y-auto flex flex-col"
            style={{ background: '#0a0f1a', borderColor: 'rgba(255,255,255,0.05)' }}
          >
            {/* Project name */}
            <div className="px-3 py-3 border-b border-white/[0.04]">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-0.5">Projet actif</p>
              <p className="text-[12px] text-white font-medium truncate">{activeProject?.name ?? 'Aucun'}</p>
            </div>

            {/* Volumes */}
            <div className="px-2 pt-3">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold px-2 mb-1.5">Volumes</p>
              {VOLUME_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = currentVolPath === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/projects/${activeProject?.id}/${item.path}`)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all mb-0.5"
                    style={{
                      background: isActive ? `${item.color}10` : 'transparent',
                      color: isActive ? item.color : '#4a5568',
                      border: `1px solid ${isActive ? `${item.color}25` : 'transparent'}`,
                    }}
                  >
                    <Icon size={13} />
                    {item.label}
                  </button>
                )
              })}
            </div>

            {/* Transversal */}
            <div className="px-2 pt-4">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold px-2 mb-1.5">Transversal</p>
              {TRANSVERSAL_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium text-gray-600 hover:text-gray-300 hover:bg-white/[0.03] transition-colors mb-0.5"
                  >
                    <Icon size={13} />
                    {item.label}
                  </button>
                )
              })}
            </div>

            {/* Outils */}
            <div className="px-2 pt-4 mt-auto pb-3">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold px-2 mb-1.5">Outils</p>
              {TOOL_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium text-gray-600 hover:text-gray-300 hover:bg-white/[0.03] transition-colors mb-0.5"
                  >
                    <Icon size={13} style={item.color ? { color: item.color } : undefined} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
