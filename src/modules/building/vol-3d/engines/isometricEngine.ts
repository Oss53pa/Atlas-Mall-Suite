import type { Zone, Camera, POI, SignageItem, Floor, TransitionNode } from '../../shared/proph3t/types'
import type { ExtrudedZone, ZoneHeight, IsoScene, IsoEntity, SceneConfig, FloorStackConfig } from '../store/vol3dTypes'

// ═══ PROJECTION ISOMÉTRIQUE ═══

const ISO_ANGLE = Math.PI / 6
const COS_ISO = Math.cos(ISO_ANGLE)
const SIN_ISO = Math.sin(ISO_ANGLE)

export function worldToIso(worldX: number, worldY: number, worldZ: number, scale: number): [number, number] {
  const screenX = (worldX - worldZ) * COS_ISO * scale
  const screenY = (worldX + worldZ) * SIN_ISO * scale - worldY * scale
  return [screenX, screenY]
}

export function isoToWorld(screenX: number, screenY: number, scale: number): [number, number] {
  const worldX = (screenX / (COS_ISO * scale) + screenY / (SIN_ISO * scale)) / 2
  const worldZ = (screenY / (SIN_ISO * scale) - screenX / (COS_ISO * scale)) / 2
  return [worldX, worldZ]
}

// ─── COULEURS ───

const ISO_COLORS: Record<string, { top: string; left: string; right: string; front: string }> = {
  parking: { top: '#1e3a5f', left: '#0f1d2e', right: '#2a5080', front: '#162c48' },
  commerce: { top: '#0d3320', left: '#061a10', right: '#1a5535', front: '#0a2818' },
  restauration: { top: '#3d1500', left: '#1e0a00', right: '#6b2500', front: '#2e1000' },
  circulation: { top: '#1a2a1a', left: '#0d150d', right: '#2a402a', front: '#152115' },
  technique: { top: '#1a0a2e', left: '#0d0517', right: '#2e1550', front: '#140822' },
  backoffice: { top: '#1a0a1a', left: '#0d050d', right: '#2e152e', front: '#140814' },
  financier: { top: '#2a0a0a', left: '#150505', right: '#4a1515', front: '#1e0808' },
  sortie_secours: { top: '#1a0000', left: '#0d0000', right: '#2e0000', front: '#140000' },
  loisirs: { top: '#0a1a2a', left: '#050d15', right: '#152a42', front: '#08141e' },
  services: { top: '#1a1a0a', left: '#0d0d05', right: '#2e2e15', front: '#141408' },
  hotel: { top: '#0a0a2a', left: '#050515', right: '#15154a', front: '#08081e' },
  bureaux: { top: '#1a1a1a', left: '#0d0d0d', right: '#2e2e2e', front: '#141414' },
  exterieur: { top: '#0a2a0a', left: '#051505', right: '#15451a', front: '#081e08' },
}

function getZoneColors(zone: Zone, glazing: boolean) {
  if (glazing) return { top: '#a8d4e8', left: '#5a9ab5', right: '#d4eef8', front: '#7ab8d0' }
  return ISO_COLORS[zone.type] ?? ISO_COLORS.commerce
}

// ─── EXTRUSION ───

export function extrudeZone(
  zone: Zone, height: ZoneHeight, floor: Floor, baseElevationM: number, scale: number
): ExtrudedZone {
  const { widthM, heightM } = floor
  const x0 = zone.x * widthM, z0 = zone.y * heightM
  const x1 = (zone.x + zone.w) * widthM, z1 = (zone.y + zone.h) * heightM
  const y0 = baseElevationM, y1 = baseElevationM + height.heightM
  const colors = getZoneColors(zone, height.hasGlazing)

  return {
    zone, height, colors,
    vertices: {
      bottomFace: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
      topFace: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]],
      sideFaces: [
        [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]],
        [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]],
        [[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]],
        [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]],
      ],
    },
    iso: {
      topFaceScreen: [worldToIso(x0, y1, z0, scale), worldToIso(x1, y1, z0, scale), worldToIso(x1, y1, z1, scale), worldToIso(x0, y1, z1, scale)],
      leftFaceScreen: [worldToIso(x0, y0, z0, scale), worldToIso(x0, y1, z0, scale), worldToIso(x0, y1, z1, scale), worldToIso(x0, y0, z1, scale)],
      rightFaceScreen: [worldToIso(x0, y0, z1, scale), worldToIso(x0, y1, z1, scale), worldToIso(x1, y1, z1, scale), worldToIso(x1, y0, z1, scale)],
      frontFaceScreen: [worldToIso(x1, y0, z0, scale), worldToIso(x1, y1, z0, scale), worldToIso(x1, y1, z1, scale), worldToIso(x1, y0, z1, scale)],
    },
  }
}

