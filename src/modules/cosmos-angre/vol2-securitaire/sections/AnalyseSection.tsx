import React, { useMemo } from 'react'
import { Shield, Camera, DoorOpen, LogOut, AlertTriangle, CheckCircle, Banknote } from 'lucide-react'
import ScoreGauge from '../../shared/components/ScoreGauge'
import { useVol2Store } from '../store/vol2Store'

const CAPEX_PRICES: Record<string, number> = {
  'XNV-8080R': 850_000,
  'QNV-8080R': 920_000,
  'PTZ-P3': 1_450_000,
  'PTZ QNP-9300RWB': 2_200_000,
  'PNM-9000VQ': 1_280_000,
  'QNO-8080R': 780_000,
  'DS-2CD2T47G2': 650_000,
  'IPC-HDW3849H': 580_000,
  'XNF-9300RV': 1_100_000,
}

const DOOR_RECS: Record<string, { type: string; ref: string; normRef: string }> = {
  parking: { type: 'Barriere automatique levante', ref: 'CAME BX-800', normRef: 'NF EN 13241' },
  commerce: { type: 'Porte coulissante automatique', ref: 'DORMA ES200', normRef: 'NF EN 16005' },
  restauration: { type: 'Porte battante double vantail', ref: 'GEZE TS4000', normRef: 'NF EN 1154' },
  circulation: { type: 'Porte coupe-feu pivotante', ref: 'REVER CF90', normRef: 'NF EN 1634' },
  technique: { type: 'Porte blindee + lecteur badge', ref: 'ABLOY CL100', normRef: 'EN 1303' },
  backoffice: { type: 'SAS securise double porte', ref: 'SUPREMA BioEntry W2', normRef: 'ISO 19794' },
  financier: { type: 'SAS banque triple verification', ref: 'SAGEM MA500+', normRef: 'NF P 25-362' },
  sortie_secours: { type: 'Barre anti-panique certifiee', ref: 'ASSA ABLOY PB1000', normRef: 'NF EN 1125' },
}

