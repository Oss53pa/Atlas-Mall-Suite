// ═══ WayfinderDesignerView — UI principale du Designer (6 onglets) ═══
//
// Référence CDC §03 — Designer UI 6 onglets :
//   1. Projet  2. Charte  3. Templates  4. Canvas  5. Export  6. Déploiement
//
// Stepper non bloquant : chaque onglet accessible sans avoir complété les
// précédents. Indicateur visuel de progression. Canvas se met à jour en temps
// réel dès qu'une valeur de charte change (CDC §03 Exigence UX).

import React, { useEffect } from 'react'
import {
  FileText, Palette, LayoutGrid, MonitorPlay, Download, Server,
  Undo2, Redo2, Save, Loader2, CheckCircle,
} from 'lucide-react'
import { useDesignerStore, saveDesignerProject, startAutosave, stopAutosave } from '../store/designerStore'
import { isDesignerEnabled } from '../types'
import type { DesignerTab } from '../store/designerStore'
import { injectCssVariables, loadBrandFonts, applyDocumentDirection } from '../engines/brandEngine'

import { ProjectTab } from './tabs/ProjectTab'
import { BrandTab } from './tabs/BrandTab'
import { TemplatesTab } from './tabs/TemplatesTab'
import { CanvasTab } from './tabs/CanvasTab'
import { ExportTab } from './tabs/ExportTab'
import { DeployTab } from './tabs/DeployTab'

interface TabDef {
  id: DesignerTab
  label: string
  icon: React.ComponentType<any>
  description: string
}

const TABS: TabDef[] = [
  { id: 'project',   label: 'Projet',     icon: FileText,    description: 'Site, langues, logo' },
  { id: 'brand',     label: 'Charte',     icon: Palette,     description: 'Palette, typographie' },
  { id: 'templates', label: 'Templates',  icon: LayoutGrid,  description: 'Sélection format' },
  { id: 'canvas',    label: 'Canvas',     icon: MonitorPlay, description: 'Preview live' },
  { id: 'export',    label: 'Export',     icon: Download,    description: 'Digital + Print' },
  { id: 'deploy',    label: 'Déploiement', icon: Server,     description: 'Bornes & versions' },
]

export default function WayfinderDesignerView() {
  if (!isDesignerEnabled()) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 p-8 text-sm">
        Module Wayfinder Designer désactivé via feature flag.
      </div>
    )
  }

  const {
    activeTab, setActiveTab, config, isDirty, lastSavedAt,
    canUndo, canRedo, undo, redo,
  } = useDesignerStore()

  // Injection CSS + fonts dès qu'on entre dans le Designer
  useEffect(() => {
    injectCssVariables(config.brand, { themeMode: config.previewMode })
    void loadBrandFonts(config.brand).catch(() => {/* silencieux */})
    applyDocumentDirection(config.project.activeLocale)
  }, [config.brand, config.project.activeLocale, config.previewMode])

  // Autosave 30s
  useEffect(() => {
    startAutosave()
    return () => stopAutosave()
  }, [])

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {/* Header avec stepper + actions */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-slate-900">
        <div className="flex items-center gap-1">
          {TABS.map((t, i) => {
            const Icon = t.icon
            const isActive = activeTab === t.id
            return (
              <React.Fragment key={t.id}>
                {i > 0 && (
                  <div className="w-4 h-px bg-white/10" />
                )}
                <button
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={t.description}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive ? 'bg-white/20' : 'bg-slate-800'
                  }`}>
                    {i + 1}
                  </span>
                  <Icon size={13} />
                  {t.label}
                </button>
              </React.Fragment>
            )
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
            title="Annuler (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
            title="Rétablir (Ctrl+Shift+Z)"
          >
            <Redo2 size={14} />
          </button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <SaveButton />
          <SaveStatus isDirty={isDirty} lastSavedAt={lastSavedAt} />
        </div>
      </header>

      {/* Onglet actif */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'project' && <ProjectTab />}
        {activeTab === 'brand' && <BrandTab />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'canvas' && <CanvasTab />}
        {activeTab === 'export' && <ExportTab />}
        {activeTab === 'deploy' && <DeployTab />}
      </div>
    </div>
  )
}

function SaveButton() {
  const [saving, setSaving] = React.useState(false)
  const handleSave = async () => {
    setSaving(true)
    try {
      const r = await saveDesignerProject()
      if (!r.success) {
         
        console.warn('[Designer] save échec :', r.error)
      }
    } finally {
      setSaving(false)
    }
  }
  return (
    <button
      onClick={handleSave}
      disabled={saving}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
    >
      {saving ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
      Enregistrer
    </button>
  )
}

function SaveStatus({ isDirty, lastSavedAt }: { isDirty: boolean; lastSavedAt: string | null }) {
  if (isDirty) {
    return <span className="text-[10px] text-amber-400 ml-2">● modifications non sauvegardées</span>
  }
  if (lastSavedAt) {
    return (
      <span className="text-[10px] text-emerald-400 ml-2 flex items-center gap-1">
        <CheckCircle size={10} /> sauvegardé {timeAgo(lastSavedAt)}
      </span>
    )
  }
  return null
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'à l\'instant'
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return new Date(iso).toLocaleDateString('fr-FR')
}
