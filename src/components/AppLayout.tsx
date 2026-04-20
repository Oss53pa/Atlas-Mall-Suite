// ═══ APP LAYOUT — Sidebar permanente + Content ═══

import React, { useState, useRef, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Sparkles, Settings, Bell, ChevronDown, User, LogOut,
  Building2, FolderOpen, ShieldCheck, Route, Box,
  FileText, BarChart2, MessageSquare, Layers, Scale,
  ClipboardList, Globe2, Zap, HelpCircle, LayoutDashboard,
  ChevronRight,
} from 'lucide-react'
import { useProjectStore } from '../modules/projects/projectStore'
import { useSettingsStore } from '../modules/projects/settingsStore'
import { useAppStore } from '../stores/appStore'

// ── Dropdown ──
function Dropdown({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className="absolute left-full top-0 ml-2 min-w-[220px] rounded-xl border border-white/[0.08] py-1 z-[100] shadow-2xl"
          style={{ background: '#0e1629' }} onClick={() => setOpen(false)}>{children}</div>
      )}
    </div>
  )
}

function DropItem({ icon: Icon, label, active, accent, onClick }: {
  icon?: React.ComponentType<any>; label: string; active?: boolean; accent?: string; onClick?: () => void
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors ${
        active ? 'text-white bg-white/[0.06]' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}`}>
      {Icon && <Icon size={14} style={accent ? { color: accent } : undefined} />}
      <span className="truncate">{label}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
    </button>
  )
}

// ── Nav items ──
const VOLUME_ITEMS = [
  { id: 'vol1', label: 'Plan Commercial', icon: Building2, color: '#f59e0b', path: 'vol1' },
  { id: 'vol2', label: 'Plan Sécurité', icon: ShieldCheck, color: '#38bdf8', path: 'vol2' },
  { id: 'vol3', label: 'Parcours Client', icon: Route, color: '#34d399', path: 'vol3' },
]

const TRANSVERSAL_ITEMS = [
  { id: 'scenarios', label: 'Scénarios', icon: Layers, path: '/scenarios' },
  { id: 'validation', label: 'Validation Exco', icon: ClipboardList, path: '/validation' },
  { id: 'dce', label: 'DCE / AO', icon: FileText, path: '/dce' },
  { id: 'benchmark', label: 'Benchmark', icon: BarChart2, path: '/benchmark' },
]

const TOOL_ITEMS = [
  { id: 'tour', label: 'Visite & Plan 3D', icon: Box, color: '#38bdf8', path: '/virtual-tour' },
  { id: 'ai', label: 'PROPH3T AI', icon: Sparkles, color: '#a855f7', path: '/proph3t' },
  { id: 'export', label: 'Export / Rapports', icon: FileText, path: '/export' },
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

  // Transversal/Tools pages
  const isTransversalOrTool = ['/scenarios','/validation','/dce','/benchmark','/proph3t','/export','/virtual-tour'].includes(location.pathname)

  // When inside a volume, volumes have their own internal sidebar — collapse ours to icon rail
  const isInsideVolume = currentVolPath !== null && !isTransversalOrTool

  const appActiveOrg = useAppStore((s) => s.activeOrg)
  const appUserOrgs = useAppStore((s) => s.userOrgs)
  const appSetActiveOrg = useAppStore((s) => s.setActiveOrg)
  const appSetActiveProject = useAppStore((s) => s.setActiveProject)
  const appUserProjects = useAppStore((s) => s.userProjects)
  const appActiveRole = useAppStore((s) => s.activeRole)

  const handleSelectProject = (id: string) => {
    setActiveProject(id)
    // Also update AppStore so vol stores re-hydrate with the right project
    const appProject = appUserProjects.find((p) => p.id === id)
    if (appProject) appSetActiveProject(appProject)
    navigate(`/projects/${id}`)
  }

  const userInitial = settings.userName ? settings.userName[0].toUpperCase() : 'U'

  return (
    <div className="flex h-screen" style={{ background: '#060a13' }}>

      {/* ═══ SIDEBAR PERMANENTE ═══ */}
      <aside
        className={`flex-shrink-0 flex flex-col border-r overflow-y-auto overflow-x-hidden transition-all duration-200 ${
          isInsideVolume ? 'w-12' : 'w-52'
        }`}
        style={{ background: '#080c16', borderColor: 'rgba(255,255,255,0.05)' }}
      >
        {/* Name as logo → landing page */}
        <button onClick={() => navigate('/')}
          className="flex items-center px-3 py-3 hover:opacity-80 transition-opacity flex-shrink-0 border-b border-white/[0.04]"
          title="Page d'accueil">
          {!isInsideVolume ? (
            <span className="text-[15px] text-white tracking-wide" style={{ fontFamily: "'Grand Hotel', cursive" }}>Atlas Mall Suite</span>
          ) : (
            <span className="text-[13px] text-white" style={{ fontFamily: "'Grand Hotel', cursive" }}>A</span>
          )}
        </button>

        {/* Org selector */}
        {!isInsideVolume && (
          <div className="px-2 pt-3 pb-1">
            <Dropdown trigger={
              <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors">
                <Globe2 size={13} className="text-indigo-400 flex-shrink-0" />
                <span className="truncate flex-1 text-left font-medium">{appActiveOrg?.name || settings.companyName || 'Organisation'}</span>
                <ChevronDown size={10} className="text-gray-600 flex-shrink-0" />
              </button>
            }>
              <div className="px-3 py-1.5 text-[9px] text-gray-600 uppercase tracking-wider font-semibold">Organisation</div>
              {appUserOrgs.map((org) => (
                <DropItem
                  key={org.id}
                  icon={Globe2}
                  label={org.name}
                  active={appActiveOrg?.id === org.id}
                  accent="#818cf8"
                  onClick={() => appSetActiveOrg(org)}
                />
              ))}
              {appUserOrgs.length === 0 && (
                <DropItem icon={Globe2} label={settings.companyName || 'New Heaven SA'} active accent="#818cf8" />
              )}
              <div className="border-t border-white/[0.04] my-1" />
              <DropItem icon={Settings} label="Parametres org" onClick={() => navigate('/settings')} />
            </Dropdown>
          </div>
        )}

        {/* Project selector */}
        {!isInsideVolume && (
          <div className="px-2 pb-2">
            <Dropdown trigger={
              <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors">
                <FolderOpen size={13} className="text-amber-400 flex-shrink-0" />
                <span className="truncate flex-1 text-left font-medium">{activeProject?.name ?? 'Projet'}</span>
                <ChevronDown size={10} className="text-gray-600 flex-shrink-0" />
              </button>
            }>
              <div className="px-3 py-1.5 text-[9px] text-gray-600 uppercase tracking-wider font-semibold">Projets</div>
              {projects.map(p => (
                <DropItem key={p.id} icon={Building2} label={p.name} active={p.id === activeProject?.id}
                  accent="#f59e0b" onClick={() => handleSelectProject(p.id)} />
              ))}
              <div className="border-t border-white/[0.04] my-1" />
              <DropItem icon={FolderOpen} label="Tous les projets" onClick={() => navigate('/dashboard')} />
            </Dropdown>
          </div>
        )}

        {/* Role badge */}
        {!isInsideVolume && (
          <div className="px-3 pb-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-semibold tracking-wider w-fit"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
              <Zap size={9} /> ADMIN
            </div>
          </div>
        )}

        {/* Navigation */}
        {!isInsideVolume && (
          <>
            {/* Dashboard */}
            <div className="px-2 pt-3">
              <button onClick={() => navigate('/dashboard')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all mb-1 ${
                  isHome ? 'bg-white/[0.06] text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'}`}>
                <LayoutDashboard size={13} /> Mes projets
              </button>
            </div>

            {/* Volumes — UNIQUEMENT hors projet (sinon la sidebar projet affiche déjà tout) */}
            {!isInProject && (
              <div className="px-2 pt-3">
                <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold px-2 mb-1.5">
                  Volumes (projet actif)
                </p>
                {VOLUME_ITEMS.map(item => {
                  const Icon = item.icon
                  const isActive = currentVolPath === item.id
                  return (
                    <button key={item.id}
                      onClick={() => navigate(`/projects/${activeProject?.id}/${item.path}`)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all mb-0.5"
                      style={{
                        background: isActive ? `${item.color}10` : 'transparent',
                        color: isActive ? item.color : '#4a5568',
                        border: `1px solid ${isActive ? `${item.color}25` : 'transparent'}`,
                      }}>
                      <Icon size={13} /> {item.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Transversal */}
            <div className="px-2 pt-4">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold px-2 mb-1.5">Transversal</p>
              {TRANSVERSAL_ITEMS.map(item => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <button key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors mb-0.5 ${
                      isActive ? 'bg-white/[0.06] text-white' : 'text-gray-600 hover:text-gray-300 hover:bg-white/[0.03]'}`}>
                    <Icon size={13} className={isActive ? 'text-indigo-400' : ''} /> {item.label}
                  </button>
                )
              })}
            </div>

            {/* Outils */}
            <div className="px-2 pt-4">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold px-2 mb-1.5">Outils</p>
              {TOOL_ITEMS.map(item => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <button key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors mb-0.5 ${
                      isActive ? 'bg-white/[0.06] text-white' : 'text-gray-600 hover:text-gray-300 hover:bg-white/[0.03]'}`}>
                    <Icon size={13} style={item.color ? { color: item.color } : undefined} className={isActive && !item.color ? 'text-indigo-400' : ''} /> {item.label}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Collapsed mode: icon-only nav */}
        {isInsideVolume && (
          <div className="flex flex-col items-center gap-1 pt-3 px-1">
            <button onClick={() => navigate('/dashboard')} title="Mes projets"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors">
              <LayoutDashboard size={15} />
            </button>
            <div className="w-5 border-t border-white/[0.06] my-1" />
            {VOLUME_ITEMS.map(item => {
              const Icon = item.icon
              const isActive = currentVolPath === item.id
              return (
                <button key={item.id} title={item.label}
                  onClick={() => navigate(`/projects/${activeProject?.id}/${item.path}`)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    background: isActive ? `${item.color}15` : 'transparent',
                    color: isActive ? item.color : '#4a5568',
                  }}>
                  <Icon size={15} />
                </button>
              )
            })}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom: Proph3t + Settings + User */}
        <div className={`border-t border-white/[0.04] ${isInsideVolume ? 'px-1 py-2 flex flex-col items-center gap-1' : 'p-2 space-y-1'}`}>
          {/* Proph3t status */}
          {!isInsideVolume ? (
            <div className="flex items-center gap-2 px-2 py-1 text-[10px] text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse flex-shrink-0" />
              Proph3t Engine
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" title="Proph3t Engine">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            </div>
          )}

          {/* Notifications */}
          <button title="Notifications"
            className={`relative ${isInsideVolume ? 'w-8 h-8 rounded-lg flex items-center justify-center' : 'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg'} text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-colors`}>
            <Bell size={14} />
            {!isInsideVolume && <span className="text-[11px]">Notifications</span>}
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-[#080c16]" />
          </button>

          {/* Settings */}
          <button onClick={() => navigate('/settings')} title="Paramètres"
            className={`${isInsideVolume ? 'w-8 h-8 rounded-lg flex items-center justify-center' : 'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg'} transition-colors ${
              isSettings ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'}`}>
            <Settings size={14} />
            {!isInsideVolume && <span className="text-[11px]">Paramètres</span>}
          </button>

          {/* User */}
          <div className={`${isInsideVolume ? 'pt-1' : 'flex items-center gap-2 px-2 py-2 mt-1 rounded-lg border border-white/[0.04]'}`}>
            <div className={`${isInsideVolume ? 'w-7 h-7 mx-auto' : 'w-7 h-7'} rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>
              {userInitial}
            </div>
            {!isInsideVolume && (
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white font-medium truncate">{settings.userName || 'Utilisateur'}</p>
                <p className="text-[9px] text-gray-600 truncate">{appActiveRole ?? settings.userRole ?? 'Administrateur'}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