export function sortZonesPainter(zones: ExtrudedZone[]): ExtrudedZone[] {
  return [...zones].sort((a, b) => (b.zone.x + b.zone.y) - (a.zone.x + a.zone.y))
}

// ─── SVG GENERATION ───

export function generateIsoSVG(scene: IsoScene, config: SceneConfig): string {
  const { viewBox, extrudedZones, cameras3D, pois3D, signage3D, transitions3D } = scene
  const vbStr = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`

  const polyPath = (pts: [number, number][]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z'

  const zonesSVG = sortZonesPainter(extrudedZones).map(ez => {
    const { iso, colors, zone } = ez
    const o = config.showZones ? 1 : 0
    const left = `<path d="${polyPath(iso.leftFaceScreen)}" fill="${colors.left}" stroke="#ffffff08" stroke-width="0.5" opacity="${o}"/>`
    const right = `<path d="${polyPath(iso.rightFaceScreen)}" fill="${colors.right}" stroke="#ffffff08" stroke-width="0.5" opacity="${o}"/>`
    const front = `<path d="${polyPath(iso.frontFaceScreen)}" fill="${colors.front}" stroke="#ffffff08" stroke-width="0.5" opacity="${o}"/>`
    const top = `<path d="${polyPath(iso.topFaceScreen)}" fill="${colors.top}" stroke="#ffffff15" stroke-width="0.8" opacity="${o}"/>`
    const tc = iso.topFaceScreen.reduce((acc, p) => [acc[0] + p[0] / 4, acc[1] + p[1] / 4], [0, 0])
    const label = config.showFloorLabels
      ? `<text x="${tc[0].toFixed(1)}" y="${(tc[1] - 4).toFixed(1)}" text-anchor="middle" font-size="8" fill="#ffffff80" font-family="system-ui,sans-serif">${zone.label}</text>`
      : ''
    return `<g data-zone="${zone.id}">${left}${right}${front}${top}${label}</g>`
  }).join('\n')

  const entitySVG = (entities: IsoEntity[], show: boolean) =>
    !show ? '' : entities.map(e =>
      `<g data-entity="${e.id}"><circle cx="${e.isoX.toFixed(1)}" cy="${e.isoY.toFixed(1)}" r="6" fill="${e.color}" stroke="#ffffff40" stroke-width="1"/><text x="${e.isoX.toFixed(1)}" y="${(e.isoY + 3).toFixed(1)}" text-anchor="middle" font-size="7" fill="#ffffffcc" font-family="system-ui">${e.label.slice(0, 8)}</text></g>`
    ).join('\n')

  const gridSVG = scene.gridLines.map(([p1, p2]) =>
    `<line x1="${p1[0].toFixed(1)}" y1="${p1[1].toFixed(1)}" x2="${p2[0].toFixed(1)}" y2="${p2[1].toFixed(1)}" stroke="#ffffff08" stroke-width="0.5"/>`
  ).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbStr}" width="100%" height="100%" style="background:${config.backgroundColor}">
<defs><filter id="drop-shadow"><feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#00000060"/></filter></defs>
<g id="grid">${gridSVG}</g>
<g id="zones" filter="url(#drop-shadow)">${zonesSVG}</g>
<g id="cameras">${entitySVG(cameras3D, config.showCameras)}</g>
<g id="pois">${entitySVG(pois3D, config.showPOI)}</g>
<g id="signage">${entitySVG(signage3D, config.showSignage)}</g>
<g id="transitions">${entitySVG(transitions3D, config.showTransitions)}</g>
</svg>`
}

// ─── SCENE BUILDER ───

