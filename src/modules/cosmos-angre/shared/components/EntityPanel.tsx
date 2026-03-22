import { X, Trash2, AlertTriangle } from 'lucide-react'
import type { Camera, Door, Zone, TransitionNode } from '../proph3t/types'

type EntityType = 'camera' | 'door' | 'zone' | 'transition'

interface EntityPanelProps {
  entity: Camera | Door | Zone | TransitionNode
  entityType: EntityType
  onClose: () => void
  onDelete?: (id: string) => void
}

function Field({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-gray-800 rounded px-2 py-1.5">
      <div className="text-gray-500 text-[10px]">{label}</div>
      <div className={`text-[11px] ${color || 'text-gray-200'}`}>{value}</div>
    </div>
  )
}

function CameraPanel({ cam, onClose, onDelete }: { cam: Camera; onClose: () => void; onDelete?: (id: string) => void }) {
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: cam.color }} />
          <span className="text-sm font-medium text-white">{cam.label}</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Modele" value={cam.model} />
        <Field label="FOV" value={`${cam.fov}°`} />
        <Field label="Portee" value={`${cam.rangeM}m`} />
        <Field
          label="Priorite"
          value={cam.priority}
          color={cam.priority === 'critique' ? 'text-red-400' : cam.priority === 'haute' ? 'text-orange-400' : 'text-green-400'}
        />
        <Field label="Angle" value={`${cam.angle}°`} />
        <Field label="CAPEX" value={`${cam.capexFcfa.toLocaleString('fr-FR')} FCFA`} />
      </div>
      {cam.coverageScore !== undefined && (
        <div className="bg-gray-800 rounded px-2 py-1.5 text-[10px]">
          <div className="text-gray-500">Score couverture</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${cam.coverageScore}%` }} />
            </div>
            <span className="text-blue-400 font-mono">{cam.coverageScore}%</span>
          </div>
        </div>
      )}
      {onDelete && (
        <button
          onClick={() => onDelete(cam.id)}
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded text-[10px] bg-red-900/30 border border-red-700/40 text-red-400 hover:bg-red-900/50"
        >
          <Trash2 className="w-3 h-3" /> Supprimer
        </button>
      )}
    </div>
  )
}

function ZonePanel({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{zone.label}</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type" value={zone.type} />
        <Field
          label="Criticite"
          value={`Niveau ${zone.niveau}/5`}
          color={zone.niveau >= 4 ? 'text-red-400' : zone.niveau >= 3 ? 'text-orange-400' : 'text-green-400'}
        />
        <Field label="Surface" value={`${zone.surfaceM2 || 0} m²`} />
        <Field label="Position" value={`${zone.x}, ${zone.y}`} />
      </div>
    </div>
  )
}

function DoorPanel({ door, onClose }: { door: Door; onClose: () => void }) {
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{door.label}</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type zone" value={door.zoneType} />
        <Field label="Largeur" value={`${door.widthM}m`} />
        <Field label="Ref" value={door.ref} />
        <Field label="CAPEX" value={`${door.capexFcfa.toLocaleString('fr-FR')} FCFA`} />
      </div>
      <div className="flex flex-wrap gap-1">
        {door.isExit && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-900/50 text-green-400 border border-green-700/30">SORTIE</span>}
        {door.hasBadge && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400 border border-blue-700/30">BADGE</span>}
        {door.hasBiometric && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-400 border border-purple-700/30">BIOMETRIQUE</span>}
        {door.hasSas && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-400 border border-amber-700/30">SAS</span>}
      </div>
    </div>
  )
}

function TransitionPanel({ tr, onClose }: { tr: TransitionNode; onClose: () => void }) {
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{tr.label}</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type" value={tr.type.replace(/_/g, ' ')} />
        <Field label="De / Vers" value={`${tr.fromFloor} → ${tr.toFloor}`} />
        <Field label="Capacite" value={`${tr.capacityPerMin}/min`} />
        <Field label="PMR" value={tr.pmr ? 'Oui' : 'Non'} color={tr.pmr ? 'text-blue-400' : 'text-gray-500'} />
      </div>
    </div>
  )
}

export default function EntityPanel({ entity, entityType, onClose, onDelete }: EntityPanelProps) {
  switch (entityType) {
    case 'camera':
      return <CameraPanel cam={entity as Camera} onClose={onClose} onDelete={onDelete} />
    case 'zone':
      return <ZonePanel zone={entity as Zone} onClose={onClose} />
    case 'door':
      return <DoorPanel door={entity as Door} onClose={onClose} />
    case 'transition':
      return <TransitionPanel tr={entity as TransitionNode} onClose={onClose} />
    default:
      return null
  }
}
