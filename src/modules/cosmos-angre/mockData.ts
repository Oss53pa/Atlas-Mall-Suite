// ═══ MOCK DATA — Atlas Mall Suite — Cosmos Angre ═══

import type {
  Floor, TransitionNode, Zone, Camera, Door, POI, SignageItem,
  CameraModel
} from './shared/proph3t/types'

// ═══ FLOORS ═══

export const MOCK_FLOORS: Floor[] = [
  { id: 'f-b1',  projectId: 'cosmos-angre', level: 'B1',  order: 0, widthM: 110, heightM: 75,  zones: [], transitions: [] },
  { id: 'f-rdc', projectId: 'cosmos-angre', level: 'RDC', order: 1, widthM: 120, heightM: 80,  zones: [], transitions: [] },
  { id: 'f-r1',  projectId: 'cosmos-angre', level: 'R+1', order: 2, widthM: 100, heightM: 70,  zones: [], transitions: [] },
]

// ═══ TRANSITIONS ═══

export const MOCK_TRANSITIONS: TransitionNode[] = [
  { id: 't1', type: 'ascenseur',            fromFloor: 'B1',  toFloor: 'R+1', x: 0.49, y: 0.50, pmr: true,  capacityPerMin: 17,  label: 'Ascenseur Central' },
  { id: 't2', type: 'escalator_montant',    fromFloor: 'B1',  toFloor: 'RDC', x: 0.40, y: 0.55, pmr: false, capacityPerMin: 90,  label: 'Escalator Parking \u2191' },
  { id: 't3', type: 'escalator_descendant', fromFloor: 'RDC', toFloor: 'B1',  x: 0.42, y: 0.55, pmr: false, capacityPerMin: 90,  label: 'Escalator Parking \u2193' },
  { id: 't4', type: 'escalier_fixe',        fromFloor: 'RDC', toFloor: 'R+1', x: 0.20, y: 0.55, pmr: false, capacityPerMin: 60,  label: 'Escalier Nord' },
  { id: 't5', type: 'escalier_fixe',        fromFloor: 'RDC', toFloor: 'R+1', x: 0.78, y: 0.55, pmr: false, capacityPerMin: 60,  label: 'Escalier Sud' },
  { id: 't6', type: 'escalier_secours',     fromFloor: 'R+1', toFloor: 'RDC', x: 0.05, y: 0.30, pmr: false, capacityPerMin: 60,  label: 'Escalier Secours NW' },
  { id: 't7', type: 'rampe_pmr',            fromFloor: 'B1',  toFloor: 'RDC', x: 0.08, y: 0.65, pmr: true,  capacityPerMin: 30,  label: 'Rampe PMR Parking' },
]

// ═══ ZONES ═══

export const MOCK_ZONES_RDC: Zone[] = [
  { id: 'z1', floorId: 'f-rdc', label: 'Parking B1',            type: 'parking',      x: 0.05, y: 0.68, w: 0.40, h: 0.28, niveau: 1, color: '#1e3a5f' },
  { id: 'z2', floorId: 'f-rdc', label: 'Galerie Nord RDC',      type: 'commerce',     x: 0.05, y: 0.08, w: 0.38, h: 0.42, niveau: 2, color: '#0a2a15' },
  { id: 'z3', floorId: 'f-rdc', label: 'Galerie Sud RDC',       type: 'commerce',     x: 0.55, y: 0.08, w: 0.38, h: 0.42, niveau: 2, color: '#0a2a15' },
  { id: 'z4', floorId: 'f-rdc', label: 'Food Court R+1',        type: 'restauration', x: 0.18, y: 0.28, w: 0.55, h: 0.22, niveau: 2, color: '#2a0f00' },
  { id: 'z5', floorId: 'f-rdc', label: 'Locaux Techniques',     type: 'technique',    x: 0.85, y: 0.60, w: 0.12, h: 0.35, niveau: 4, color: '#1a0a2e', lux: 80 },
  { id: 'z6', floorId: 'f-rdc', label: 'Back-Office Direction', type: 'backoffice',   x: 0.55, y: 0.68, w: 0.28, h: 0.28, niveau: 4, color: '#1a0a1a' },
  { id: 'z7', floorId: 'f-rdc', label: 'Entree Principale',     type: 'circulation',  x: 0.10, y: 0.04, w: 0.15, h: 0.06, niveau: 1, color: '#0a1a0a' },
  { id: 'z8', floorId: 'f-rdc', label: 'Circulations RDC',      type: 'circulation',  x: 0.44, y: 0.08, w: 0.10, h: 0.55, niveau: 1, color: '#0a1a0a' },
]

