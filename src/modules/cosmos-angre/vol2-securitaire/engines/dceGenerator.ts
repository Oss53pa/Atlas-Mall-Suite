// ═══ DCE GENERATOR — Dossier de Consultation des Entreprises Securite ═══

import type { Camera, Door, Zone, Floor } from '../../shared/proph3t/types'

// ── Types ────────────────────────────────────────────────────

export interface DCESecurite {
  metadata: DCEMetadata
  cct: CahierChargesTechniques
  bpu: BordereauPrixUnitaires
  planning: PlanningIntervention
  intervenants: string[]
}

export interface DCEMetadata {
  projectName: string
  destinataire: string
  dateEmission: string
  dateLimiteReponse: string
  referenceMarche: string
}

export interface CahierChargesTechniques {
  description: string
  specifications: EquipmentSpec[]
  normesApplicables: string[]
  conditionsInstallation: string
}

export interface EquipmentSpec {
  designation: string
  reference: string
  quantite: number
  specifications: string
  emplacement: string
}

export interface BordereauPrixUnitaires {
  items: BPUItem[]
  totalHtFcfa: number
  tvaFcfa: number
  totalTtcFcfa: number
}

export interface BPUItem {
  lot: string
  designation: string
  reference: string
  unite: string
  quantite: number
  prixUnitaireFcfa: number
  montantFcfa: number
}

export interface PlanningIntervention {
  phases: {
    name: string
    durationDays: number
    tasks: string[]
  }[]
  dureeTotaleJours: number
}

// ── TVA Cote d'Ivoire ────────────────────────────────────────

const TVA_CI = 0.18

// ── Camera catalog prices (FCFA) ─────────────────────────────

const CAMERA_PRICES: Record<string, number> = {
  'XNV-8080R':  850_000,
  'XNV-6120':   1_200_000,
  'XNP-9250':   2_800_000,
  'XND-6080RV': 650_000,
  'DS-2CD2143G2': 450_000,
  'DS-2DE4425IW': 1_800_000,
  'DH-IPC-HFW2831T': 380_000,
}

const DEFAULT_CAMERA_PRICE = 750_000

// ── Door catalog prices (FCFA) ───────────────────────────────

const DOOR_PRICES: Record<string, number> = {
  'DORMA ES200':    1_200_000,
  'ASSA ABLOY PB1000': 850_000,
  'CAME BPT':       2_500_000,
  'SUPREMA BioEntry': 1_600_000,
  'ABLOY PROTEC2':  2_200_000,
}

const DEFAULT_DOOR_PRICE = 1_200_000

// ── Generate DCE ─────────────────────────────────────────────

