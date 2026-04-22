// ═══ OBJECT LIBRARY PANEL — Drag-and-drop objects onto the plan ═══

import { useState } from 'react'
import type { ObjectDefinition, ObjectCategory, PlacedObject } from '../planReader/planEngineTypes'
import { usePlanEngineStore } from '../stores/planEngineStore'

// ─── OBJECT CATALOG ───────────────────────────────────────

const OBJECT_LIBRARY: ObjectDefinition[] = [
  // MOBILIER
  { id: 'bench-1', category: 'mobilier', label: 'Banc', w: 1.8, h: 0.5,
    svg: '<rect x="0" y="0.1" width="1.8" height="0.3" rx="0.1" fill="currentColor"/>' },
  { id: 'counter-1', category: 'mobilier', label: 'Comptoir', w: 3.0, h: 0.8,
    svg: '<rect width="3" height="0.8" rx="0.1" fill="currentColor"/>' },
  { id: 'shelves-1', category: 'mobilier', label: 'Rayonnage', w: 2.0, h: 0.6,
    svg: '<rect width="2" height="0.6" rx="0.05" fill="currentColor"/><line x1="0" y1="0.2" x2="2" y2="0.2" stroke="white" stroke-width="0.02"/><line x1="0" y1="0.4" x2="2" y2="0.4" stroke="white" stroke-width="0.02"/>' },
  { id: 'table-round', category: 'mobilier', label: 'Table ronde', w: 1.2, h: 1.2,
    svg: '<circle cx="0.6" cy="0.6" r="0.6" fill="currentColor"/>' },
  { id: 'chair-1', category: 'mobilier', label: 'Chaise', w: 0.5, h: 0.5,
    svg: '<rect width="0.5" height="0.45" rx="0.05" fill="currentColor"/><rect x="0" y="0.45" width="0.5" height="0.05" fill="currentColor" opacity="0.6"/>' },
  { id: 'sofa-1', category: 'mobilier', label: 'Canape', w: 2.0, h: 0.9,
    svg: '<rect width="2" height="0.9" rx="0.1" fill="currentColor"/><rect x="0.1" y="0.1" width="1.8" height="0.5" rx="0.05" fill="currentColor" opacity="0.6"/>' },
  { id: 'cashier-1', category: 'mobilier', label: 'Caisse', w: 1.2, h: 0.6,
    svg: '<rect width="1.2" height="0.6" rx="0.05" fill="currentColor"/><rect x="0.3" y="0.1" width="0.6" height="0.15" rx="0.03" fill="white" opacity="0.4"/>' },

  // SECURITE
  { id: 'camera-dome', category: 'securite', label: 'Camera dome', w: 0.3, h: 0.3,
    svg: '<circle cx="0.15" cy="0.15" r="0.15" fill="currentColor"/><circle cx="0.15" cy="0.15" r="0.06" fill="white"/>' },
  { id: 'extinguisher', category: 'securite', label: 'Extincteur', w: 0.2, h: 0.5,
    svg: '<rect x="0.05" width="0.1" height="0.5" rx="0.05" fill="currentColor"/>' },
  { id: 'detector-1', category: 'securite', label: 'Detecteur fumee', w: 0.15, h: 0.15,
    svg: '<circle cx="0.075" cy="0.075" r="0.075" fill="currentColor"/><circle cx="0.075" cy="0.075" r="0.03" fill="white" opacity="0.5"/>' },
  { id: 'exit-sign', category: 'securite', label: 'Sortie secours', w: 0.4, h: 0.2,
    svg: '<rect width="0.4" height="0.2" rx="0.02" fill="#22c55e"/><text x="0.2" y="0.13" text-anchor="middle" fill="white" font-size="0.08">EXIT</text>' },

  // SIGNALETIQUE
  { id: 'totem-3m', category: 'signaletique', label: 'Totem 3m', w: 0.6, h: 0.6,
    svg: '<rect x="0.15" y="0.15" width="0.3" height="0.3" fill="currentColor"/><rect x="0.2" y="0" width="0.2" height="0.6" fill="currentColor" opacity="0.3"/>' },
  { id: 'sign-wall', category: 'signaletique', label: 'Panneau mural', w: 1.0, h: 0.1,
    svg: '<rect width="1" height="0.1" rx="0.02" fill="currentColor"/>' },
  { id: 'borne-inter', category: 'signaletique', label: 'Borne interactive', w: 0.5, h: 0.5,
    svg: '<rect x="0.1" y="0" width="0.3" height="0.5" rx="0.05" fill="currentColor"/><rect x="0.15" y="0.05" width="0.2" height="0.15" rx="0.02" fill="white" opacity="0.5"/>' },

  // VEGETATION
  { id: 'plant-1', category: 'vegetation', label: 'Plante', w: 0.6, h: 0.6,
    svg: '<circle cx="0.3" cy="0.3" r="0.3" fill="currentColor" opacity="0.8"/>' },
  { id: 'tree-1', category: 'vegetation', label: 'Arbre', w: 1.5, h: 1.5,
    svg: '<circle cx="0.75" cy="0.75" r="0.75" fill="currentColor"/><circle cx="0.75" cy="0.75" r="0.45" fill="currentColor" opacity="0.6"/>' },
  { id: 'hedge-1', category: 'vegetation', label: 'Haie', w: 2.0, h: 0.4,
    svg: '<rect width="2" height="0.4" rx="0.2" fill="currentColor" opacity="0.8"/>' },

  // EQUIPEMENT
  { id: 'escalator', category: 'equipement', label: 'Escalator', w: 2.0, h: 1.0,
    svg: '<rect width="2" height="1" rx="0.1" fill="currentColor" opacity="0.3"/><line x1="0.3" y1="0.9" x2="1.7" y2="0.1" stroke="currentColor" stroke-width="0.08"/><line x1="0.5" y1="0.9" x2="1.9" y2="0.1" stroke="currentColor" stroke-width="0.08"/>' },
  { id: 'elevator', category: 'equipement', label: 'Ascenseur', w: 1.5, h: 1.5,
    svg: '<rect width="1.5" height="1.5" rx="0.05" fill="currentColor" opacity="0.3"/><line x1="0.75" y1="0.3" x2="0.75" y2="1.2" stroke="currentColor" stroke-width="0.08"/><polygon points="0.55,0.5 0.75,0.3 0.95,0.5" fill="currentColor"/>' },
  { id: 'fountain', category: 'equipement', label: 'Fontaine', w: 1.5, h: 1.5,
    svg: '<circle cx="0.75" cy="0.75" r="0.75" fill="currentColor" opacity="0.2"/><circle cx="0.75" cy="0.75" r="0.5" fill="currentColor" opacity="0.3"/><circle cx="0.75" cy="0.75" r="0.15" fill="currentColor"/>' },
]

