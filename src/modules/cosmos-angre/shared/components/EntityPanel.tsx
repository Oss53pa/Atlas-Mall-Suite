import React, { useState } from 'react'
import { X, Trash2, Camera as CamIcon, DoorOpen, MapPin, ArrowUpDown } from 'lucide-react'
import type { Camera, Door, Zone, TransitionNode, CameraModel, SpaceType } from '../proph3t/types'

type EntityType = 'camera' | 'door' | 'zone' | 'transition'

interface EntityPanelProps {
  entity: Camera | Door | Zone | TransitionNode
  entityType: EntityType
  onClose: () => void
  onDelete?: (id: string) => void
  onUpdate?: (id: string, updates: Record<string, unknown>) => void
}

const CAMERA_MODELS: CameraModel[] = ['XNV-8080R', 'QNV-8080R', 'PTZ-P3', 'PNM-9000VQ', 'QNO-8080R', 'XNF-9300RV', 'DS-2CD2T47G2', 'IPC-HDW3849H', 'PTZ QNP-9300RWB']
const ZONE_TYPES: SpaceType[] = ['parking', 'commerce', 'restauration', 'circulation', 'technique', 'backoffice', 'financier', 'sortie_secours', 'loisirs', 'services', 'hotel', 'bureaux', 'exterieur']