export function buildIsoScene(input: {
  floors: Floor[]; zones: Zone[]; cameras: Camera[]; pois: POI[]
  signageItems: SignageItem[]; transitions: TransitionNode[]
  floorStack: FloorStackConfig[]; zoneHeights: ZoneHeight[]; scale?: number
}): IsoScene {
  const { floors, zones, cameras, pois, signageItems, transitions, floorStack, zoneHeights, scale = 60 } = input
  const extrudedZones: ExtrudedZone[] = []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const stackConfig of floorStack.filter(s => s.visible)) {
    const floor = floors.find(f => f.id === stackConfig.floorId)
    if (!floor) continue
    for (const zone of zones.filter(z => z.floorId === floor.id)) {
      const heightConfig = zoneHeights.find(h => h.zoneId === zone.id)
        ?? { zoneId: zone.id, heightM: defaultHeightForType(zone.type), floorThicknessM: 0.3, hasGlazing: false, roofType: 'flat' as const }
      const extruded = extrudeZone(zone, heightConfig, floor, stackConfig.baseElevationM, scale)
      extrudedZones.push(extruded)
      for (const pt of [...extruded.iso.topFaceScreen, ...extruded.iso.leftFaceScreen, ...extruded.iso.rightFaceScreen]) {
        minX = Math.min(minX, pt[0]); minY = Math.min(minY, pt[1])
        maxX = Math.max(maxX, pt[0]); maxY = Math.max(maxY, pt[1])
      }
    }
  }

  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600 }
  const margin = 40
  const viewBox = { x: minX - margin, y: minY - margin, w: maxX - minX + margin * 2, h: maxY - minY + margin * 2 }

  const toIsoEntity = (id: string, type: IsoEntity['type'], x: number, y: number, elevM: number, label: string, icon: string, color: string, floor: Floor, baseElev: number): IsoEntity => {
    const [iX, iY] = worldToIso(x * floor.widthM, baseElev + elevM, y * floor.heightM, scale)
    return { id, type, isoX: iX, isoY: iY, elevation: elevM, label, icon, color }
  }

  const cameras3D = cameras.map(c => { const f = floors.find(fl => fl.id === c.floorId); const s = floorStack.find(st => st.floorId === c.floorId); return f && s ? toIsoEntity(c.id, 'camera', c.x, c.y, 2.5, c.label, '', '#3b82f6', f, s.baseElevationM) : null }).filter(Boolean) as IsoEntity[]
  const pois3D = pois.map(p => { const f = floors.find(fl => fl.id === p.floorId); const s = floorStack.find(st => st.floorId === p.floorId); return f && s ? toIsoEntity(p.id, 'poi', p.x, p.y, 0.1, p.label, p.icon, p.color, f, s.baseElevationM) : null }).filter(Boolean) as IsoEntity[]
  const signage3D = signageItems.map(si => { const f = floors.find(fl => fl.id === si.floorId); const s = floorStack.find(st => st.floorId === si.floorId); return f && s ? toIsoEntity(si.id, 'signage', si.x, si.y, si.poseHeightM ?? 2.5, si.ref, '', '#06b6d4', f, s.baseElevationM) : null }).filter(Boolean) as IsoEntity[]
  const transitions3D = transitions.map(t => { const f = floors.find(fl => fl.level === t.fromFloor); const s = floorStack.find(st => st.floorId === f?.id); return f && s ? toIsoEntity(t.id, 'transition', t.x, t.y, 0, t.label, '', '#f59e0b', f, s.baseElevationM) : null }).filter(Boolean) as IsoEntity[]

  const gridLines = buildIsoGrid(floors[0], floorStack[0]?.baseElevationM ?? 0, scale)

  return { viewBox, extrudedZones, cameras3D, pois3D, signage3D, transitions3D, gridLines, scaleFactor: scale }
}

function buildIsoGrid(floor: Floor | undefined, baseElev: number, scale: number): [number, number][][] {
  if (!floor) return []
  const lines: [number, number][][] = []
  const step = 10
  for (let x = 0; x <= floor.widthM; x += step) {
    lines.push([worldToIso(x, baseElev, 0, scale), worldToIso(x, baseElev, floor.heightM, scale)])
  }
  for (let z = 0; z <= floor.heightM; z += step) {
    lines.push([worldToIso(0, baseElev, z, scale), worldToIso(floor.widthM, baseElev, z, scale)])
  }
  return lines
}

export function defaultHeightForType(type: string): number {
  const h: Record<string, number> = { parking: 3.0, commerce: 4.5, restauration: 4.0, circulation: 5.0, technique: 3.0, backoffice: 3.5, financier: 3.5, sortie_secours: 4.0, loisirs: 6.0, services: 3.5, hotel: 3.2, bureaux: 3.0, exterieur: 0.1 }
  return h[type] ?? 4.0
}
