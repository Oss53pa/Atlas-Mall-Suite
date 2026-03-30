// ═══ FurnitureLibrary — Panneau gauche, catalogue drag-and-drop ═══

import { useState } from 'react'
import { Search, Armchair, Users, Paintbrush } from 'lucide-react'
import { useSceneEditorStore } from '../store/sceneEditorStore'
import { FURNITURE_CATALOG, CHARACTER_CATALOG, TEXTURE_CATALOG } from '../store/furnitureCatalog'

export function FurnitureLibrary() {
  const libraryTab = useSceneEditorStore(s => s.libraryTab)
  const setLibraryTab = useSceneEditorStore(s => s.setLibraryTab)
  const librarySearch = useSceneEditorStore(s => s.librarySearch)
  const setLibrarySearch = useSceneEditorStore(s => s.setLibrarySearch)
  const libraryCategory = useSceneEditorStore(s => s.libraryCategory)
  const setLibraryCategory = useSceneEditorStore(s => s.setLibraryCategory)
  const setFloorTexture = useSceneEditorStore(s => s.setFloorTexture)
  const setWallTexture = useSceneEditorStore(s => s.setWallTexture)

  const tabs = [
    { id: 'furniture' as const, label: 'Mobilier', icon: Armchair },
    { id: 'characters' as const, label: 'Personnages', icon: Users },
    { id: 'textures' as const, label: 'Revetements', icon: Paintbrush },
  ]

  const q = librarySearch.toLowerCase()

  return (
    <div className="w-64 flex-shrink-0 border-r border-white/[0.06] bg-surface-1 flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-white/[0.06]">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setLibraryTab(t.id); setLibraryCategory(null) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors ${
              libraryTab === t.id ? 'text-white border-b-2 border-atlas-500' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={librarySearch}
            onChange={e => setLibrarySearch(e.target.value)}
            placeholder="Rechercher..."
            className="input-dark pl-8 text-[12px] py-1.5"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-3">
        {libraryTab === 'furniture' && (
          <>
            {Object.entries(FURNITURE_CATALOG).map(([key, cat]) => {
              if (libraryCategory && libraryCategory !== key) return null
              const filtered = cat.items.filter(item =>
                !q || item.name.toLowerCase().includes(q)
              )
              if (filtered.length === 0 && q) return null

              return (
                <div key={key}>
                  <button
                    onClick={() => setLibraryCategory(libraryCategory === key ? null : key)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                    <span className="text-[11px] font-semibold text-slate-300">{cat.label}</span>
                    <span className="text-[10px] text-slate-600 ml-auto">{filtered.length}</span>
                  </button>
                  {(!libraryCategory || libraryCategory === key) && (
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {filtered.map(item => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={e => {
                            e.dataTransfer.setData('text/catalog-id', item.id)
                            e.dataTransfer.setData('text/item-type', item.category === 'decoration' ? 'decoration' : 'furniture')
                          }}
                          className="rounded-lg p-2 text-center cursor-grab active:cursor-grabbing border border-white/[0.04] hover:border-white/[0.12] bg-surface-2 transition-colors"
                          title={`${item.name} (${item.w}×${item.d}×${item.h}m)`}
                        >
                          <div className="w-full aspect-square rounded bg-surface-3 flex items-center justify-center mb-1.5">
                            <Armchair size={20} style={{ color: cat.color, opacity: 0.6 }} />
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{item.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {libraryTab === 'characters' && (
          <>
            {Object.entries(CHARACTER_CATALOG).map(([key, cat]) => {
              const filtered = cat.items.filter(item =>
                !q || item.name.toLowerCase().includes(q)
              )
              if (filtered.length === 0 && q) return null

              return (
                <div key={key}>
                  <p className="text-[11px] font-semibold text-slate-300 px-2 py-1">{cat.label}</p>
                  <div className="space-y-1">
                    {filtered.map(item => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData('text/catalog-id', item.id)
                          e.dataTransfer.setData('text/item-type', 'character')
                        }}
                        className="flex items-center gap-2 rounded-lg px-2 py-2 cursor-grab active:cursor-grabbing hover:bg-white/[0.04] transition-colors"
                      >
                        <Users size={14} className="text-blue-400/60 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-300 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-600">{item.count} pers. · {item.animation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}

        {libraryTab === 'textures' && (
          <>
            {(['floor', 'wall', 'ceiling'] as const).map(type => {
              const items = TEXTURE_CATALOG.filter(t => t.type === type)
              const label = type === 'floor' ? 'Sol' : type === 'wall' ? 'Mur' : 'Plafond'
              return (
                <div key={type}>
                  <p className="text-[11px] font-semibold text-slate-300 px-2 py-1">{label}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (type === 'floor') setFloorTexture(item.texture)
                          else if (type === 'wall') setWallTexture(item.texture)
                        }}
                        className="rounded-lg p-2 text-center border border-white/[0.04] hover:border-white/[0.12] bg-surface-2 transition-colors"
                      >
                        <div className="w-full aspect-square rounded bg-surface-3 flex items-center justify-center mb-1.5">
                          <Paintbrush size={16} className="text-slate-500" />
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{item.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
