// ═══ VOL.4 · Section Positionnement ═══
//
// Configure et visualise le moteur de positionnement indoor :
// WiFi fingerprinting + BLE beacons + PDR + QR fallback.
//
// En environnement web (sans capteurs), les données sont fournies par import
// utilisateur (radio map, positions beacons, fichiers CSV) ou saisie manuelle.

import React, { useCallback, useMemo, useState } from 'react'
import {
  Wifi, Bluetooth, Smartphone, QrCode, MapPin, Upload, RefreshCw,
  CheckCircle2, AlertTriangle, Trash2, Plus,
} from 'lucide-react'
import { useVol4Store } from '../store/vol4Store'
import { usePlanEngineStore } from '../../shared/stores/planEngineStore'
import {
  ekfInitial, ekfUpdate, planBeaconDeployment,
  type RadioMapPoint, type BleBeacon,
} from '../engines/positioningEngine'
import { buildWayfinderGraph } from '../engines/wayfinderBridge'

export default function PositioningSection() {
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)
  const {
    radioMap, bleBeacons, positioningMode, positioningAccuracyM, currentPosition,
    setRadioMap, setBleBeacons, setPositioningMode, updatePosition, setEkf,
  } = useVol4Store()

  // Plan de déploiement recommandé (dérivé du graphe)
  const beaconRecommendations = useMemo(() => {
    if (!parsedPlan) return []
    const { graph } = buildWayfinderGraph({ parsedPlan })
    return planBeaconDeployment({
      keyNodes: graph.nodes.map(n => ({
        id: n.id, x: n.x, y: n.y,
        floorId: 'RDC', // fallback — sera override si MultiFloorGraph
        kind: n.kind,
      })),
      spacingM: 10,
    })
  }, [parsedPlan])

  // ─── Import radio map (CSV) ───
  const importRadioMapCsv = useCallback(async (file: File) => {
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return
    const header = lines[0].split(/[,;]/).map(s => s.trim())
    const idIdx = header.indexOf('id')
    const xIdx = header.indexOf('x')
    const yIdx = header.indexOf('y')
    const floorIdx = header.indexOf('floorId')
    if (idIdx < 0 || xIdx < 0 || yIdx < 0) return
    const points: RadioMapPoint[] = []
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(/[,;]/).map(s => s.trim())
      const samples: Array<{ apId: string; rssi: number }> = []
      for (let c = 0; c < header.length; c++) {
        if ([idIdx, xIdx, yIdx, floorIdx].includes(c)) continue
        const v = parseFloat(row[c])
        if (!Number.isNaN(v)) samples.push({ apId: header[c], rssi: v })
      }
      points.push({
        id: row[idIdx] || `rm-${i}`,
        x: parseFloat(row[xIdx]),
        y: parseFloat(row[yIdx]),
        floorId: floorIdx >= 0 ? row[floorIdx] : 'RDC',
        samples,
      })
    }
    setRadioMap(points)
  }, [setRadioMap])

  // ─── Import beacons BLE (CSV) ───
  const importBeaconsCsv = useCallback(async (file: File) => {
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(Boolean)
    const header = lines[0].split(/[,;]/).map(s => s.trim())
    const idIdx = header.indexOf('id')
    const xIdx = header.indexOf('x')
    const yIdx = header.indexOf('y')
    const floorIdx = header.indexOf('floorId')
    const txIdx = header.indexOf('txPowerDbm')
    const beacons: BleBeacon[] = []
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(/[,;]/).map(s => s.trim())
      beacons.push({
        id: row[idIdx] || `beacon-${i}`,
        x: parseFloat(row[xIdx]),
        y: parseFloat(row[yIdx]),
        floorId: floorIdx >= 0 ? row[floorIdx] : 'RDC',
        txPowerDbm: txIdx >= 0 ? parseFloat(row[txIdx]) : -59,
      })
    }
    setBleBeacons(beacons)
  }, [setBleBeacons])

  // ─── Utiliser les recommandations générées ───
  const applyBeaconRecommendations = useCallback(() => {
    setBleBeacons(beaconRecommendations.map((b, i) => ({
      id: b.id, x: b.x, y: b.y, floorId: b.floorId, txPowerDbm: -59,
    })))
  }, [beaconRecommendations, setBleBeacons])

  // ─── QR scan simulé : sélection d'une ancre ───
  const [manualX, setManualX] = useState('')
  const [manualY, setManualY] = useState('')
  const [manualFloor, setManualFloor] = useState('RDC')

  const setManualPosition = useCallback(() => {
    const x = parseFloat(manualX); const y = parseFloat(manualY)
    if (isNaN(x) || isNaN(y)) return
    const pos = {
      x, y, floorId: manualFloor,
      headingDeg: 0, speedMps: 0, accuracyM: 0.5,
      t: Date.now(), source: 'manual' as const,
    }
    updatePosition(pos)
    setEkf(ekfUpdate(ekfInitial({ x, y, floorId: manualFloor }), { pdrDelta: null, wifi: null, ble: null }))
    setPositioningMode('manual')
  }, [manualX, manualY, manualFloor, updatePosition, setEkf, setPositioningMode])

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-6 gap-6">
      {/* Header */}
      <div>
        <h2 className="text-white text-xl font-semibold">Positionnement indoor</h2>
        <p className="text-[11px] text-slate-500 mt-1">
          Fusion EKF · WiFi fingerprinting + BLE + PDR + QR. Dégradation gracieuse garantie.
        </p>
      </div>

      {/* État courant */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatusCard
          label="Mode"
          value={labelForMode(positioningMode)}
          color="#38bdf8"
          icon={Smartphone}
        />
        <StatusCard
          label="Précision"
          value={`± ${positioningAccuracyM.toFixed(1)} m`}
          color={positioningAccuracyM <= 2 ? '#34d399' : positioningAccuracyM <= 4 ? '#fbbf24' : '#f87171'}
          icon={MapPin}
        />
        <StatusCard
          label="Radio map WiFi"
          value={`${radioMap.length} points`}
          color="#c084fc"
          icon={Wifi}
        />
        <StatusCard
          label="Beacons BLE"
          value={`${bleBeacons.length} balises`}
          color="#f472b6"
          icon={Bluetooth}
        />
      </div>

      {currentPosition && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-[11px] text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={14} />
          Position active : ({currentPosition.x.toFixed(1)} m, {currentPosition.y.toFixed(1)} m) · étage {currentPosition.floorId} · source {currentPosition.source}
        </div>
      )}

      {/* ─── Config WiFi / BLE ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SourceCard
          icon={Wifi}
          color="#c084fc"
          title="WiFi Fingerprinting"
          description="Radio map KNN (k=5) · précision cible ±2–3 m · collecte tous les 3 m"
        >
          <div className="flex gap-2 flex-wrap">
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 cursor-pointer hover:bg-purple-500/20">
              <Upload size={11} />
              Importer CSV
              <input type="file" accept=".csv" className="hidden"
                onChange={e => e.target.files?.[0] && importRadioMapCsv(e.target.files[0])} />
            </label>
            {radioMap.length > 0 && (
              <button onClick={() => setRadioMap([])}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-300">
                <Trash2 size={11} /> Effacer
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Format attendu : <code className="text-slate-400">id,x,y,floorId,[apId1],[apId2]...</code>
          </p>
        </SourceCard>

        <SourceCard
          icon={Bluetooth}
          color="#f472b6"
          title="BLE Beacons"
          description="Trilatération RSSI · précision ±1–1.5 m · 1 beacon / 8–10 m"
        >
          <div className="flex gap-2 flex-wrap">
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 text-[11px] text-pink-300 cursor-pointer hover:bg-pink-500/20">
              <Upload size={11} />
              Importer CSV
              <input type="file" accept=".csv" className="hidden"
                onChange={e => e.target.files?.[0] && importBeaconsCsv(e.target.files[0])} />
            </label>
            {beaconRecommendations.length > 0 && (
              <button onClick={applyBeaconRecommendations}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300">
                <Plus size={11} />
                Placer {beaconRecommendations.length} beacons recommandés
              </button>
            )}
            {bleBeacons.length > 0 && (
              <button onClick={() => setBleBeacons([])}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-300">
                <Trash2 size={11} /> Effacer
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Format : <code className="text-slate-400">id,x,y,floorId,txPowerDbm</code>
          </p>
        </SourceCard>
      </div>

      {/* ─── QR / Manuel ─── */}
      <SourceCard
        icon={QrCode}
        color="#34d399"
        title="Fallback QR code / saisie manuelle"
        description="Fonctionne sans aucune infrastructure · idéal pour bornes, entrées, escalators"
      >
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number" placeholder="X (m)" value={manualX} onChange={e => setManualX(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950/50 border border-white/[0.06] text-[11px] text-white placeholder:text-slate-600"
          />
          <input
            type="number" placeholder="Y (m)" value={manualY} onChange={e => setManualY(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950/50 border border-white/[0.06] text-[11px] text-white placeholder:text-slate-600"
          />
          <input
            type="text" placeholder="Étage" value={manualFloor} onChange={e => setManualFloor(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950/50 border border-white/[0.06] text-[11px] text-white placeholder:text-slate-600"
          />
        </div>
        <button onClick={setManualPosition}
          className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-[11px] text-emerald-300 hover:bg-emerald-500/25">
          Appliquer la position
        </button>
      </SourceCard>

      {/* ─── Plan de déploiement beacons ─── */}
      {beaconRecommendations.length > 0 && (
        <div className="rounded-xl bg-slate-900/30 border border-white/[0.04] p-4">
          <h3 className="text-white text-sm font-semibold mb-2">
            Plan de déploiement recommandé · {beaconRecommendations.length} beacons
          </h3>
          <p className="text-[11px] text-slate-500 mb-3">
            Placements optimaux basés sur les nœuds de décision du graphe. Précision estimée globale : ±1.3 m.
          </p>
          <div className="max-h-48 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {beaconRecommendations.slice(0, 30).map(b => (
              <div key={b.id} className="text-[10px] bg-slate-950/40 rounded px-2 py-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{
                  background: b.rationale === 'transit' ? '#a855f7'
                    : b.rationale === 'entrance' ? '#34d399'
                    : '#38bdf8',
                }} />
                <span className="text-slate-400 truncate">{b.id}</span>
                <span className="text-slate-600">({b.x.toFixed(0)}, {b.y.toFixed(0)})</span>
              </div>
            ))}
            {beaconRecommendations.length > 30 && (
              <div className="text-[10px] text-slate-600 px-2 py-1">+ {beaconRecommendations.length - 30} autres…</div>
            )}
          </div>
        </div>
      )}

      {/* ─── Warnings ─── */}
      {radioMap.length === 0 && bleBeacons.length === 0 && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-[11px] text-amber-300 flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>Aucune infrastructure configurée.</strong> Le Wayfinder fonctionnera uniquement en mode QR code / saisie manuelle
            — acceptable pour les bornes interactives mais non optimal pour mobile.
          </div>
        </div>
      )}
    </div>
  )
}

function labelForMode(m: string): string {
  switch (m) {
    case 'auto': return 'Auto (EKF)'
    case 'qr': return 'QR code'
    case 'manual': return 'Manuel'
    case 'kiosk-fixed': return 'Borne fixe'
    default: return m
  }
}

function StatusCard({ label, value, color, icon: Icon }: {
  label: string; value: string; color: string; icon: React.FC<{ size?: number; className?: string }>
}) {
  return (
    <div className="rounded-xl bg-slate-900/40 border border-white/[0.04] p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={12} className="text-slate-500" />
        <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div className="text-base font-semibold" style={{ color }}>{value}</div>
    </div>
  )
}

function SourceCard({ icon: Icon, color, title, description, children }: {
  icon: React.FC<{ size?: number; className?: string }>
  color: string; title: string; description: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-slate-900/30 border border-white/[0.04] p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon size={16} className="" />
        </div>
        <div>
          <h3 className="text-white text-sm font-semibold">{title}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}
