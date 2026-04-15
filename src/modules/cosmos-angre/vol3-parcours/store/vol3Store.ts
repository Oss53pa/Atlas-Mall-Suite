// ═══ VOL.3 PARCOURS CLIENT — Zustand Store ═══

import { create } from 'zustand'
import { shouldUseMockData } from '../../shared/useMockData'
import type {
  Floor, Zone, TransitionNode, POI, SignageItem,
  MomentCle, VisitorProfile, NavigationGraph, PathResult,
  ProjectMemorySummary, ChatMessage, NavigationNode,
  NavigationEdge, InterFloorEdge, FloorLevel
} from '../../shared/proph3t/types'
import { generateParcours } from '../../shared/proph3t/engine'
import { importPlan as importPlanOrchestrator } from '../../shared/planReader'
import type { PlanImportState, CalibrationResult, DimEntity } from '../../shared/planReader/planReaderTypes'
import { calculateSignaleticsSpec, optimizeSignaleticsPlacement } from '../../shared/proph3t/signaleticsEngine'
import { exportSignaletiquePDF } from '../../../export/exportSignaletique'
import { exportQRCodesPDF } from '../../../export/exportQRCodes'
import {
  loadProjectFromSupabase, persistEntity, deleteEntity,
  mapZoneToDB, mapPoiToDB, mapSignageToDB, mapTransitionToDB,
} from '../../shared/supabaseSync'

// ─── Mock Data (fallback when Supabase has no data) ───

// No seed/mock data: store starts empty — user populates via DXF import or forms.


// ─── Entity type union ───────────────────────────────────────

type EntityType = 'poi' | 'signage' | 'moment'

// ─── State Interface ─────────────────────────────────────────

interface Vol3State {
  // Project
  projectId: string
  projectName: string

  // Multi-floor
  floors: Floor[]
  activeFloorId: string
  transitions: TransitionNode[]

  // Entities
  zones: Zone[]
  pois: POI[]
  signageItems: SignageItem[]
  moments: MomentCle[]

  // Navigation
  navGraph: NavigationGraph | null
  currentPath: PathResult | null

  // Profiles
  visitorProfiles: VisitorProfile[]
  activeProfileId: string | null

  // Heatmap
  heatmapData: number[][] | null
  heatmapFloorId: string | null

  // Memory
  memory: ProjectMemorySummary | null

  // Chat
  chatMessages: ChatMessage[]

  // UI
  selectedEntityId: string | null
  selectedEntityType: EntityType | null
  showSignage: boolean
  showWayfinding: boolean
  showHeatmap: boolean
  showMoments: boolean
  showPmrOnly: boolean

  // Library
  libraryOpen: boolean
  libraryTab: 'camera' | 'door' | 'signage' | 'mobilier_pmr'

  // Actions - Floors
  setActiveFloor: (floorId: string) => void
  addFloor: (floor: Floor) => void

  // Actions - POIs
  addPoi: (poi: POI) => void
  updatePoi: (id: string, updates: Partial<POI>) => void
  deletePoi: (id: string) => void
  setPois: (pois: POI[]) => void

  // Actions - Signage
  addSignageItem: (item: SignageItem) => void
  updateSignageItem: (id: string, updates: Partial<SignageItem>) => void
  deleteSignageItem: (id: string) => void
  setSignageItems: (items: SignageItem[]) => void

  // Actions - Moments
  setMoments: (moments: MomentCle[]) => void

  // Actions - Navigation
  setNavGraph: (graph: NavigationGraph | null) => void
  setCurrentPath: (path: PathResult | null) => void

  // Actions - Heatmap
  setHeatmapData: (data: number[][] | null, floorId?: string | null) => void

  // Actions - Memory
  setMemory: (memory: ProjectMemorySummary) => void

  // Actions - Chat
  addChatMessage: (msg: ChatMessage) => void
  clearChat: () => void

  // Actions - UI
  selectEntity: (id: string | null, type: EntityType | null) => void
  toggleSignage: () => void
  toggleWayfinding: () => void
  toggleHeatmap: () => void
  toggleMoments: () => void
  togglePmrOnly: () => void
  setLibraryOpen: (open: boolean) => void
  setLibraryTab: (tab: Vol3State['libraryTab']) => void

