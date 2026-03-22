import React, { useCallback, useState } from 'react'
import { X, Save, Trash2, Camera, DoorOpen, MapPin, Signpost } from 'lucide-react'
import type { Camera as CameraType, Door, Zone, POI, SignageItem, CameraModel, SpaceType } from '../proph3t/types'

type Entity = CameraType | Door | Zone | POI | SignageItem

interface EntityPropsPanelProps {
  entity: Entity
  entityType: string
  onUpdate: (updates: Record<string, unknown>) => void
  onDelete: () => void
  onClose: () => void
}

function isCamera(e: Entity, type: string): e is CameraType { return type === 'camera' }
function isDoor(e: Entity, type: string): e is Door { return type === 'door' }
function isPoi(e: Entity, type: string): e is POI { return type === 'poi' }

const CAMERA_MODELS: CameraModel[] = ['XNV-8080R', 'QNV-8080R', 'PTZ-P3', 'PNM-9000VQ', 'QNO-8080R', 'XNF-9300RV', 'DS-2CD2T47G2', 'IPC-HDW3849H', 'PTZ QNP-9300RWB']

export default function EntityPropsPanel({ entity, entityType, onUpdate, onDelete, onClose }: EntityPropsPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleChange = useCallback((field: string, value: unknown) => {
    onUpdate({ [field]: value })
  }, [onUpdate])

  const iconMap: Record<string, React.ReactNode> = {
    camera: <Camera className="w-4 h-4 text-blue-400" />,
    door: <DoorOpen className="w-4 h-4 text-green-400" />,
    poi: <MapPin className="w-4 h-4 text-emerald-400" />,
    signage: <Signpost className="w-4 h-4 text-amber-400" />,
  }

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          {iconMap[entityType] ?? null}
          <h3 className="text-sm font-semibold text-gray-200">
            {'label' in entity ? entity.label : entityType}
          </h3>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Common: Label */}
        {'label' in entity && (
          <div>
            <label className="text-[10px] text-gray-500 font-mono block mb-1">LABEL</label>
            <input
              type="text"
              value={entity.label}
              onChange={(e) => handleChange('label', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* Camera Properties */}
        {isCamera(entity, entityType) && (
          <>
            <div>
              <label className="text-[10px] text-gray-500 font-mono block mb-1">MODELE</label>
              <select
                value={entity.model}
                onChange={(e) => handleChange('model', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              >
                {CAMERA_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 font-mono block mb-1">ANGLE</label>
                <input
                  type="number" value={entity.angle} min={0} max={360}
                  onChange={(e) => handleChange('angle', Number(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-mono block mb-1">FOV</label>
                <input
                  type="number" value={entity.fov} min={10} max={360}
                  onChange={(e) => handleChange('fov', Number(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-mono block mb-1">PORTEE</label>
                <input
                  type="number" value={entity.rangeM} min={1} max={50}
                  onChange={(e) => handleChange('rangeM', Number(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-mono block mb-1">PRIORITE</label>
              <select
                value={entity.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              >
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="critique">Critique</option>
              </select>
            </div>
            <div className="text-xs text-gray-400">
              CAPEX: <span className="text-green-400 font-semibold">{entity.capexFcfa.toLocaleString()} FCFA</span>
            </div>
          </>
        )}

        {/* Door Properties */}
        {isDoor(entity, entityType) && (
          <>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={entity.isExit} onChange={(e) => handleChange('isExit', e.target.checked)}
                  className="rounded bg-gray-800 border-gray-600 text-green-500" />
                <span className="text-xs text-gray-300">Sortie de secours</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={entity.hasBadge} onChange={(e) => handleChange('hasBadge', e.target.checked)}
                  className="rounded bg-gray-800 border-gray-600 text-blue-500" />
                <span className="text-xs text-gray-300">Lecteur badge</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={entity.hasBiometric} onChange={(e) => handleChange('hasBiometric', e.target.checked)}
                  className="rounded bg-gray-800 border-gray-600 text-purple-500" />
                <span className="text-xs text-gray-300">Biometrie</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={entity.hasSas} onChange={(e) => handleChange('hasSas', e.target.checked)}
                  className="rounded bg-gray-800 border-gray-600 text-amber-500" />
                <span className="text-xs text-gray-300">SAS double porte</span>
              </label>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-mono block mb-1">LARGEUR (m)</label>
              <input
                type="number" value={entity.widthM} min={0.6} max={3} step={0.1}
                onChange={(e) => handleChange('widthM', Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="text-[11px] text-gray-500">
              Ref: {entity.ref} | Norme: {entity.normRef}
            </div>
          </>
        )}

        {/* POI Properties */}
        {isPoi(entity, entityType) && (
          <>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={entity.pmr} onChange={(e) => handleChange('pmr', e.target.checked)}
                className="rounded bg-gray-800 border-gray-600 text-cyan-500" />
              <span className="text-xs text-gray-300">Accessible PMR</span>
            </label>
            {entity.cosmosClubOffre !== undefined && (
              <div>
                <label className="text-[10px] text-gray-500 font-mono block mb-1">OFFRE COSMOS CLUB</label>
                <input
                  type="text" value={entity.cosmosClubOffre ?? ''}
                  onChange={(e) => handleChange('cosmosClubOffre', e.target.value || undefined)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  placeholder="Ex: -10% prochain achat"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-800">
        {showDeleteConfirm ? (
          <>
            <span className="text-xs text-red-400">Confirmer ?</span>
            <button
              onClick={() => { onDelete(); setShowDeleteConfirm(false) }}
              className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-500 transition-colors"
            >
              Supprimer
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 rounded bg-gray-800 text-gray-300 text-xs hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-gray-800 text-gray-300 text-xs hover:bg-gray-700 transition-colors"
            >
              Fermer
            </button>
          </>
        )}
      </div>
    </div>
  )
}
