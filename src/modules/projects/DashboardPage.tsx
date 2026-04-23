// ═══ DASHBOARD PRINCIPAL — Multi-projets ═══

import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Building2,
  Calendar,
  MapPin,
  ArrowRight,
  Trash2,
  Edit3,
  LayoutGrid,
  List,
  FolderOpen,
  TrendingUp,
  X
} from 'lucide-react'
import { useProjectStore } from './projectStore'
import { PROJECT_TEMPLATES } from './templateData'
import type { Project, ProjectType, ProjectStatus } from './types'
import { COUNTRY_DEFAULTS, REGULATORY_PRESETS } from './types'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<ProjectStatus, { bg: string; text: string; label: string }> = {
  conception:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   label: 'Conception' },
  deploiement:  { bg: 'bg-amber-500/10',  text: 'text-amber-400',  label: 'Déploiement' },
  ouvert:       { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Ouvert' },
  archive:      { bg: 'bg-gray-500/10',   text: 'text-gray-400',   label: 'Archivé' },
}

const TYPE_ICONS: Record<ProjectType, string> = {
  mall: '🏬', office: '🏢', hotel: '🏨', hospital: '🏥', school: '🏫',
}

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const addProject = useProjectStore((s) => s.addProject)
  const setActiveProject = useProjectStore((s) => s.setActiveProject)
  const navigate = useNavigate()
  const [step, setStep] = useState<'template' | 'details' | 'locale'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', client: '', address: '', surface_m2: 0, opening_date: '',
    floor_count: 3,
    country: 'CI',
  })

  const countryDefaults = COUNTRY_DEFAULTS[form.country] ?? COUNTRY_DEFAULTS.CI
  const preset = REGULATORY_PRESETS[countryDefaults.preset]

  const handleCreate = () => {
    if (!form.name.trim()) { toast.error('Nom du projet requis'); return }
    const tpl = PROJECT_TEMPLATES.find((t) => t.id === selectedTemplate)
    const id = `project-${Date.now()}`
    const project: Project = {
      id,
      name: form.name,
      client: form.client,
      address: form.address,
      country: form.country,
      currency: countryDefaults.currency,
      vat_rate: countryDefaults.vat,
      locale: countryDefaults.locale,
      regulatory_refs: preset.refs,
      floor_count: form.floor_count,
      surface_m2: form.surface_m2 || 20000,
      type: tpl?.type ?? 'mall',
      opening_date: form.opening_date || '2027-01-01',
      status: 'conception',
      created_by: 'admin',
      team_members: [],
      created_at: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString().slice(0, 10),
    }
    addProject(project)
    setActiveProject(id)
    toast.success(`Projet "${form.name}" créé (${countryDefaults.currency} · TVA ${countryDefaults.vat}%)`)
    onClose()
    navigate(`/projects/${id}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-0/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-white/[0.08] overflow-hidden" style={{ background: '#262a31' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-white font-semibold text-lg">Nouveau projet</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition"><X size={18} /></button>
        </div>

        {step === 'template' ? (
          <div className="p-6">
            <p className="text-sm text-gray-400 mb-4">Choisissez un gabarit de départ</p>
            <div className="grid grid-cols-2 gap-3">
              {PROJECT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => { setSelectedTemplate(tpl.id); setStep('details') }}
                  className="text-left p-4 rounded-xl border transition-all hover:-translate-y-0.5"
                  style={{
                    background: selectedTemplate === tpl.id ? 'rgba(179,138,90,0.08)' : 'rgba(255,255,255,0.02)',
                    borderColor: selectedTemplate === tpl.id ? 'rgba(179,138,90,0.3)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{tpl.icon}</span>
                    <span className="text-white text-sm font-medium">{tpl.name}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{tpl.description}</p>
                  <div className="mt-2 text-[10px] text-gray-600">
                    {tpl.estimated_capex_per_m2_fcfa.toLocaleString('fr-FR')} FCFA/m² estimé
                  </div>
                </button>
              ))}
              <button
                onClick={() => { setSelectedTemplate(null); setStep('details') }}
                className="text-left p-4 rounded-xl border border-dashed border-white/10 hover:border-white/20 transition"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Plus size={18} className="text-gray-500" />
                  <span className="text-gray-400 text-sm font-medium">Projet vierge</span>
                </div>
                <p className="text-[11px] text-gray-600">Démarrer sans gabarit</p>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <button onClick={() => setStep('template')} className="text-xs text-gray-500 hover:text-white transition mb-2">
              ← Retour aux gabarits
            </button>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Nom du projet *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: The Mall Shopping Center"
                className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-atlas-500/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">Client</label>
                <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })}
                  placeholder="Nom du client"
                  className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-atlas-500/50" />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">Surface (m²)</label>
                <input type="number" value={form.surface_m2 || ''} onChange={(e) => setForm({ ...form, surface_m2: +e.target.value })}
                  placeholder="30000"
                  className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-atlas-500/50" />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Adresse</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Ville, Pays"
                className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-atlas-500/50" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Date d'ouverture prévue</label>
              <input type="date" value={form.opening_date} onChange={(e) => setForm({ ...form, opening_date: e.target.value })}
                className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-atlas-500/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">Nombre d'étages</label>
                <input type="number" min={1} max={20} value={form.floor_count}
                  onChange={(e) => setForm({ ...form, floor_count: +e.target.value })}
                  className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-atlas-500/50" />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">Pays</label>
                <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-atlas-500/50">
                  <option value="CI">Côte d'Ivoire</option>
                  <option value="SN">Sénégal</option>
                  <option value="BF">Burkina Faso</option>
                  <option value="ML">Mali</option>
                  <option value="FR">France</option>
                  <option value="BE">Belgique</option>
                  <option value="MA">Maroc</option>
                  <option value="DZ">Algérie</option>
                  <option value="TN">Tunisie</option>
                  <option value="US">États-Unis</option>
                  <option value="GB">Royaume-Uni</option>
                </select>
              </div>
            </div>

            {/* Résumé config locale */}
            <div className="rounded-lg border border-indigo-900/40 bg-indigo-950/20 px-3 py-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-atlas-300 font-semibold">Configuration automatique</span>
                <span className="text-atlas-400 tabular-nums">
                  {countryDefaults.currency} · TVA {countryDefaults.vat}%
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Référentiels : <strong className="text-slate-200">{preset.label}</strong> — {preset.refs.length} normes activées
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {preset.refs.map(r => (
                  <span key={r} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-300 border border-slate-700/50">
                    {r}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Annuler</button>
              <button onClick={handleCreate}
                className="px-5 py-2 text-sm font-medium rounded-lg bg-atlas-500 hover:bg-atlas-400 text-white transition">
                Créer le projet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const projects = useProjectStore((s) => s.projects)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const setActiveProject = useProjectStore((s) => s.setActiveProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all')
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid')
  const [showNewProject, setShowNewProject] = useState(false)

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false
      if (search) {
        const q = search.toLowerCase()
        return p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
      }
      return true
    })
  }, [projects, search, filterStatus])

  const stats = useMemo(() => ({
    total: projects.length,
    conception: projects.filter((p) => p.status === 'conception').length,
    deploiement: projects.filter((p) => p.status === 'deploiement').length,
    ouvert: projects.filter((p) => p.status === 'ouvert').length,
    totalSurface: projects.reduce((a, p) => a + p.surface_m2, 0),
  }), [projects])

  const handleOpenProject = (project: Project) => {
    setActiveProject(project.id)
    // Route générique multi-projets (The Mall est un projet comme un autre)
    navigate(`/projects/${project.id}`)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (id === 'cosmos-angre') { toast.error('Le projet de démonstration ne peut pas être supprimé'); return }
    deleteProject(id)
    toast.success('Projet supprimé')
  }

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#1a1d23', color: '#e2e8f0' }}>
      {/* Hero bandeau : positionnement plateforme */}
      <div className="border-b border-white/[0.06]" style={{
        background: 'linear-gradient(135deg, rgba(179,138,90,0.08) 0%, rgba(179,138,90,0.06) 50%, transparent 100%)',
      }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] tracking-widest uppercase text-atlas-300 font-bold">
                  Atlas BIM
                </span>
                <span className="text-[10px] text-slate-500">·</span>
                <span className="text-[10px] text-slate-500">
                  Plateforme multi-projets pour centres commerciaux
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight m-0">
                Mes projets
              </h1>
              <p className="text-sm text-slate-400 mt-2 max-w-2xl">
                Ouvrez un projet pour accéder à ses volumes (Plan commercial, Sécurité, Parcours client, Wayfinder).
                Chaque projet est isolé et configurable.
              </p>
            </div>
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:-translate-y-0.5 shadow-lg shadow-bronze/30"
              style={{ background: 'linear-gradient(135deg, #b38a5a, #a77d4c)' }}
            >
              <Plus size={18} />
              Nouveau projet
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b border-white/[0.06]" style={{ background: '#0a0f1a' }}>
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {stats.total} projet{stats.total > 1 ? 's' : ''} · {(stats.totalSurface / 1000).toFixed(0)}k m² cumulés
              </p>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Total', value: stats.total, icon: FolderOpen, color: '#a77d4c' },
              { label: 'Conception', value: stats.conception, icon: Edit3, color: '#3b82f6' },
              { label: 'Déploiement', value: stats.deploiement, icon: TrendingUp, color: '#f59e0b' },
              { label: 'Ouverts', value: stats.ouvert, icon: Building2, color: '#22c55e' },
              { label: 'Surface totale', value: `${(stats.totalSurface / 1000).toFixed(0)}k m²`, icon: MapPin, color: '#ec4899' },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-xl p-3.5 border border-white/[0.06]" style={{ background: '#262a31' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} style={{ color: stat.color }} />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{stat.label}</span>
                  </div>
                  <span className="text-xl font-semibold text-white">{stat.value}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un projet..."
            className="w-full bg-[#262a31] text-white text-sm rounded-lg pl-9 pr-3 py-2 border border-white/[0.08] outline-none focus:border-atlas-500/40 placeholder:text-gray-600"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] p-0.5" style={{ background: '#262a31' }}>
          {(['all', 'conception', 'deploiement', 'ouvert', 'archive'] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filterStatus === s ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {s === 'all' ? 'Tous' : STATUS_COLORS[s].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.08] p-0.5 ml-auto" style={{ background: '#262a31' }}>
          <button onClick={() => setViewType('grid')} className={`p-1.5 rounded ${viewType === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500'}`}><LayoutGrid size={14} /></button>
          <button onClick={() => setViewType('list')} className={`p-1.5 rounded ${viewType === 'list' ? 'bg-white/10 text-white' : 'text-gray-500'}`}><List size={14} /></button>
        </div>
      </div>

      {/* Projects grid/list */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen size={40} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Aucun projet trouvé</p>
            <button onClick={() => setShowNewProject(true)} className="mt-3 text-atlas-400 text-sm hover:text-atlas-300 transition">
              + Créer un projet
            </button>
          </div>
        ) : viewType === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => {
              const status = STATUS_COLORS[project.status]
              const isActive = project.id === activeProjectId
              return (
                <div
                  key={project.id}
                  onClick={() => handleOpenProject(project)}
                  className="group relative cursor-pointer rounded-xl p-5 border transition-all hover:-translate-y-0.5"
                  style={{
                    background: isActive ? 'rgba(179,138,90,0.05)' : '#262a31',
                    borderColor: isActive ? 'rgba(179,138,90,0.2)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {project.id === 'cosmos-angre' && (
                      <div className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5">
                        <span className="text-[9px] font-semibold text-emerald-400 tracking-wide">PILOTE</span>
                      </div>
                    )}
                    {isActive && (
                      <div className="flex items-center gap-1 rounded-full bg-atlas-400/15 border border-atlas-500/25 px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        <span className="text-[9px] font-semibold text-atlas-400 tracking-wide">ACTIF</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{TYPE_ICONS[project.type]}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm truncate">{project.name}</h3>
                      <p className="text-gray-500 text-[11px] truncate">{project.client}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`${status.bg} ${status.text} text-[10px] font-medium px-2 py-0.5 rounded-full`}>
                      {status.label}
                    </span>
                    <span className="text-[10px] text-gray-600">{project.surface_m2.toLocaleString('fr-FR')} m²</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-3">
                    <MapPin size={11} />
                    <span className="truncate">{project.address}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                    <Calendar size={11} />
                    <span>Ouverture : {new Date(project.opening_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3">
                    <button className="flex items-center gap-1.5 text-[12px] font-medium text-atlas-400 hover:text-atlas-300 transition group-hover:gap-2">
                      Ouvrir <ArrowRight size={12} />
                    </button>
                    {project.id !== 'cosmos-angre' && (
                      <button onClick={(e) => handleDelete(e, project.id)} className="text-gray-600 hover:text-red-400 transition p-1">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((project) => {
              const status = STATUS_COLORS[project.status]
              const isActive = project.id === activeProjectId
              return (
                <div
                  key={project.id}
                  onClick={() => handleOpenProject(project)}
                  className="group cursor-pointer rounded-xl p-4 border flex items-center gap-4 transition-all hover:border-white/10"
                  style={{
                    background: isActive ? 'rgba(179,138,90,0.05)' : '#262a31',
                    borderColor: isActive ? 'rgba(179,138,90,0.2)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <span className="text-xl">{TYPE_ICONS[project.type]}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-medium text-sm">{project.name}</span>
                    <span className="text-gray-600 text-[11px] ml-3">{project.client}</span>
                  </div>
                  <span className="text-gray-500 text-[11px]">{project.address}</span>
                  <span className={`${status.bg} ${status.text} text-[10px] font-medium px-2 py-0.5 rounded-full`}>{status.label}</span>
                  <span className="text-gray-600 text-[11px]">{project.surface_m2.toLocaleString('fr-FR')} m²</span>
                  {isActive && (
                    <span className="text-[9px] font-bold text-atlas-400 tracking-wider">ACTIF</span>
                  )}
                  <ArrowRight size={14} className="text-gray-600 group-hover:text-white transition" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} />}
    </div>
  )
}