  // Actions - Profiles
  setActiveProfile: (id: string | null) => void

  // Actions - Orchestration (PRD)
  autoPlaceSignaletics: (floorId: string) => Promise<void>
  calculateSignaleticsSpecs: (signageId: string) => void
  generateParcours: () => void
  buildGraph: (floorId?: string) => Promise<void>
  calculateWayfinding: (fromId: string, toId: string, pmrOnly?: boolean) => PathResult | null
  simulateProfile: (profileId: string) => Promise<void>
  generateHeatmap: (scenario: string) => Promise<void>

  // Actions - Export (PRD)
  exportSignaleticsPDF: () => Promise<void>
  exportParcoursReport: () => Promise<void>
  exportQRCodes: () => Promise<void>
  exportWayfindingPDF: () => Promise<void>

  // Actions - Plan reader
  importPlan: (file: File, floorId: string) => Promise<void>
  setPlanImportState: (state: PlanImportState | null) => void
  setPlanImageUrl: (floorId: string, url: string) => void

  // Actions - Supabase hydration
  hydrateFromSupabase: (projetId: string) => Promise<void>
  isHydrating: boolean
  hydrationError: string | null

  // Actions - Reset
  resetProject: () => void
}

// ─── Initial State (data only, no actions) ───────────────────

const initialState = {
  projectId: 'cosmos-angre-vol3',
  projectName: 'Cosmos Angre — Vol.3 Parcours Client',

  floors: [] as Floor[],
  activeFloorId: '',
  transitions: [] as TransitionNode[],

  zones: [] as Zone[],
  pois: [] as POI[],
  signageItems: [] as SignageItem[],
  moments: [] as MomentCle[],

  navGraph: null as NavigationGraph | null,
  currentPath: null as PathResult | null,

  visitorProfiles: [] as VisitorProfile[],
  activeProfileId: null as string | null,

  heatmapData: null as number[][] | null,
  heatmapFloorId: null as string | null,

  memory: null as ProjectMemorySummary | null,

  chatMessages: [] as ChatMessage[],

  selectedEntityId: null as string | null,
  selectedEntityType: null as EntityType | null,
  showSignage: true,
  showWayfinding: true,
  showHeatmap: false,
  showMoments: true,
  showPmrOnly: false,

  libraryOpen: false,
  libraryTab: 'signage' as const,

  planImportState: null as PlanImportState | null,
  planImageUrls: {} as Record<string, string>,

  isHydrating: false,
  hydrationError: null as string | null,
} satisfies Record<string, unknown>

// ─── Store ───────────────────────────────────────────────────

