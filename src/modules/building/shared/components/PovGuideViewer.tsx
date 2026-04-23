// ═══ POV GUIDE VIEWER ═══
// Modal plein-écran avec scène Three.js dédiée en vue first-person :
//   - Caméra FPS qui suit le parcours à vitesse de marche
//   - Panneaux de signalétique matérialisés en 3D (cubes + labels)
//   - Murs simplifiés + sol
//   - HUD à droite : événements du step courant, panneaux visibles, alertes
//   - Contrôles : play/pause, slider temps, bouton « prochain nœud de décision »
//
// Autonome — ne touche pas à Plan3DView. Utilise directement le FlowResult
// + les walls + spaces pour reconstruire une mini-scène.

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import {
  X, Play, Pause, RotateCcw, SkipForward, Eye, AlertTriangle, CheckCircle,
} from 'lucide-react'
import type { FlowPath, FlowAnalysisResult } from '../engines/plan-analysis/flowPathEngine'
import { buildPovScript, stateAt, type PovScript, type PovEvent } from '../engines/plan-analysis/povGuideEngine'
import type { PlacedPanel } from '../engines/plan-analysis/signagePlacementEngine'

interface Props {
  flowResult: FlowAnalysisResult
  walls: Array<{ x1: number; y1: number; x2: number; y2: number }>
  spacePolygons: Array<[number, number][]>
  /** Chemin à parcourir (défaut : premier du flowResult). */
  initialPathId?: string
  wallHeightM?: number
  onClose: () => void
}

const PANEL_COLOR: Record<PlacedPanel['kind'], number> = {
  welcome: 0x10b981,
  directional: 0xf59e0b,
  'you-are-here': 0x6366f1,
  information: 0x8b5cf6,
  exit: 0xef4444,
  'emergency-plan': 0x059669,
  'emergency-exit': 0xdc2626,
  'exit-direction': 0xb91c1c,
  'pmr-direction': 0x2563eb,
}