// ═══ CAMERAS ═══

export const MOCK_CAMERAS_RDC: Camera[] = [
  { id: 'c1', floorId: 'f-rdc', label: 'XNV-8080R 01', model: 'XNV-8080R',       x: 0.12, y: 0.10, angle: 180, fov: 109, range: 0.12, rangeM: 14, color: '#3b82f6', note: 'Entree principale nord',  priority: 'haute',    autoPlaced: false, capexFcfa: 850_000 },
  { id: 'c2', floorId: 'f-b1',  label: 'PTZ-P3 01',    model: 'PTZ QNP-9300RWB', x: 0.15, y: 0.72, angle: 135, fov: 120, range: 0.18, rangeM: 22, color: '#06b6d4', note: 'Parking secteur A',      priority: 'haute',    autoPlaced: false, capexFcfa: 2_800_000 },
  { id: 'c3', floorId: 'f-b1',  label: 'PTZ-P3 02',    model: 'PTZ QNP-9300RWB', x: 0.35, y: 0.72, angle: 225, fov: 120, range: 0.18, rangeM: 22, color: '#06b6d4', note: 'Parking secteur B',      priority: 'haute',    autoPlaced: false, capexFcfa: 2_800_000 },
  { id: 'c4', floorId: 'f-rdc', label: 'QNV-8080R 01', model: 'QNV-8080R',       x: 0.86, y: 0.62, angle: 180, fov: 109, range: 0.10, rangeM: 12, color: '#8b5cf6', note: 'Local technique',        priority: 'critique', autoPlaced: false, capexFcfa: 920_000 },
]

// ═══ POIS ═══

export const MOCK_POIS_RDC: POI[] = [
  { id: 'p1',  floorId: 'f-rdc', label: 'Entree Principale',   type: 'sortie',         x: 0.12, y: 0.04, pmr: true,  color: '#ef4444', icon: '\ud83d\udeaa', note: '' },
  { id: 'p2',  floorId: 'f-rdc', label: 'Carrefour Market',    type: 'enseigne',       x: 0.22, y: 0.25, pmr: true,  color: '#22c55e', icon: '\ud83c\udfea', note: 'Enseigne ancre alimentaire' },
  { id: 'p3',  floorId: 'f-rdc', label: 'ibis Styles',         type: 'hotel',          x: 0.72, y: 0.22, pmr: false, color: '#22c55e', icon: '\ud83c\udfe8', note: 'Hotel 3*' },
  { id: 'p4',  floorId: 'f-rdc', label: 'Adagio Aparthotel',   type: 'hotel',          x: 0.80, y: 0.22, pmr: true,  color: '#22c55e', icon: '\ud83c\udfe8', note: 'Residence hoteliere' },
  { id: 'p5',  floorId: 'f-rdc', label: 'Cosmos Club Desk',    type: 'cosmos_club',    x: 0.45, y: 0.12, pmr: true,  color: '#f59e0b', icon: '\u2b50', cosmosClubOffre: 'Inscription gratuite + 200 points bienvenue' },
  { id: 'p6',  floorId: 'f-rdc', label: 'Toilettes RDC Nord',  type: 'toilettes',      x: 0.30, y: 0.45, pmr: true,  color: '#3b82f6', icon: '\ud83d\udebb', note: '' },
  { id: 'p7',  floorId: 'f-rdc', label: 'Toilettes RDC Sud',   type: 'toilettes',      x: 0.70, y: 0.45, pmr: true,  color: '#3b82f6', icon: '\ud83d\udebb', note: '' },
  { id: 'p8',  floorId: 'f-rdc', label: 'Ascenseur Central',   type: 'ascenseur',      x: 0.49, y: 0.50, pmr: true,  color: '#8b5cf6', icon: '\ud83d\uded7', note: 'Acces B1-R+1', linkedFloorId: 'f-b1' },
  { id: 'p9',  floorId: 'f-rdc', label: 'Totem Entree',        type: 'totem',          x: 0.18, y: 0.14, pmr: false, color: '#06b6d4', icon: '\ud83d\udccd', note: 'Signaletique directionnelle principale' },
  { id: 'p10', floorId: 'f-rdc', label: 'Totem Food Court',    type: 'totem',          x: 0.45, y: 0.28, pmr: false, color: '#06b6d4', icon: '\ud83d\udccd', note: 'Direction restauration R+1' },
  { id: 'p11', floorId: 'f-rdc', label: 'Sortie Secours Nord', type: 'sortie_secours', x: 0.05, y: 0.50, pmr: false, color: '#ef4444', icon: '\ud83c\udd98', note: 'NF EN 1125' },
  { id: 'p12', floorId: 'f-rdc', label: 'Sortie Secours Sud',  type: 'sortie_secours', x: 0.93, y: 0.50, pmr: false, color: '#ef4444', icon: '\ud83c\udd98', note: 'NF EN 1125' },
]