export const useVol3Store = create<Vol3State>()((set) => ({
  ...initialState,

  // ── Floors ──────────────────────────────────────────────
  setActiveFloor: (floorId) => set({ activeFloorId: floorId }),
  addFloor: (floor) => set((s) => ({ floors: [...s.floors, floor] })),

  // ── POIs (with Supabase persist) ────────────────────────
  addPoi: (poi) => {
    set((s) => ({ pois: [...s.pois, poi] }))
    const pid = useVol3Store.getState().projectId
    void persistEntity('pois', mapPoiToDB(poi, pid))
  },
  updatePoi: (id, updates) => {
    set((s) => ({ pois: s.pois.map((p) => (p.id === id ? { ...p, ...updates } : p)) }))
    const s = useVol3Store.getState()
    const poi = s.pois.find(p => p.id === id)
    if (poi) void persistEntity('pois', mapPoiToDB(poi, s.projectId))
  },
  deletePoi: (id) => {
    set((s) => ({ pois: s.pois.filter((p) => p.id !== id) }))
    void deleteEntity('pois', id)
  },
  setPois: (pois) => set({ pois }),

  // ── Signage (with Supabase persist) ─────────────────────
  addSignageItem: (item) => {
    set((s) => ({ signageItems: [...s.signageItems, item] }))
    const pid = useVol3Store.getState().projectId
    void persistEntity('signage_items', mapSignageToDB(item, pid))
  },
  updateSignageItem: (id, updates) => {
    set((s) => ({ signageItems: s.signageItems.map((si) => si.id === id ? { ...si, ...updates } : si) }))
    const s = useVol3Store.getState()
    const item = s.signageItems.find(si => si.id === id)
    if (item) void persistEntity('signage_items', mapSignageToDB(item, s.projectId))
  },
  deleteSignageItem: (id) => {
    set((s) => ({ signageItems: s.signageItems.filter((si) => si.id !== id) }))
    void deleteEntity('signage_items', id)
  },
  setSignageItems: (items) => set({ signageItems: items }),

  // ── Moments ─────────────────────────────────────────────
  setMoments: (moments) => set({ moments }),

  // ── Navigation ──────────────────────────────────────────
  setNavGraph: (graph) => set({ navGraph: graph }),
  setCurrentPath: (path) => set({ currentPath: path }),

  // ── Heatmap ─────────────────────────────────────────────
  setHeatmapData: (data, floorId) =>
    set({ heatmapData: data, heatmapFloorId: floorId ?? null }),

  // ── Memory ──────────────────────────────────────────────
  setMemory: (memory) => set({ memory }),

  // ── Chat ────────────────────────────────────────────────
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),

  // ── UI ──────────────────────────────────────────────────
  selectEntity: (id, type) =>
    set({ selectedEntityId: id, selectedEntityType: type }),
  toggleSignage: () => set((s) => ({ showSignage: !s.showSignage })),
  toggleWayfinding: () => set((s) => ({ showWayfinding: !s.showWayfinding })),
  toggleHeatmap: () => set((s) => ({ showHeatmap: !s.showHeatmap })),
  toggleMoments: () => set((s) => ({ showMoments: !s.showMoments })),
  togglePmrOnly: () => set((s) => ({ showPmrOnly: !s.showPmrOnly })),
  setLibraryOpen: (open) => set({ libraryOpen: open }),
  setLibraryTab: (tab) => set({ libraryTab: tab }),

  // ── Profiles ────────────────────────────────────────────
  setActiveProfile: (id) => set({ activeProfileId: id }),

  // ── Orchestration actions (PRD) ───────────────────────
  autoPlaceSignaletics: async (floorId) => {
    const s = useVol3Store.getState()
    const floor = s.floors.find(f => f.id === floorId)
    if (!floor) return
    const items = optimizeSignaleticsPlacement(floor, s.navGraph, s.signageItems.filter(si => si.floorId === floorId))
    set(st => ({ signageItems: [...st.signageItems, ...items] }))
  },

  calculateSignaleticsSpecs: (signageId) => {
    const s = useVol3Store.getState()
    const item = s.signageItems.find(si => si.id === signageId)
    if (!item) return
    const zone = s.zones.find(z => z.floorId === item.floorId) ?? s.zones[0]
    if (!zone) return
    const spec = calculateSignaleticsSpec(
      { x: item.x, y: item.y }, zone, 4, 3.5, item.orientationDeg, item.maxReadingDistanceM || 10
    )
    set(st => ({
      signageItems: st.signageItems.map(si =>
        si.id === signageId
          ? { ...si, poseHeightM: spec.poseHeightM, textHeightMm: spec.textHeightMm, maxReadingDistanceM: spec.maxReadingDistanceM, isLuminous: spec.isLuminousRequired, requiresBAES: spec.isBAESRequired, normRef: spec.normRef, capexFcfa: spec.capexFcfa }
          : si
      ),
    }))
  },

  generateParcours: () => {
    const s = useVol3Store.getState()
    const moments = generateParcours(s.zones, s.pois)
    set({ moments })
  },

  buildGraph: async (_floorId) => {
    const s = useVol3Store.getState()
    const nodes: NavigationNode[] = []
    const edges: NavigationEdge[] = []
    const interFloorEdges: InterFloorEdge[] = []
    for (const poi of s.pois) {
      nodes.push({ id: `nav-${poi.id}`, x: poi.x, y: poi.y, floorId: poi.floorId, poiId: poi.id, label: poi.label, isTransition: false })
    }
    for (const tr of s.transitions) {
      const fromFloorId = s.floors.find(f => f.level === tr.fromFloor)?.id ?? ''
      const toFloorId = s.floors.find(f => f.level === tr.toFloor)?.id ?? ''
      nodes.push({ id: `nav-tr-${tr.id}-from`, x: tr.x, y: tr.y, floorId: fromFloorId, label: tr.label, isTransition: true })
      nodes.push({ id: `nav-tr-${tr.id}-to`, x: tr.x, y: tr.y, floorId: toFloorId, label: tr.label, isTransition: true })
      interFloorEdges.push({ id: `ife-${tr.id}`, fromNodeId: `nav-tr-${tr.id}-from`, toNodeId: `nav-tr-${tr.id}-to`, transitionId: tr.id, timeSec: 60 / (tr.capacityPerMin || 30), pmr: tr.pmr })
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].floorId === nodes[j].floorId) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 80) edges.push({ id: `edge-${i}-${j}`, from: nodes[i].id, to: nodes[j].id, distanceM: dist, pmr: true, floorId: nodes[i].floorId })
        }
      }
    }
    set({ navGraph: { nodes, edges, floorId: s.activeFloorId, interFloorEdges } })
  },

  calculateWayfinding: (fromId, toId, pmrOnly) => {
    const s = useVol3Store.getState()
    if (!s.navGraph) return null
    const fromNode = s.navGraph.nodes.find(n => n.poiId === fromId || n.id === fromId)
    const toNode = s.navGraph.nodes.find(n => n.poiId === toId || n.id === toId)
    if (!fromNode || !toNode) return null

    // A* pathfinding — heuristique Manhattan
    const heuristic = (a: NavigationNode, b: NavigationNode) =>
      Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

    const openSet = new Set<string>([fromNode.id])
    const cameFrom = new Map<string, string>()
    const gScore = new Map<string, number>()
    const fScore = new Map<string, number>()
    const nodeMap = new Map(s.navGraph.nodes.map(n => [n.id, n]))

    gScore.set(fromNode.id, 0)
    fScore.set(fromNode.id, heuristic(fromNode, toNode))

    while (openSet.size > 0) {
      // Noeud avec le fScore le plus bas
      let current = ''
      let bestF = Infinity
      for (const id of openSet) {
        const f = fScore.get(id) ?? Infinity
        if (f < bestF) { bestF = f; current = id }
      }

      if (current === toNode.id) {
        // Reconstruire le chemin
        const pathIds: string[] = []
        let node = current
        while (cameFrom.has(node)) { pathIds.unshift(node); node = cameFrom.get(node)! }
        pathIds.unshift(fromNode.id)
        const pathNodes = pathIds.map(id => nodeMap.get(id)!).filter(Boolean)
        const totalDist = gScore.get(toNode.id) ?? 0
        const allPmr = pmrOnly // Si PMR exige, le chemin est filtre en amont
        const result: PathResult = {
          path: pathNodes,
          totalDistanceM: Math.round(totalDist * 10) / 10,
          totalTimeSec: Math.round(totalDist / 1.2),
          floorsTraversed: [...new Set(pathNodes.map(n => n.floorId))] as FloorLevel[],
          pmrCompliant: allPmr || !pmrOnly,
          instructions: pathNodes.map((n, i) => i === 0 ? `Depart : ${n.label ?? 'Point'}` : `-> ${n.label ?? 'Point'}`),
        }
        set({ currentPath: result })
        return result
      }

      openSet.delete(current)

      // Voisins via aretes intra-etage
      const neighbors = s.navGraph!.edges
        .filter(e => (e.from === current || e.to === current) && (!pmrOnly || e.pmr))
        .map(e => ({ nodeId: e.from === current ? e.to : e.from, dist: e.distanceM }))

      // Voisins via aretes inter-etages
      const ifeNeighbors = s.navGraph!.interFloorEdges
        .filter(e => (e.fromNodeId === current || e.toNodeId === current) && (!pmrOnly || e.pmr))
        .map(e => ({ nodeId: e.fromNodeId === current ? e.toNodeId : e.fromNodeId, dist: e.timeSec * 1.2 }))

      for (const nb of [...neighbors, ...ifeNeighbors]) {
        const tentativeG = (gScore.get(current) ?? Infinity) + nb.dist
        if (tentativeG < (gScore.get(nb.nodeId) ?? Infinity)) {
          cameFrom.set(nb.nodeId, current)
          gScore.set(nb.nodeId, tentativeG)
          const nextNode = nodeMap.get(nb.nodeId)
          if (nextNode) {
            fScore.set(nb.nodeId, tentativeG + heuristic(nextNode, toNode))
            openSet.add(nb.nodeId)
          }
        }
      }
    }

    return null // Aucun chemin trouve
  },

  simulateProfile: async (profileId) => {
    const s = useVol3Store.getState()
    const profile = s.visitorProfiles.find(p => p.id === profileId)
    if (!profile || !s.navGraph) return
    const attractorPois = s.pois.filter(p => profile.attractors.includes(p.type))
    if (attractorPois.length < 2) return
    const path: NavigationNode[] = []
    for (const poi of attractorPois) {
      const node = s.navGraph.nodes.find(n => n.poiId === poi.id)
      if (node) path.push(node)
    }
    const totalDist = path.reduce((acc, n, i) => i === 0 ? 0 : acc + Math.sqrt((n.x - path[i - 1].x) ** 2 + (n.y - path[i - 1].y) ** 2), 0)
    set({ currentPath: { path, totalDistanceM: totalDist, totalTimeSec: totalDist / profile.speed, floorsTraversed: [...new Set(path.map(n => n.floorId))] as FloorLevel[], pmrCompliant: !profile.pmrRequired, instructions: path.map((n, i) => i === 0 ? `Depart : ${n.label ?? '?'}` : `-> ${n.label ?? '?'}`) }, activeProfileId: profileId })
  },

  generateHeatmap: async (_scenario) => {
    const s = useVol3Store.getState()
    const floor = s.floors.find(f => f.id === s.activeFloorId)
    if (!floor) return
    const gridW = 20, gridH = 15
    const heatmap: number[][] = Array.from({ length: gridH }, () => Array(gridW).fill(0))
    for (const poi of s.pois.filter(p => p.floorId === s.activeFloorId)) {
      const gx = Math.floor((poi.x / floor.widthM) * gridW)
      const gy = Math.floor((poi.y / floor.heightM) * gridH)
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = gx + dx, ny = gy + dy
        if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) heatmap[ny][nx] += Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 3) * 100
      }
    }
    set({ heatmapData: heatmap, heatmapFloorId: s.activeFloorId })
  },

  // ── Export actions (PRD) ──────────────────────────────
  exportSignaleticsPDF: async () => {
    const s = useVol3Store.getState()
    const data = { projectName: s.projectName, generatedAt: new Date().toISOString(), floors: s.floors, zones: s.zones, pois: s.pois, signageItems: s.signageItems, parcours: s.moments, navigationGraph: s.navGraph ?? { nodes: [], edges: [], floorId: s.activeFloorId, interFloorEdges: [] }, visitorProfiles: s.visitorProfiles }
    const blob = await exportSignaletiquePDF(data, null)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'Plan_Signaletique.pdf'; a.click()
    URL.revokeObjectURL(url)
  },

  exportParcoursReport: async () => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')
    const s = useVol3Store.getState()
    const doc = new Document({ sections: [{ children: [
      new Paragraph({ text: `Rapport Parcours Client — ${s.projectName}`, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: `Date : ${new Date().toLocaleDateString('fr-FR')}`, spacing: { after: 200 } }),
      ...s.moments.flatMap(m => [
        new Paragraph({ text: `Moment ${m.number} — ${m.name}`, heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [new TextRun({ text: `KPI : ${m.kpi}` })] }),
        new Paragraph({ children: [new TextRun({ text: `Friction : ${m.friction}` })] }),
        new Paragraph({ children: [new TextRun({ text: `Recommandation : ${m.recommendation}` })] }),
        ...(m.cosmosClubAction ? [new Paragraph({ children: [new TextRun({ text: `Cosmos Club : ${m.cosmosClubAction}` })] })] : []),
      ]),
    ] }] })
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'Rapport_Parcours_Client.docx'; a.click()
    URL.revokeObjectURL(url)
  },

  exportQRCodes: async () => {
    const s = useVol3Store.getState()
    const blob = await exportQRCodesPDF(s.pois)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'QR_Codes_POI.pdf'; a.click()
    URL.revokeObjectURL(url)
  },

  exportWayfindingPDF: async () => {
    const { jsPDF } = await import('jspdf')
    const s = useVol3Store.getState()
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    doc.setFontSize(18); doc.text(`Wayfinding — ${s.projectName}`, 20, 20)
    doc.setFontSize(10); doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 20, 30)
    doc.text(`POIs : ${s.pois.length} | Signaletique : ${s.signageItems.length}`, 20, 38)
    if (s.navGraph) { doc.text(`Noeuds : ${s.navGraph.nodes.length} | Aretes : ${s.navGraph.edges.length}`, 20, 46) }
    let y = 60; doc.setFontSize(14); doc.text('Points d\'interet', 20, y); y += 10; doc.setFontSize(9)
    for (const poi of s.pois) { if (y > 270) { doc.addPage(); y = 20 }; doc.text(`${poi.label} (${poi.type}) — PMR: ${poi.pmr ? 'Oui' : 'Non'}`, 20, y); y += 6 }
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'Wayfinding_Report.pdf'; a.click()
    URL.revokeObjectURL(url)
  },

  // ── Plan reader ─────────────────────────────────────────
  importPlan: async (file, floorId) => {
    const result = await importPlanOrchestrator(file, floorId, {
      onProgress: (s) => set({ planImportState: s }),
    })
    set({ planImportState: result })
    if (result.calibration && result.calibration.realWidthM > 0 && result.calibration.realHeightM > 0) {
      set(s => ({
        floors: s.floors.map(f =>
          f.id === floorId
            ? { ...f, widthM: result.calibration!.realWidthM, heightM: result.calibration!.realHeightM }
            : f
        ),
      }))
    }
    if (result.detectedZones.length > 0) {
      const newZones = result.detectedZones.map((rz, idx) => ({
        id: rz.id ?? `import-zone-${idx}`,
        floorId,
        label: rz.label,
        type: rz.estimatedType,
        x: rz.boundingBox.x,
        y: rz.boundingBox.y,
        w: rz.boundingBox.w,
        h: rz.boundingBox.h,
        niveau: 2 as const,
        color: rz.color ?? '#E0E0E0',
      }))
      set(s => ({ zones: [...s.zones, ...newZones] }))
    }
  },

  setPlanImportState: (state) => set({ planImportState: state }),
  setPlanImageUrl: (floorId, url) => set((s) => ({ planImageUrls: { ...s.planImageUrls, [floorId]: url } })),

  // ── Supabase hydration ─────────────────────────────────
  hydrateFromSupabase: async (projetId) => {
    set({ isHydrating: true, hydrationError: null })
    try {
      const data = await loadProjectFromSupabase(projetId)
      if (data && (data.floors.length > 0 || data.pois.length > 0)) {
        set({
          projectId: projetId,
          floors: data.floors,
          activeFloorId: data.floors[0]?.id ?? '',
          zones: data.zones,
          pois: data.pois,
          signageItems: data.signageItems,
          transitions: data.transitions,
          moments: generateParcours(data.zones, data.pois),
          isHydrating: false,
        })
      } else if (shouldUseMockData()) {
        // No data in Supabase — fall back to mock data for demo (dev only)
        set({
          projectId: projetId,
          floors: MOCK_FLOORS,
          activeFloorId: 'floor-rdc',
          transitions: MOCK_TRANSITIONS,
          zones: MOCK_ZONES,
          pois: MOCK_POIS,
          signageItems: MOCK_SIGNAGE,
          moments: MOCK_MOMENTS,
          isHydrating: false,
        })
      } else {
        // Production: start empty — user will import or create data
        set({ projectId: projetId, isHydrating: false })
      }
    } catch (err) {
      console.warn('[Vol3Store] Hydration failed:', err)
      if (shouldUseMockData()) {
        set({
          floors: MOCK_FLOORS,
          activeFloorId: 'floor-rdc',
          transitions: MOCK_TRANSITIONS,
          zones: MOCK_ZONES,
          pois: MOCK_POIS,
          signageItems: MOCK_SIGNAGE,
          moments: MOCK_MOMENTS,
          isHydrating: false,
          hydrationError: err instanceof Error ? err.message : 'Erreur de chargement',
        })
      } else {
        set({
          isHydrating: false,
          hydrationError: err instanceof Error ? err.message : 'Erreur de chargement',
        })
      }
    }
  },

  // ── Reset ───────────────────────────────────────────────
  resetProject: () => set(initialState),
}))
