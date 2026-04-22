import { DoorOpen, Fingerprint, KeySquare, ShieldCheck } from 'lucide-react'
import type { Zone } from '../../shared/proph3t/types'

interface DoorRec {
  type: string
  ref: string
  hasBadge: boolean
  hasBiometric: boolean
  hasSas: boolean
  normRef: string
  note: string
}

const DOOR_RULES: Record<string, DoorRec> = {
  parking:        { type: 'Barriere automatique levante',   ref: 'CAME BX-800',        hasBadge: false, hasBiometric: false, hasSas: false, normRef: 'NF EN 13241', note: 'Debit 500 veh/h, detection presence' },
  commerce:       { type: 'Porte coulissante automatique',  ref: 'DORMA ES200',         hasBadge: false, hasBiometric: false, hasSas: false, normRef: 'NF EN 16005', note: 'Debit 1800 pers/h, anti-pincement' },
  restauration:   { type: 'Porte battante double vantail',  ref: 'GEZE TS4000',         hasBadge: false, hasBiometric: false, hasSas: false, normRef: 'NF EN 1154',  note: 'Ferme-porte reglable, EI30' },
  circulation:    { type: 'Porte coupe-feu pivotante',      ref: 'REVER CF90',          hasBadge: false, hasBiometric: false, hasSas: false, normRef: 'NF EN 1634',  note: 'EI90, compartimentage incendie' },
  technique:      { type: 'Porte blindee + lecteur badge',  ref: 'ABLOY CL100',         hasBadge: true,  hasBiometric: false, hasSas: false, normRef: 'EN 1303',     note: 'Acces nominatif, journal passages' },
  backoffice:     { type: 'SAS securise double porte',      ref: 'SUPREMA BioEntry W2', hasBadge: true,  hasBiometric: true,  hasSas: true,  normRef: 'ISO 19794',   note: 'Anti-passback, biometrie empreinte' },
  financier:      { type: 'SAS banque triple verification', ref: 'SAGEM MA500+',        hasBadge: true,  hasBiometric: true,  hasSas: true,  normRef: 'NF P 25-362', note: 'Badge + biometrie + PIN, delai 5s' },
  sortie_secours: { type: 'Barre anti-panique certifiee',  ref: 'ASSA ABLOY PB1000',   hasBadge: false, hasBiometric: false, hasSas: false, normRef: 'NF EN 1125',  note: 'Ouverture interieure sans cle, alarme si forcee' },
}

interface DoorRecommendationProps {
  zone: Zone
}

export default function DoorRecommendation({ zone }: DoorRecommendationProps) {
  const rec = DOOR_RULES[zone.type] ?? DOOR_RULES.commerce

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <DoorOpen className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-semibold text-gray-200">Recommandation Porte</span>
      </div>
      <div className="text-xs text-white font-medium">{rec.type}</div>
      <div className="text-[11px] text-gray-400 mt-1">Ref: {rec.ref}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">Norme: {rec.normRef}</div>

      <div className="flex items-center gap-3 mt-2">
        {rec.hasBadge && (
          <span className="flex items-center gap-1 text-[10px] text-blue-400">
            <KeySquare className="w-3 h-3" /> Badge
          </span>
        )}
        {rec.hasBiometric && (
          <span className="flex items-center gap-1 text-[10px] text-purple-400">
            <Fingerprint className="w-3 h-3" /> Biometrie
          </span>
        )}
        {rec.hasSas && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400">
            <ShieldCheck className="w-3 h-3" /> SAS
          </span>
        )}
      </div>

      <div className="mt-2 text-[10px] text-gray-500 bg-gray-800/50 rounded px-2 py-1">
        {rec.note}
      </div>
    </div>
  )
}