export function PovGuideViewer({
  flowResult, walls, spacePolygons, initialPathId, wallHeightM = 3.2, onClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedPathId, setSelectedPathId] = useState<string>(
    initialPathId ?? flowResult.paths[0]?.id ?? '',
  )
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentEvents, setCurrentEvents] = useState<PovEvent[]>([])

  const path: FlowPath | undefined = useMemo(
    () => flowResult.paths.find(p => p.id === selectedPathId),
    [flowResult, selectedPathId],
  )

  const panels = flowResult.placement?.panels ?? []

  // Construction du script (une fois par path)
  const script: PovScript | null = useMemo(() => {
    if (!path) return null
    // Nœuds de décision = junctions du navGraph si dispo, sinon coudes du path
    const decisionPoints = flowResult.navGraph
      ? flowResult.navGraph.nodes
          .filter(n => n.kind === 'junction')
          .map(n => ({ id: n.id, x: n.x, y: n.y }))
      : path.waypoints
          .slice(1, -1)
          .map((p, i) => ({ id: `d-${i}`, x: p.x, y: p.y }))

    return buildPovScript({
      path, panels, decisionPoints,
      spaces: spacePolygons.map(p => ({ polygon: p })),
      walls,
      walkSpeedMps: 1.3,
      dtSec: 0.2,
      eyeHeightM: 1.6,
      decisionProximityM: 3,
    })
  }, [path, panels, flowResult.navGraph, spacePolygons, walls])

  // ─── Init Three.js scène ────────────────────────────
  const sceneRefs = useRef<{
    scene?: THREE.Scene
    camera?: THREE.PerspectiveCamera
    renderer?: THREE.WebGLRenderer
    animationId?: number
  }>({})

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const w = container.clientWidth
    const h = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f172a)
    scene.fog = new THREE.Fog(0x0f172a, 30, 80)

    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 500)
    camera.up.set(0, 0, 1) // Z-up
    camera.position.set(0, 0, 1.6)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(w, h)
    container.appendChild(renderer.domElement)

    // ─── Sol ───
    const floorGeo = new THREE.PlaneGeometry(500, 500, 1, 1)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.1,
      roughness: 0.9,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.position.set(0, 0, 0)
    scene.add(floor)

    // ─── Lumières ───
    scene.add(new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 0.6))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(50, 50, 100)
    scene.add(dirLight)

    // ─── Murs (boxes minces) ───
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
    for (const w of walls) {
      const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1)
      if (len < 0.1) continue
      const geom = new THREE.BoxGeometry(len, 0.15, wallHeightM)
      const mesh = new THREE.Mesh(geom, wallMat)
      mesh.position.set((w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2, wallHeightM / 2)
      mesh.rotation.z = Math.atan2(w.y2 - w.y1, w.x2 - w.x1)
      scene.add(mesh)
    }

    // ─── Panneaux signalétique ───
    for (const p of panels) {
      const color = PANEL_COLOR[p.kind] ?? 0x94a3b8
      const h = p.mount === 'ceiling' ? 2.5 : p.mount === 'wall' ? 2.0 : 1.2
      const boxMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.25,
      })
      // Plaque rectangulaire 1m × 0.4m, 0.05m épaisseur
      const panelGeo = new THREE.BoxGeometry(1.0, 0.05, 0.4)
      const panel = new THREE.Mesh(panelGeo, boxMat)
      panel.position.set(p.x, p.y, h)
      if (p.orientationDeg !== undefined) {
        panel.rotation.z = (p.orientationDeg * Math.PI) / 180
      }
      scene.add(panel)

      // Tige support (sauf plafond)
      if (p.mount !== 'ceiling') {
        const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, h, 6)
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569 })
        const pole = new THREE.Mesh(poleGeo, poleMat)
        pole.position.set(p.x, p.y, h / 2)
        pole.rotation.x = Math.PI / 2
        scene.add(pole)
      }

      // Cercle lumineux au sol (halo)
      const haloGeo = new THREE.CircleGeometry(0.4, 24)
      const haloMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 })
      const halo = new THREE.Mesh(haloGeo, haloMat)
      halo.position.set(p.x, p.y, 0.02)
      scene.add(halo)
    }

    // ─── Entrées / sorties : pylônes colorés ───
    const entMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.4 })
    const exMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.4 })
    for (const e of flowResult.entrances) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.0, 6), entMat)
      cone.position.set(e.x, e.y, 1.0)
      cone.rotation.x = Math.PI / 2
      scene.add(cone)
    }
    for (const e of flowResult.exits) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.0, 6), exMat)
      cone.position.set(e.x, e.y, 1.0)
      cone.rotation.x = -Math.PI / 2
      scene.add(cone)
    }

    // ─── Ligne de parcours au sol ───
    if (path) {
      const wps = path.waypoints
      const pts = wps.map(w => new THREE.Vector3(w.x, w.y, 0.05))
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts)
      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x60a5fa, linewidth: 2 }))
      scene.add(line)
    }

    sceneRefs.current = { scene, camera, renderer }

    // ─── Animation loop ───
    const animate = () => {
      renderer.render(scene, camera)
      sceneRefs.current.animationId = requestAnimationFrame(animate)
    }
    animate()

    // ─── Resize ───
    const onResize = () => {
      const w2 = container.clientWidth
      const h2 = container.clientHeight
      camera.aspect = w2 / h2
      camera.updateProjectionMatrix()
      renderer.setSize(w2, h2)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      if (sceneRefs.current.animationId) cancelAnimationFrame(sceneRefs.current.animationId)
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
      scene.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPathId])

  // ─── Déplacement caméra en fonction de time ────────
  useEffect(() => {
    const { camera } = sceneRefs.current
    if (!camera || !script) return
    const s = stateAt(script, time)
    camera.position.set(s.x, s.y, s.z)
    // Vecteur regard = 1m en avant + même hauteur
    const tx = s.x + Math.cos(s.yaw)
    const ty = s.y + Math.sin(s.yaw)
    camera.lookAt(tx, ty, s.z)

    // Collect events au step courant
    const step = script.steps[s.stepIndex]
    setCurrentEvents(step?.events ?? [])
  }, [time, script])

  // ─── Animation lecture ────────────────────────────
  useEffect(() => {
    if (!playing || !script) return
    let raf: number
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      setTime(t => {
        const nt = t + dt
        if (nt >= script.totalDurationSec) {
          setPlaying(false)
          return script.totalDurationSec
        }
        return nt
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, script])

  const jumpToNextDecision = () => {
    if (!script) return
    for (const s of script.steps) {
      if (s.tSec > time && s.events.some(e => e.kind === 'decision-node')) {
        setTime(s.tSec)
        return
      }
    }
  }

  const modal = (
    <div className="fixed inset-0 z-[9999] bg-surface-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2 bg-surface-1 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-white">Visite guidée — vue piéton</h2>
          <select
            value={selectedPathId}
            onChange={(e) => { setSelectedPathId(e.target.value); setTime(0); setPlaying(false) }}
            className="bg-surface-0 border border-white/10 text-[11px] text-slate-200 rounded px-2 py-1 focus:outline-none"
          >
            {flowResult.paths.map(p => (
              <option key={p.id} value={p.id}>
                {p.from.label} → {p.to.label} ({p.distanceM.toFixed(0)}m)
              </option>
            ))}
          </select>
        </div>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Corps : scène 3D + HUD latéral */}
      <div className="flex-1 flex overflow-hidden">
        {/* Scène 3D */}
        <div ref={containerRef} className="flex-1 relative bg-surface-0">
          {/* Overlay alerte si step courant a panneau manquant */}
          {currentEvents.some(e => e.kind === 'panel-missing') && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-red-900/90 border border-red-500 rounded-lg text-red-100 text-[12px] font-semibold shadow-lg">
              <AlertTriangle className="w-4 h-4" />
              Panneau manquant détecté à cette position
            </div>
          )}
          {/* Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-6 h-6 border border-white/40 rounded-full" />
          </div>
        </div>

        {/* HUD latéral */}
        <aside className="w-[320px] bg-surface-1 border-l border-white/10 flex flex-col">
          {script && (
            <>
              {/* Stats */}
              <div className="p-4 border-b border-white/10">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  Résumé du parcours
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <StatBox label="Durée" value={`${script.totalDurationSec.toFixed(0)}s`} color="text-blue-400" />
                  <StatBox label="Distance" value={`${path?.distanceM.toFixed(0) ?? 0}m`} color="text-atlas-400" />
                  <StatBox
                    label="Nœuds décision"
                    value={script.summary.totalDecisionPoints.toString()}
                    color="text-amber-400"
                  />
                  <StatBox
                    label="Sans signalétique"
                    value={script.summary.decisionsMissingSignage.toString()}
                    color={script.summary.decisionsMissingSignage > 0 ? 'text-red-400' : 'text-emerald-400'}
                  />
                </div>
                {script.summary.decisionsMissingSignage > 0 && (
                  <div className="mt-3 flex items-start gap-2 px-2 py-1.5 rounded bg-red-950/40 border border-red-900/40 text-[10px] text-red-200">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>
                      {script.summary.decisionsMissingSignage} nœud{script.summary.decisionsMissingSignage > 1 ? 's' : ''} de décision sans panneau visible. Voir recommandations ci-dessous.
                    </span>
                  </div>
                )}
              </div>

              {/* Événements step courant */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  Événements {time.toFixed(1)}s
                </div>
                {currentEvents.length === 0 && (
                  <p className="text-[11px] italic text-slate-500">En marche…</p>
                )}
                <ul className="space-y-1.5">
                  {currentEvents.map((e, i) => (
                    <li key={i} className="text-[11px]">
                      {e.kind === 'enter-path' && (
                        <div className="flex items-start gap-1.5 text-blue-300">
                          <span>▶</span> Départ : {e.pathLabel}
                        </div>
                      )}
                      {e.kind === 'decision-node' && (
                        <div className="flex items-start gap-1.5 text-amber-300">
                          <span>◆</span>
                          <div>
                            <div>Nœud de décision · {e.visiblePanels.length} panneau{e.visiblePanels.length > 1 ? 'x' : ''} visible{e.visiblePanels.length > 1 ? 's' : ''}</div>
                          </div>
                        </div>
                      )}
                      {e.kind === 'panel-visible' && (
                        <div className="flex items-start gap-1.5 text-emerald-300">
                          <CheckCircle className="w-3 h-3 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="truncate">{e.panelType} · {e.distanceM.toFixed(1)}m</div>
                            <div className="text-[9px] text-slate-500">lisibilité {(e.score * 100).toFixed(0)}%</div>
                          </div>
                        </div>
                      )}
                      {e.kind === 'panel-missing' && (
                        <div className="flex items-start gap-1.5 text-red-300">
                          <AlertTriangle className="w-3 h-3 mt-0.5" />
                          <span>{e.message}</span>
                        </div>
                      )}
                      {e.kind === 'exit-path' && (
                        <div className="text-emerald-300">◼ Arrivé à destination</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommandations finales */}
              {script.summary.missingRecommendations.length > 0 && (
                <div className="p-4 border-t border-white/10 bg-red-950/20 max-h-40 overflow-y-auto">
                  <div className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-2">
                    Recommandations
                  </div>
                  <ul className="space-y-0.5 text-[10px] text-red-200">
                    {script.summary.missingRecommendations.slice(0, 4).map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {/* Contrôles */}
      <div className="px-5 py-3 bg-surface-1 border-t border-white/10 flex items-center gap-3">
        <button
          onClick={() => setPlaying(p => !p)}
          className="p-2 rounded bg-amber-600 hover:bg-amber-500 text-white"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={() => { setTime(0); setPlaying(false) }}
          className="p-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
          title="Revenir au début"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={jumpToNextDecision}
          className="p-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
          title="Prochain nœud de décision"
        >
          <SkipForward className="w-4 h-4" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <span className="text-[11px] text-slate-500 tabular-nums min-w-[45px]">
            {time.toFixed(1)}s
          </span>
          <input
            type="range"
            min={0}
            max={script?.totalDurationSec ?? 100}
            step={0.1}
            value={time}
            onChange={(e) => { setTime(Number(e.target.value)); setPlaying(false) }}
            className="flex-1 accent-amber-500"
          />
          <span className="text-[11px] text-slate-500 tabular-nums min-w-[45px]">
            {(script?.totalDurationSec ?? 0).toFixed(1)}s
          </span>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface-0/60 rounded px-2 py-1.5">
      <div className="text-slate-600 uppercase text-[8px] tracking-wider">{label}</div>
      <div className={`font-bold text-base tabular-nums ${color}`}>{value}</div>
    </div>
  )
}