export function generateDCESecurite(
  cameras: Camera[],
  doors: Door[],
  zones: Zone[],
  floors: Floor[],
  projectName: string,
  destinataire: string,
  dateLimiteReponse: string
): DCESecurite {
  const now = new Date().toISOString().slice(0, 10)

  // ── CCT ──
  const cameraSpecs: EquipmentSpec[] = groupBy(cameras, (c) => c.model).map(([model, cams]) => ({
    designation: `Camera ${model}`,
    reference: model,
    quantite: cams.length,
    specifications: `FOV ${cams[0]?.fov ?? 109}°, portee ${cams[0]?.rangeM ?? 14}m, IP66/IK10`,
    emplacement: cams.map((c) => c.label).join(', '),
  }))

  const doorSpecs: EquipmentSpec[] = groupBy(doors, (d) => d.ref).map(([ref, ds]) => ({
    designation: `Porte ${ref}`,
    reference: ref,
    quantite: ds.length,
    specifications: `Largeur ${ds[0]?.widthM ?? 0.9}m${ds[0]?.hasBadge ? ', badge' : ''}${ds[0]?.hasBiometric ? ', biometrie' : ''}${ds[0]?.hasSas ? ', SAS' : ''}`,
    emplacement: ds.map((d) => d.label).join(', '),
  }))

  const cct: CahierChargesTechniques = {
    description:
      `Fourniture, installation et mise en service d'un systeme de videosurveillance et de controle d'acces ` +
      `pour le centre commercial ${projectName}. Le systeme comprend ${cameras.length} cameras de surveillance ` +
      `reparties sur ${floors.length} niveaux et ${doors.length} points de controle d'acces. ` +
      `La prestation inclut le cablage, la configuration, la mise en service, la formation ` +
      `du personnel de securite et la maintenance pendant 12 mois.`,
    specifications: [...cameraSpecs, ...doorSpecs],
    normesApplicables: [
      'APSAD R82 — Videosurveillance (reference professionnelle)',
      'EN 62676-1 — Systemes de videosurveillance',
      'EN 62676-4 — Exigences d\'application',
      'ISO 22341 — Securite et resilience des sites',
      'NF S 61-938 — Securite incendie ERP type M',
      'Reglementation securite privee CNSP CI',
    ],
    conditionsInstallation:
      `Installation en dehors des heures d'ouverture commerciale. ` +
      `Alimentation electrique secourisee (onduleur minimum 4h). ` +
      `Cablage cat6A blinde pour toutes les cameras IP. ` +
      `Hauteur de pose cameras : 3.5m minimum en zones publiques. ` +
      `Conformite aux normes de construction locales (permis requis).`,
  }

  // ── BPU ──
  const bpuItems: BPUItem[] = []

  // Lot 1: Materiel cameras
  for (const [model, cams] of groupBy(cameras, (c) => c.model)) {
    const prixUnit = CAMERA_PRICES[model] ?? DEFAULT_CAMERA_PRICE
    bpuItems.push({
      lot: 'Lot 1 — Videosurveillance',
      designation: `Camera ${model}`,
      reference: model,
      unite: 'U',
      quantite: cams.length,
      prixUnitaireFcfa: prixUnit,
      montantFcfa: prixUnit * cams.length,
    })
  }

  // NVR (1 per 32 cameras)
  const nvrCount = Math.ceil(cameras.length / 32)
  bpuItems.push({
    lot: 'Lot 1 — Videosurveillance',
    designation: 'NVR 32 voies + disques',
    reference: 'NVR-32CH-8TB',
    unite: 'U',
    quantite: nvrCount,
    prixUnitaireFcfa: 3_500_000,
    montantFcfa: 3_500_000 * nvrCount,
  })

  // Cablage (50m avg per camera)
  bpuItems.push({
    lot: 'Lot 1 — Videosurveillance',
    designation: 'Cable Cat6A blinde + connectique',
    reference: 'CAT6A-STP',
    unite: 'ml',
    quantite: cameras.length * 50,
    prixUnitaireFcfa: 2_500,
    montantFcfa: cameras.length * 50 * 2_500,
  })

  // Lot 2: Controle d'acces
  for (const [ref, ds] of groupBy(doors, (d) => d.ref)) {
    const prixUnit = DOOR_PRICES[ref] ?? DEFAULT_DOOR_PRICE
    bpuItems.push({
      lot: 'Lot 2 — Controle d\'acces',
      designation: `Equipement porte ${ref}`,
      reference: ref,
      unite: 'U',
      quantite: ds.length,
      prixUnitaireFcfa: prixUnit,
      montantFcfa: prixUnit * ds.length,
    })
  }

  // Lot 3: Main d'oeuvre
  const moInstallation = Math.ceil((cameras.length + doors.length) * 0.5) // jours-homme
  bpuItems.push({
    lot: 'Lot 3 — Installation',
    designation: 'Main d\'oeuvre installation + cablage',
    reference: 'MO-INSTALL',
    unite: 'jour/homme',
    quantite: moInstallation,
    prixUnitaireFcfa: 85_000,
    montantFcfa: moInstallation * 85_000,
  })

  // Lot 4: Mise en service + formation
  bpuItems.push({
    lot: 'Lot 4 — Mise en service',
    designation: 'Mise en service, parametrage, formation (5 jours)',
    reference: 'MES-FORM',
    unite: 'forfait',
    quantite: 1,
    prixUnitaireFcfa: 2_500_000,
    montantFcfa: 2_500_000,
  })

  // Lot 5: Maintenance an 1
  bpuItems.push({
    lot: 'Lot 5 — Maintenance',
    designation: 'Contrat maintenance preventive 12 mois',
    reference: 'MAINT-12M',
    unite: 'forfait',
    quantite: 1,
    prixUnitaireFcfa: 4_000_000,
    montantFcfa: 4_000_000,
  })

  const totalHt = bpuItems.reduce((s, i) => s + i.montantFcfa, 0)
  const tva = Math.round(totalHt * TVA_CI)

  const bpu: BordereauPrixUnitaires = {
    items: bpuItems,
    totalHtFcfa: totalHt,
    tvaFcfa: tva,
    totalTtcFcfa: totalHt + tva,
  }

  // ── Planning ──
  const planning: PlanningIntervention = {
    phases: [
      {
        name: 'Phase 1 — Etude d\'execution',
        durationDays: 10,
        tasks: [
          'Visite de site et releve',
          'Plan d\'execution detaille',
          'Validation du plan d\'execution',
        ],
      },
      {
        name: 'Phase 2 — Approvisionnement',
        durationDays: 21,
        tasks: [
          'Commande du materiel',
          'Reception et controle',
          'Stockage sur site',
        ],
      },
      {
        name: 'Phase 3 — Installation',
        durationDays: Math.max(14, Math.ceil((cameras.length + doors.length) / 8)),
        tasks: [
          'Tirage de cables',
          'Pose des cameras et supports',
          'Installation controle d\'acces',
          'Raccordements electriques',
        ],
      },
      {
        name: 'Phase 4 — Mise en service',
        durationDays: 5,
        tasks: [
          'Configuration NVR et cameras',
          'Parametrage controle d\'acces',
          'Tests de fonctionnement',
          'Formation equipe securite',
          'Recette et PV de reception',
        ],
      },
    ],
    dureeTotaleJours: 0,
  }
  planning.dureeTotaleJours = planning.phases.reduce((s, p) => s + p.durationDays, 0)

  return {
    metadata: {
      projectName,
      destinataire,
      dateEmission: now,
      dateLimiteReponse,
      referenceMarche: `DCE-SEC-${now.replace(/-/g, '')}`,
    },
    cct,
    bpu,
    planning,
    intervenants: [
      'Electricien agree (habilitation B2V)',
      'Technicien IP videosurveillance certifie',
      'Installateur controle d\'acces (formation fabricant)',
      'Chef de projet securite (experience ERP > 3 ans)',
      'Bureau de controle (verification finale)',
    ],
  }
}

// ── Utility ──────────────────────────────────────────────────

function groupBy<T>(arr: T[], keyFn: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const item of arr) {
    const key = keyFn(item)
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }
  return Array.from(map.entries())
}
