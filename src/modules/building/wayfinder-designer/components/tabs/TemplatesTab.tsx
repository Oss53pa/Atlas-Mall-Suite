// ═══ Onglet 3 — Templates ═══
// Galerie avec preview live, filtre format (digital / print), sélection + duplication.

import { useState } from 'react'
import { LayoutGrid, Filter, Check } from 'lucide-react'
import { useDesignerStore, switchTemplate } from '../../store/designerStore'
import { getGalleryGroups } from '../../templates/registry'
import type { TemplateMetadata } from '../../types'

type FilterKind = 'all' | 'digital' | 'print'

export function TemplatesTab() {
  const { config } = useDesignerStore()
  const [filter, setFilter] = useState<FilterKind>('all')

  const groups = getGalleryGroups()
  const visibleGroups = filter === 'all' ? groups : groups.filter(g => g.key === filter)

  return (
    <div className="overflow-y-auto p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="text-atlas-400" size={16} />
          <h2 className="text-sm font-semibold text-white">Galerie de templates</h2>
        </div>
        <div className="flex items-center gap-1 bg-surface-1 rounded p-0.5">
          <Filter size={11} className="text-slate-500 ml-2" />
          {(['all', 'digital', 'print'] as FilterKind[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-[11px] ${filter === f ? 'bg-atlas-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {f === 'all' ? 'Tous' : f === 'digital' ? 'Digital' : 'Print'}
            </button>
          ))}
        </div>
      </header>

      {visibleGroups.map(group => (
        <section key={group.key} className="mb-8">
          <h3 className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-3">
            {group.label} · {group.items.length}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {group.items.map(meta => (
              <TemplateCard
                key={meta.id}
                meta={meta}
                selected={config.templateId === meta.id}
                onSelect={() => switchTemplate(meta.id, meta.format)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function TemplateCard({
  meta, selected, onSelect,
}: { meta: TemplateMetadata; selected: boolean; onSelect: () => void }) {
  const w = meta.dimensions.width
  const h = meta.dimensions.height
  const unit = meta.dimensions.unit

  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-lg border-2 overflow-hidden transition-all ${
        selected ? 'border-atlas-500 ring-2 ring-indigo-500/30' : 'border-white/10 hover:border-white/30'
      }`}
    >
      {/* Aperçu mini avec ratio */}
      <div className="aspect-video bg-surface-1 flex items-center justify-center p-4 relative">
        <div
          className="bg-white border border-slate-300 shadow-lg"
          style={{
            aspectRatio: `${w} / ${h}`,
            maxWidth: '90%',
            maxHeight: '90%',
            width: 'auto',
            height: meta.aspectRatio < 1 ? '90%' : 'auto',
          }}
        >
          <div className="w-full h-full flex flex-col">
            <div className="h-2 bg-atlas-500" />
            <div className="flex-1 flex items-center justify-center text-slate-300 text-[8px]">
              {meta.format}
            </div>
          </div>
        </div>
        {selected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-atlas-500 flex items-center justify-center">
            <Check className="text-white" size={14} />
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="p-3 bg-surface-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-[12px] font-semibold text-white truncate flex-1">{meta.label}</h4>
          <code className="text-[8px] text-slate-600 font-mono uppercase flex-shrink-0">
            {meta.kind.split('-')[0]}
          </code>
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{meta.description}</p>
        <div className="text-[9px] text-slate-600 mt-1.5 flex items-center gap-2">
          <span>{w} × {h} {unit}</span>
          {meta.bleed > 0 && <span>· Bleed {meta.bleed} mm</span>}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {meta.tags.slice(0, 3).map(t => (
            <span key={t} className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{t}</span>
          ))}
        </div>
      </div>
    </button>
  )
}