function EditField({ label, value, onChange, type = 'text', min, max, step, options }: {
  label: string; value: string | number | boolean
  onChange: (v: string | number | boolean) => void
  type?: 'text' | 'number' | 'select' | 'checkbox'
  min?: number; max?: number; step?: number
  options?: { value: string; label: string }[]
}) {
  if (type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 bg-gray-800/80 rounded px-2.5 py-2 cursor-pointer hover:bg-gray-800">
        <input
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 w-3.5 h-3.5"
        />
        <span className="text-[11px] text-gray-300">{label}</span>
      </label>
    )
  }
  if (type === 'select' && options) {
    return (
      <div className="bg-gray-800/80 rounded px-2.5 py-1.5">
        <div className="text-gray-500 text-[10px] mb-0.5">{label}</div>
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-700 border-none rounded text-[11px] text-gray-200 py-0.5 px-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    )
  }
  return (
    <div className="bg-gray-800/80 rounded px-2.5 py-1.5">
      <div className="text-gray-500 text-[10px] mb-0.5">{label}</div>
      <input
        type={type}
        value={value as string | number}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        min={min} max={max} step={step}
        className="w-full bg-gray-700 border-none rounded text-[11px] text-gray-200 py-0.5 px-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}

function CameraPanel({ cam, onClose, onDelete, onUpdate }: {
  cam: Camera; onClose: () => void; onDelete?: (id: string) => void; onUpdate?: (id: string, u: Record<string, unknown>) => void
}) {
  return (
    <div className="p-3 space-y-3 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CamIcon className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">Camera</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
      </div>
      <EditField label="Nom" value={cam.label} onChange={(v) => onUpdate?.(cam.id, { label: v })} />
      <EditField label="Modele" value={cam.model} type="select" onChange={(v) => onUpdate?.(cam.id, { model: v })}
        options={CAMERA_MODELS.map(m => ({ value: m, label: m }))} />
      <div className="grid grid-cols-3 gap-1.5">
        <EditField label="Angle" value={cam.angle} type="number" min={0} max={360} onChange={(v) => onUpdate?.(cam.id, { angle: v })} />
        <EditField label="FOV" value={cam.fov} type="number" min={10} max={360} onChange={(v) => onUpdate?.(cam.id, { fov: v })} />
        <EditField label="Portee" value={cam.rangeM} type="number" min={1} max={50} onChange={(v) => onUpdate?.(cam.id, { rangeM: v })} />
      </div>
      <EditField label="Priorite" value={cam.priority} type="select" onChange={(v) => onUpdate?.(cam.id, { priority: v })}
        options={[{ value: 'normale', label: 'Normale' }, { value: 'haute', label: 'Haute' }, { value: 'critique', label: 'Critique' }]} />
      <div className="bg-gray-800/80 rounded px-2.5 py-2">
        <span className="text-[10px] text-gray-500">CAPEX</span>
        <span className="text-xs text-green-400 font-semibold ml-2">{cam.capexFcfa.toLocaleString('fr-FR')} FCFA</span>
      </div>
      {onDelete && (
        <button onClick={() => onDelete(cam.id)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs bg-red-900/30 border border-red-700/40 text-red-400 hover:bg-red-900/50 transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Supprimer cette camera
        </button>
      )}
    </div>
  )
}

function DoorPanel({ door, onClose, onDelete, onUpdate }: {
  door: Door; onClose: () => void; onDelete?: (id: string) => void; onUpdate?: (id: string, u: Record<string, unknown>) => void
}) {
  return (
    <div className="p-3 space-y-3 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DoorOpen className="w-4 h-4 text-green-400" />
          <span className="text-sm font-semibold text-white">Acces</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
      </div>
      <EditField label="Nom" value={door.label} onChange={(v) => onUpdate?.(door.id, { label: v })} />
      <EditField label="Largeur (m)" value={door.widthM} type="number" min={0.6} max={3} step={0.1} onChange={(v) => onUpdate?.(door.id, { widthM: v })} />
      <EditField label="Reference" value={door.ref} onChange={(v) => onUpdate?.(door.id, { ref: v })} />
      <div className="space-y-1">
        <EditField label="Sortie de secours" value={door.isExit} type="checkbox" onChange={(v) => onUpdate?.(door.id, { isExit: v })} />
        <EditField label="Lecteur badge" value={door.hasBadge} type="checkbox" onChange={(v) => onUpdate?.(door.id, { hasBadge: v })} />
        <EditField label="Biometrie" value={door.hasBiometric} type="checkbox" onChange={(v) => onUpdate?.(door.id, { hasBiometric: v })} />
        <EditField label="SAS double porte" value={door.hasSas} type="checkbox" onChange={(v) => onUpdate?.(door.id, { hasSas: v })} />
      </div>
      {onDelete && (
        <button onClick={() => onDelete(door.id)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs bg-red-900/30 border border-red-700/40 text-red-400 hover:bg-red-900/50 transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Supprimer
        </button>
      )}
    </div>
  )
}

function ZonePanel({ zone, onClose, onDelete, onUpdate }: {
  zone: Zone; onClose: () => void; onDelete?: (id: string) => void; onUpdate?: (id: string, u: Record<string, unknown>) => void
}) {
  return (
    <div className="p-3 space-y-3 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Zone</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
      </div>
      <EditField label="Nom" value={zone.label} onChange={(v) => onUpdate?.(zone.id, { label: v })} />
      <EditField label="Type" value={zone.type} type="select" onChange={(v) => onUpdate?.(zone.id, { type: v })}
        options={ZONE_TYPES.map(t => ({ value: t, label: t }))} />
      <EditField label="Criticite (1-5)" value={zone.niveau} type="number" min={1} max={5} onChange={(v) => onUpdate?.(zone.id, { niveau: v })} />
      <div className="grid grid-cols-2 gap-1.5">
        <EditField label="Largeur" value={zone.w} type="number" min={1} onChange={(v) => onUpdate?.(zone.id, { w: v })} />
        <EditField label="Hauteur" value={zone.h} type="number" min={1} onChange={(v) => onUpdate?.(zone.id, { h: v })} />
      </div>
      {onDelete && (
        <button onClick={() => onDelete(zone.id)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs bg-red-900/30 border border-red-700/40 text-red-400 hover:bg-red-900/50 transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Supprimer cette zone
        </button>
      )}
    </div>
  )
}

function TransitionPanel({ tr, onClose }: { tr: TransitionNode; onClose: () => void }) {
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-atlas-400" />
          <span className="text-sm font-semibold text-white">{tr.label}</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-800/80 rounded px-2.5 py-1.5">
          <div className="text-gray-500 text-[10px]">Type</div>
          <div className="text-[11px] text-gray-200">{tr.type.replace(/_/g, ' ')}</div>
        </div>
        <div className="bg-gray-800/80 rounded px-2.5 py-1.5">
          <div className="text-gray-500 text-[10px]">Trajet</div>
          <div className="text-[11px] text-gray-200">{tr.fromFloor} → {tr.toFloor}</div>
        </div>
        <div className="bg-gray-800/80 rounded px-2.5 py-1.5">
          <div className="text-gray-500 text-[10px]">Capacite</div>
          <div className="text-[11px] text-gray-200">{tr.capacityPerMin}/min</div>
        </div>
        <div className="bg-gray-800/80 rounded px-2.5 py-1.5">
          <div className="text-gray-500 text-[10px]">PMR</div>
          <div className={`text-[11px] ${tr.pmr ? 'text-blue-400' : 'text-gray-500'}`}>{tr.pmr ? 'Oui' : 'Non'}</div>
        </div>
      </div>
    </div>
  )
}

export default function EntityPanel({ entity, entityType, onClose, onDelete, onUpdate }: EntityPanelProps) {
  switch (entityType) {
    case 'camera':
      return <CameraPanel cam={entity as Camera} onClose={onClose} onDelete={onDelete} onUpdate={onUpdate} />
    case 'zone':
      return <ZonePanel zone={entity as Zone} onClose={onClose} onDelete={onDelete} onUpdate={onUpdate} />
    case 'door':
      return <DoorPanel door={entity as Door} onClose={onClose} onDelete={onDelete} onUpdate={onUpdate} />
    case 'transition':
      return <TransitionPanel tr={entity as TransitionNode} onClose={onClose} />
    default:
      return null
  }
}