function ScoreBar({ label, value, max, icon: Icon }: {
  label: string; value: number; max: number; icon: React.ComponentType<{ className?: string }>
}) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-gray-500 shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-400">{label}</span>
          <span className="font-semibold text-white">{value}/{max}</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default function AnalyseSection() {
  const score = useVol2Store((s) => s.score)
  const zones = useVol2Store((s) => s.zones)
  const cameras = useVol2Store((s) => s.cameras)
  const doors = useVol2Store((s) => s.doors)
  const blindSpots = useVol2Store((s) => s.blindSpots)
  const coverageByFloor = useVol2Store((s) => s.coverageByFloor)
  const capexTotal = useMemo(() => {
    const camTotal = cameras.reduce((sum, c) => sum + (c.capexFcfa || CAPEX_PRICES[c.model] || 0), 0)
    const doorTotal = doors.reduce((sum, d) => sum + (d.capexFcfa || 0), 0)
    return { cameras: camTotal, doors: doorTotal, total: camTotal + doorTotal }
  }, [cameras, doors])

  const criticalBlindSpots = blindSpots.filter((b) => b.severity === 'critique')

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-950">
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="text-sm font-bold text-red-400">Analyse Securitaire</h2>
        <p className="text-[10px] text-gray-500 mt-0.5">Score APSAD R82 et recommandations</p>
      </div>

      <div className="p-4 space-y-6">
        {/* Score Global */}
        <div className="flex items-center gap-6">
          <ScoreGauge value={score?.total ?? 0} max={100} size={80} />
          <div>
            <div className="text-2xl font-bold text-white">{score?.total ?? 0}<span className="text-sm text-gray-500">/100</span></div>
            <div className="text-xs text-gray-500">Score APSAD R82</div>
            <div className={`text-[10px] mt-1 px-2 py-0.5 rounded inline-block ${
              (score?.total ?? 0) >= 70 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
            }`}>
              {(score?.total ?? 0) >= 70 ? 'Conforme' : 'Non conforme'}
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        {score && (
          <div className="space-y-3 bg-gray-900/50 rounded-lg p-3 border border-gray-800">
            <ScoreBar label="Cameras" value={score.camScore} max={40} icon={Camera} />
            <ScoreBar label="Zones" value={score.zoneScore} max={20} icon={Shield} />
            <ScoreBar label="Acces" value={score.doorScore} max={20} icon={DoorOpen} />
            <ScoreBar label="Sorties" value={score.exitScore} max={20} icon={LogOut} />
          </div>
        )}

        {/* Coverage by Floor */}
        <div>
          <h3 className="text-xs font-semibold text-gray-300 mb-2">Couverture par etage</h3>
          <div className="space-y-1.5">
            {Object.entries(coverageByFloor).map(([floorId, cov]) => (
              <div key={floorId} className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-16 font-mono">{floorId.replace('floor-', '').toUpperCase()}</span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${cov >= 80 ? 'bg-green-500' : cov >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${cov}%` }}
                  />
                </div>
                <span className="font-semibold text-white w-10 text-right">{cov}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Non-conformites */}
        {score && score.issues.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> Non-conformites
            </h3>
            <div className="space-y-1.5">
              {score.issues.map((issue, i) => (
                <div key={i} className="text-xs text-gray-300 bg-red-950/20 border border-red-800/30 rounded px-3 py-2">
                  {issue}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blind Spots */}
        <div>
          <h3 className="text-xs font-semibold text-amber-400 mb-2">
            Angles morts ({blindSpots.length})
          </h3>
          {criticalBlindSpots.length > 0 ? (
            <div className="text-xs text-red-300 bg-red-950/20 border border-red-800/30 rounded px-3 py-2 mb-2">
              {criticalBlindSpots.length} zones critiques sans couverture
            </div>
          ) : (
            <div className="text-xs text-green-300 bg-green-950/20 border border-green-800/30 rounded px-3 py-2 flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3" /> Aucun angle mort critique
            </div>
          )}
        </div>

        {/* Zone Inventory */}
        <div>
          <h3 className="text-xs font-semibold text-gray-300 mb-2">Inventaire Zones ({zones.length})</h3>
          <div className="space-y-1">
            {zones.map((z) => (
              <div key={z.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-gray-900/50">
                <div className={`w-2 h-2 rounded-full ${z.niveau >= 4 ? 'bg-red-500' : z.niveau >= 3 ? 'bg-amber-500' : 'bg-green-500'}`} />
                <span className="flex-1 text-gray-300">{z.label}</span>
                <span className="text-gray-500">N{z.niveau}</span>
                <span className="text-gray-500">{z.surfaceM2 ?? '—'}m²</span>
              </div>
            ))}
          </div>
        </div>

        {/* Door Recommendations */}
        <div>
          <h3 className="text-xs font-semibold text-blue-400 mb-2">Recommandations Portes</h3>
          <div className="space-y-1.5">
            {zones.map((z) => {
              const rec = DOOR_RECS[z.type]
              if (!rec) return null
              return (
                <div key={z.id} className="text-xs bg-gray-900/50 border border-gray-800 rounded p-2">
                  <div className="font-medium text-gray-200">{z.label}</div>
                  <div className="text-gray-400 mt-0.5">{rec.type} — {rec.ref}</div>
                  <div className="text-gray-500 text-[10px]">{rec.normRef}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CAPEX Summary */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5 text-green-400" /> Synthese CAPEX
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Cameras ({cameras.length})</span>
              <span className="font-semibold text-white">{capexTotal.cameras.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Portes/Acces ({doors.length})</span>
              <span className="font-semibold text-white">{capexTotal.doors.toLocaleString()} FCFA</span>
            </div>
            <div className="border-t border-gray-700 pt-2 flex justify-between">
              <span className="text-gray-300 font-medium">Total</span>
              <span className="font-bold text-green-400">{capexTotal.total.toLocaleString()} FCFA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