// ═══ SIGNAGE ═══

export const MOCK_SIGNAGE_RDC: SignageItem[] = [
  { id: 's1', floorId: 'f-rdc', type: 'totem_3m',             x: 0.18, y: 0.14, orientationDeg: 0,   poseHeightM: 0,    textHeightMm: 75,  maxReadingDistanceM: 15, visibilityScore: 88, isLuminous: false, requiresBAES: false, content: 'Plan du mall - Parking - Sorties',   ref: 'TOTEM-3M',          capexFcfa: 1_800_000, normRef: 'NF X 08-003', proph3tNote: 'Totem entree principale - flux > 500 pers/h',         autoPlaced: false },
  { id: 's2', floorId: 'f-rdc', type: 'panneau_dir_suspendu', x: 0.44, y: 0.12, orientationDeg: 90,  poseHeightM: 2.85, textHeightMm: 45,  maxReadingDistanceM: 9,  visibilityScore: 72, isLuminous: false, requiresBAES: false, content: 'Food Court R+1 \u2191 - Parking B1 \u2193', ref: 'PANNEAU-DIR-A',     capexFcfa: 180_000,   normRef: 'ISO 7010',    proph3tNote: 'Noeud de decision axe central',                     autoPlaced: true  },
  { id: 's3', floorId: 'f-rdc', type: 'sortie_secours_led',   x: 0.05, y: 0.50, orientationDeg: 270, poseHeightM: 2.20, textHeightMm: 0,   maxReadingDistanceM: 20, visibilityScore: 95, isLuminous: true,  requiresBAES: true,  content: 'SORTIE',                                 ref: 'SORTIE-SECOURS-LED', capexFcfa: 85_000,   normRef: 'NF EN 60598-2-22', proph3tNote: 'Lumineux obligatoire (lux < 200 couloir nord)', autoPlaced: false },
  { id: 's4', floorId: 'f-rdc', type: 'pictogramme_pmr',      x: 0.49, y: 0.48, orientationDeg: 0,   poseHeightM: 1.40, textHeightMm: 0,   maxReadingDistanceM: 5,  visibilityScore: 80, isLuminous: false, requiresBAES: false, content: '\u267f',                                ref: 'PICTOGRAMME-PMR',    capexFcfa: 18_000,   normRef: 'ISO 7001',    proph3tNote: 'Acces PMR ascenseur central',                       autoPlaced: true  },
]

// ═══ CAPEX PRICES ═══

export const MOCK_CAPEX_PRICES: Record<string, number> = {
  'XNV-8080R': 850_000, 'QNV-8080R': 920_000, 'PTZ QNP-9300RWB': 2_800_000,
  'PNM-9000VQ': 1_280_000, 'QNO-8080R': 780_000, 'XNF-9300RV': 1_150_000,
  'DS-2CD2T47G2': 620_000, 'IPC-HDW3849H': 580_000,
  'CAME BX-800': 650_000, 'DORMA ES200': 1_200_000, 'GEZE TS4000': 480_000,
  'REVER CF90': 720_000, 'ABLOY CL100': 1_450_000, 'SUPREMA BioEntry W2': 2_100_000,
  'SAGEM MA500+': 3_200_000, 'ASSA ABLOY PB1000': 380_000,
  'CAME GARD4': 890_000, 'CDVI ATEIS': 540_000,
  'TOTEM-3M': 1_800_000, 'TOTEM-5M': 3_200_000,
  'PANNEAU-DIR-A': 180_000, 'PANNEAU-DIR-B': 120_000,
  'BANNIERE-SUSPEND': 95_000, 'MARQUAGE-SOL': 45_000,
  'BORNE-INTERACTIVE': 4_500_000, 'SORTIE-SECOURS-LED': 85_000,
  'BLOC-AUTONOME': 120_000, 'PLAN-EVACUATION': 65_000,
  'RAMPE-PMR': 450_000, 'BALISAGE-PMR': 8_500,
  'MAIN-COURANTE': 85_000, 'BANC-INT-01': 280_000,
}