const CATEGORIES: Array<{ id: ObjectCategory; label: string }> = [
  { id: 'mobilier', label: 'Mobilier' },
  { id: 'securite', label: 'Securite' },
  { id: 'signaletique', label: 'Signaletique' },
  { id: 'vegetation', label: 'Vegetation' },
  { id: 'equipement', label: 'Equipement' },
]

// ─── PANEL COMPONENT ─────────────────────────────────────

interface ObjectLibraryPanelProps {
  spaceId: string
  onClose: () => void
}

export function ObjectLibraryPanel({ spaceId, onClose }: ObjectLibraryPanelProps) {
  const [activeCategory, setActiveCategory] = useState<ObjectCategory>('mobilier')
  const addObject = usePlanEngineStore(s => s.addObject)
  const spaces = usePlanEngineStore(s => s.spaces)

  const space = spaces.find(s => s.id === spaceId)

  const filteredObjects = OBJECT_LIBRARY.filter(o => o.category === activeCategory)

  const handlePlaceObject = (def: ObjectDefinition) => {
    const obj: PlacedObject = {
      id: `obj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      spaceId,
      category: def.category,
      type: def.id,
      worldX: space?.bounds.centerX ?? 0,
      worldY: space?.bounds.centerY ?? 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      label: def.label,
      metadata: {},
    }
    addObject(obj)
  }

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-gray-900 border-l border-gray-700 z-30 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white">Bibliotheque d'objets</h3>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex px-2 py-2 gap-1 border-b border-gray-800 overflow-x-auto">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors
              ${activeCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Object grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {filteredObjects.map(def => (
            <button
              key={def.id}
              onClick={() => handlePlaceObject(def)}
              className="flex flex-col items-center gap-2 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-blue-500 transition-all"
            >
              {/* SVG preview */}
              <svg
                viewBox={`0 0 ${def.w} ${def.h}`}
                className="w-12 h-12"
                style={{ color: '#3b82f6' }}
              >
                <g dangerouslySetInnerHTML={{ __html: def.svg }} />
              </svg>
              <span className="text-xs text-gray-300">{def.label}</span>
              <span className="text-[9px] text-gray-500">{def.w}m x {def.h}m</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export { OBJECT_LIBRARY }
