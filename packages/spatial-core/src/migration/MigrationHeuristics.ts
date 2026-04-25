// ═══ MIGRATION HEURISTICS — Reclassification legacy → spatial-core ═══
//
// Pour chaque entité legacy (label + géométrie + product context), propose
// un EntityTypeId moderne avec un niveau de confiance.
//
// 11 règles thématiques (cf spec §7.2). La PREMIÈRE qui matche gagne.

import type { EntityTypeId } from '../domain/EntityType'
import type { Polygon, Polyline, Point2D, SpatialGeometry } from '../domain/SpatialEntity'
import { isPolygon, isPolyline } from '../domain/SpatialEntity'

export interface LegacyEntity {
  readonly id: string
  readonly projectId: string
  readonly type: string                 // souvent 'WALL' par défaut sur legacy
  readonly geometry: SpatialGeometry
  readonly label?: string
  readonly notes?: string
  readonly level?: string
  readonly createdAt: string
  readonly updatedAt: string
}

export type ProductContext =
  | 'mall_vol1' | 'mall_vol2' | 'mall_vol3' | 'mall_vol4'
  | 'wisefm' | 'atlas_lease'

export type Confidence = 'high' | 'medium' | 'low' | 'manual_review_needed'

export interface ClassificationResult {
  readonly newType: EntityTypeId
  readonly confidence: Confidence
  readonly heuristicApplied: string
  readonly alternativeTypes: ReadonlyArray<{ type: EntityTypeId; confidence: number }>
  readonly reasoning: string
}

// ─── Helpers ──────────────────────────────────────────────

function normalize(s: string | undefined): string {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function computeArea(poly: Polygon): number {
  const pts = poly.outer
  if (pts.length < 3) return 0
  let sum = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    sum += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return Math.abs(sum) / 2
}

function estimatePolylineThickness(_pl: Polyline): number | null {
  // Sans contexte plus large (ex: distance à un mur parallèle), on ne peut
  // pas estimer fiablement. Retourne null = inconnu.
  return null
}

// ─── Classifier ───────────────────────────────────────────

export class MigrationHeuristics {
  classify(legacy: LegacyEntity, productContext: ProductContext): ClassificationResult {
    const label = normalize(legacy.label) + ' ' + normalize(legacy.notes)
    const isPoly = isPolygon(legacy.geometry)
    const isLine = isPolyline(legacy.geometry)
    const area = isPoly ? computeArea(legacy.geometry as Polygon) : 0

    // ═══ Pré-passe produit-spécifique (priorité haute) ═══
    // Avant les règles génériques, on vérifie les patterns spécifiques au
    // contexte produit pour éviter qu'une règle générique (rule 2 = cheminement)
    // capture un cas qui devrait revenir à une règle spécialisée (rule 9 = PMR).
    const productResult = this.classifyByProductContext(label, productContext)
    if (productResult) return productResult

    // ─── RÈGLE 1 — Boutiques ────────────────────────────────
    if (isPoly && /\b(boutique|magasin|enseigne|local commercial|cellule)\b/.test(label) && area >= 5 && area <= 5000) {
      return {
        newType: 'BOUTIQUE_BOUNDARY',
        confidence: 'high',
        heuristicApplied: 'rule1_boutique_label_area',
        alternativeTypes: [{ type: 'LEASE_LOT_PRIVATE', confidence: 0.6 }],
        reasoning: `Label "${legacy.label}" + polygone aire ${area.toFixed(1)}m² ∈ [5,5000].`,
      }
    }

    // ─── RÈGLE 2 — Voies piétonnes ──────────────────────────
    if (isPoly && /\b(voie pieton|passage|allee|cheminement|esplanade|mall|galerie|promenade)\b/.test(label)) {
      return {
        newType: 'PEDESTRIAN_PATH',
        confidence: 'high',
        heuristicApplied: 'rule2_pedestrian',
        alternativeTypes: [],
        reasoning: `Label indique voie piétonne.`,
      }
    }

    // ─── RÈGLE 3 — Routes / circulation véhicule ────────────
    if (isPoly && /\b(route|voirie|chaussee|circulation|parking|stationnement|asphalte|bitume)\b/.test(label)) {
      const isParkingLabel = /\b(parking|stationnement)\b/.test(label)
      return {
        newType: isParkingLabel ? 'PARKING_SPACE' : 'VEHICLE_ROAD',
        confidence: 'high',
        heuristicApplied: 'rule3_road',
        alternativeTypes: [{ type: isParkingLabel ? 'VEHICLE_ROAD' : 'PARKING_SPACE', confidence: 0.4 }],
        reasoning: `Label voirie/parking.`,
      }
    }

    // ─── RÈGLE 4 — Espaces verts ────────────────────────────
    if (isPoly && /\b(jardin|espace vert|pelouse|gazon|massif|vegetation|parc)\b/.test(label)) {
      return {
        newType: 'GREEN_AREA',
        confidence: 'high',
        heuristicApplied: 'rule4_green',
        alternativeTypes: [{ type: 'GARDEN_BED', confidence: 0.5 }],
        reasoning: `Label espace vert.`,
      }
    }

    // ─── RÈGLE 5 — Terre-pleins ─────────────────────────────
    if (isPoly && /\b(terre[\s-]?plein|ilot|separateur)\b/.test(label)) {
      return {
        newType: 'TERRE_PLEIN',
        confidence: 'high',
        heuristicApplied: 'rule5_terreplein',
        alternativeTypes: [{ type: 'PLANTER', confidence: 0.5 }],
        reasoning: `Label terre-plein/îlot.`,
      }
    }

    // ─── RÈGLE 6 — Murs (polylines) ─────────────────────────
    if (isLine) {
      const thickness = estimatePolylineThickness(legacy.geometry as Polyline)
      if (thickness && thickness >= 0.20) {
        return { newType: 'WALL_STRUCTURAL', confidence: 'medium', heuristicApplied: 'rule6_thick_wall', alternativeTypes: [{ type: 'WALL_PARTITION', confidence: 0.3 }], reasoning: `Polyline épaisseur ${thickness}m → mur porteur.` }
      }
      if (thickness && thickness < 0.20) {
        return { newType: 'WALL_PARTITION', confidence: 'medium', heuristicApplied: 'rule6_thin_wall', alternativeTypes: [{ type: 'WALL_STRUCTURAL', confidence: 0.3 }], reasoning: `Polyline épaisseur ${thickness}m → cloison.` }
      }
      // Polyline sans épaisseur estimable
      return {
        newType: 'WALL_STRUCTURAL',
        confidence: 'low',
        heuristicApplied: 'rule6_polyline_default',
        alternativeTypes: [{ type: 'WALL_PARTITION', confidence: 0.4 }, { type: 'EVACUATION_PATH', confidence: 0.3 }],
        reasoning: `Polyline sans épaisseur connue. Défaut mur, à revoir.`,
      }
    }

    // ─── RÈGLE 7 — Vol.2 SAFETY ─────────────────────────────
    if (productContext === 'mall_vol2') {
      if (/\b(issue|sortie de secours|evacuation)\b/.test(label))
        return { newType: 'EMERGENCY_EXIT', confidence: 'high', heuristicApplied: 'rule7_exit', alternativeTypes: [], reasoning: 'Label sortie secours.' }
      if (/\b(ria|robinet incendie)\b/.test(label))
        return { newType: 'RIA', confidence: 'high', heuristicApplied: 'rule7_ria', alternativeTypes: [], reasoning: 'Label RIA.' }
      if (/\b(extincteur)\b/.test(label))
        return { newType: 'EXTINGUISHER', confidence: 'high', heuristicApplied: 'rule7_extinguisher', alternativeTypes: [], reasoning: 'Label extincteur.' }
      if (/\b(rassemblement|point de regroupement)\b/.test(label))
        return { newType: 'ASSEMBLY_POINT', confidence: 'high', heuristicApplied: 'rule7_assembly', alternativeTypes: [], reasoning: 'Label point de rassemblement.' }
      if (/\b(camera|cctv|surveillance)\b/.test(label))
        return { newType: 'CCTV_CAMERA', confidence: 'high', heuristicApplied: 'rule7_cctv', alternativeTypes: [{ type: 'CCTV_ZONE', confidence: 0.4 }], reasoning: 'Label CCTV.' }
      if (/\b(desenfumage)\b/.test(label))
        return { newType: 'SMOKE_EXTRACTION', confidence: 'high', heuristicApplied: 'rule7_smoke', alternativeTypes: [], reasoning: 'Label désenfumage.' }
      if (/\b(coupe[\s-]?feu|compartiment)\b/.test(label))
        return { newType: 'FIRE_COMPARTMENT', confidence: 'high', heuristicApplied: 'rule7_compartment', alternativeTypes: [], reasoning: 'Label compartimentage.' }
      if (/\b(degagement)\b/.test(label))
        return { newType: 'DEGAGEMENT', confidence: 'high', heuristicApplied: 'rule7_degagement', alternativeTypes: [], reasoning: 'Label dégagement ERP.' }
      if (/\b(defibrillateur)\b/.test(label))
        return { newType: 'DEFIBRILLATOR', confidence: 'high', heuristicApplied: 'rule7_defib', alternativeTypes: [], reasoning: 'Label défibrillateur.' }
    }

    // ─── RÈGLE 8 — Vol.3 EXPERIENCE ─────────────────────────
    if (productContext === 'mall_vol3') {
      if (/\b(attraction|hot[\s-]?spot|zone chaude)\b/.test(label))
        return { newType: 'ATTRACTION_ZONE', confidence: 'high', heuristicApplied: 'rule8_attraction', alternativeTypes: [], reasoning: 'Label attraction.' }
      if (/\b(friction|blocage)\b/.test(label))
        return { newType: 'FRICTION_POINT', confidence: 'high', heuristicApplied: 'rule8_friction', alternativeTypes: [], reasoning: 'Label friction.' }
      if (/\b(parcours|customer journey|chemin client)\b/.test(label))
        return { newType: 'CUSTOMER_PATH', confidence: 'high', heuristicApplied: 'rule8_path', alternativeTypes: [], reasoning: 'Label parcours client.' }
      if (/\b(capteur|beacon|sensor|wifi|bluetooth)\b/.test(label))
        return { newType: 'SENSOR_BEACON', confidence: 'high', heuristicApplied: 'rule8_sensor', alternativeTypes: [], reasoning: 'Label capteur.' }
      if (/\b(dwell|stationnement client)\b/.test(label))
        return { newType: 'DWELL_ZONE', confidence: 'high', heuristicApplied: 'rule8_dwell', alternativeTypes: [], reasoning: 'Label dwell.' }
      if (/\b(comptage|portique)\b/.test(label))
        return { newType: 'COUNTING_GATE', confidence: 'high', heuristicApplied: 'rule8_counting', alternativeTypes: [], reasoning: 'Label portique comptage.' }
    }

    // ─── RÈGLE 9 — Vol.4 WAYFINDER ──────────────────────────
    if (productContext === 'mall_vol4') {
      if (/\b(totem|borne directionnelle)\b/.test(label))
        return { newType: 'WAYFINDER_TOTEM', confidence: 'high', heuristicApplied: 'rule9_totem', alternativeTypes: [], reasoning: 'Label totem.' }
      if (/\b(panneau suspendu|hanging)\b/.test(label))
        return { newType: 'WAYFINDER_HANGING_SIGN', confidence: 'high', heuristicApplied: 'rule9_hanging', alternativeTypes: [], reasoning: 'Label panneau suspendu.' }
      if (/\b(marqueur sol|sol fleche|floor marker)\b/.test(label))
        return { newType: 'WAYFINDER_FLOOR_MARKER', confidence: 'high', heuristicApplied: 'rule9_floor_marker', alternativeTypes: [], reasoning: 'Label marqueur sol.' }
      if (/\b(you are here|vous etes ici|plan d.orientation)\b/.test(label))
        return { newType: 'YOU_ARE_HERE_POINT', confidence: 'high', heuristicApplied: 'rule9_yah', alternativeTypes: [], reasoning: 'Label YAH.' }
      if (/\b(panneau|signaletique|directionnel)\b/.test(label))
        return { newType: 'WAYFINDER_HANGING_SIGN', confidence: 'medium', heuristicApplied: 'rule9_sign_generic', alternativeTypes: [{ type: 'WAYFINDER_WALL_SIGN', confidence: 0.5 }], reasoning: 'Signalétique générique.' }
      if (/\b(ascenseur|lift|elevator)\b/.test(label))
        return { newType: 'ELEVATOR', confidence: 'high', heuristicApplied: 'rule9_elevator', alternativeTypes: [], reasoning: 'Label ascenseur.' }
      if (/\b(escalator|escalier mecanique)\b/.test(label))
        return { newType: 'ESCALATOR', confidence: 'high', heuristicApplied: 'rule9_escalator', alternativeTypes: [], reasoning: 'Label escalator.' }
      if (/\b(escalier(?! mecanique)|stairs)\b/.test(label))
        return { newType: 'STAIRS', confidence: 'high', heuristicApplied: 'rule9_stairs', alternativeTypes: [], reasoning: 'Label escalier.' }
      if (/\b(pmr|accessibilite|handicap|fauteuil)\b/.test(label))
        return { newType: 'PMR_PATH', confidence: 'high', heuristicApplied: 'rule9_pmr', alternativeTypes: [{ type: 'PMR_RAMP', confidence: 0.5 }], reasoning: 'Label PMR.' }
      if (/\b(rampe)\b/.test(label))
        return { newType: 'PMR_RAMP', confidence: 'high', heuristicApplied: 'rule9_ramp', alternativeTypes: [], reasoning: 'Label rampe.' }
      if (/\b(bande tactile|guidage tactile)\b/.test(label))
        return { newType: 'TACTILE_GUIDE', confidence: 'high', heuristicApplied: 'rule9_tactile', alternativeTypes: [], reasoning: 'Label bande tactile.' }
    }

    // ─── RÈGLE 10 — WiseFM ─────────────────────────────────
    if (productContext === 'wisefm') {
      if (/\b(cvc|hvac|climatisation|ventilation|chauffage|clim)\b/.test(label))
        return { newType: 'EQUIPMENT_HVAC', confidence: 'high', heuristicApplied: 'rule10_hvac', alternativeTypes: [], reasoning: 'Label CVC.' }
      if (/\b(electrique|electricite|tableau|tgbt|disjoncteur)\b/.test(label))
        return { newType: 'EQUIPMENT_ELECTRICAL', confidence: 'high', heuristicApplied: 'rule10_electrical', alternativeTypes: [{ type: 'ELECTRICAL_PANEL', confidence: 0.6 }], reasoning: 'Label électrique.' }
      if (/\b(plomberie|sanitaire|eau)\b/.test(label))
        return { newType: 'EQUIPMENT_PLUMBING', confidence: 'high', heuristicApplied: 'rule10_plumbing', alternativeTypes: [{ type: 'VALVE', confidence: 0.4 }], reasoning: 'Label plomberie.' }
      if (/\b(workcenter|atelier)\b/.test(label))
        return { newType: 'WORKCENTER', confidence: 'high', heuristicApplied: 'rule10_workcenter', alternativeTypes: [], reasoning: 'Label workcenter.' }
      if (/\b(vanne|valve)\b/.test(label))
        return { newType: 'VALVE', confidence: 'high', heuristicApplied: 'rule10_valve', alternativeTypes: [], reasoning: 'Label vanne.' }
      if (/\b(compteur|meter)\b/.test(label))
        return { newType: 'METER', confidence: 'high', heuristicApplied: 'rule10_meter', alternativeTypes: [], reasoning: 'Label compteur.' }
      if (/\b(ronde|patrouille|inspection)\b/.test(label))
        return { newType: 'PATROL_ROUTE', confidence: 'high', heuristicApplied: 'rule10_patrol', alternativeTypes: [{ type: 'INSPECTION_POINT', confidence: 0.5 }], reasoning: 'Label ronde.' }
    }

    // ─── RÈGLE 11 — Atlas Lease ────────────────────────────
    if (productContext === 'atlas_lease') {
      if (/\b(privatif|partie privative)\b/.test(label))
        return { newType: 'LEASE_LOT_PRIVATE', confidence: 'high', heuristicApplied: 'rule11_private', alternativeTypes: [], reasoning: 'Label partie privative.' }
      if (/\b(commun|partie commune)\b/.test(label))
        return { newType: 'LEASE_LOT_COMMON', confidence: 'high', heuristicApplied: 'rule11_common', alternativeTypes: [], reasoning: 'Label partie commune.' }
      if (/\b(surface utile|\bsu\b)\b/.test(label))
        return { newType: 'USEFUL_AREA', confidence: 'high', heuristicApplied: 'rule11_useful', alternativeTypes: [], reasoning: 'Label surface utile.' }
      if (/\b(gla|gross leasable)\b/.test(label))
        return { newType: 'GLA_AREA', confidence: 'high', heuristicApplied: 'rule11_gla', alternativeTypes: [], reasoning: 'Label GLA.' }
    }

    // ─── FALLBACK PRODUIT (deuxième passe, si pas matché ailleurs) ──
    const productResultLate = this.classifyByProductContext(label, productContext, true)
    if (productResultLate) return productResultLate

    // ─── FALLBACK ───────────────────────────────────────────
    return {
      newType: 'WALL_STRUCTURAL',
      confidence: 'manual_review_needed',
      heuristicApplied: 'no_match',
      alternativeTypes: [
        { type: 'BOUTIQUE_BOUNDARY', confidence: 0.3 },
        { type: 'PEDESTRIAN_PATH', confidence: 0.2 },
        { type: 'GREEN_AREA', confidence: 0.2 },
        { type: 'ZONE_GENERIC', confidence: 0.2 },
      ],
      reasoning: `Aucune règle ne matche. Label="${legacy.label ?? ''}", géom=${isPoly ? 'polygon' : isLine ? 'polyline' : 'point'}, aire=${area}.`,
    }
  }

  /**
   * Vérifie les patterns spécifiques au produit. Appelée AVANT les règles
   * génériques pour éviter les collisions (ex: "cheminement PMR" doit
   * matcher PMR avant cheminement piéton).
   *
   * @param strict si true, ne match que les patterns à confiance haute
   *   et spécifiques au produit (pour la deuxième passe en fallback).
   */
  private classifyByProductContext(
    label: string,
    productContext: ProductContext,
    _strict = false,
  ): ClassificationResult | null {
    if (productContext === 'mall_vol4') {
      // PMR EN PREMIER : "cheminement PMR" doit matcher PMR avant pedestrian
      if (/\b(pmr|accessibilite|handicap|fauteuil)\b/.test(label))
        return { newType: 'PMR_PATH', confidence: 'high', heuristicApplied: 'rule9_pmr_priority', alternativeTypes: [{ type: 'PMR_RAMP', confidence: 0.5 }], reasoning: 'Label PMR (priorité produit Vol.4).' }
      if (/\b(rampe)\b/.test(label))
        return { newType: 'PMR_RAMP', confidence: 'high', heuristicApplied: 'rule9_ramp_priority', alternativeTypes: [], reasoning: 'Label rampe (priorité produit Vol.4).' }
    }

    if (productContext === 'wisefm') {
      // Composants spécifiques EN PREMIER (vanne avant plumbing, compteur avant electrical)
      if (/\b(vanne|valve)\b/.test(label))
        return { newType: 'VALVE', confidence: 'high', heuristicApplied: 'rule10_valve_priority', alternativeTypes: [], reasoning: 'Label vanne (priorité produit WiseFM).' }
      if (/\b(compteur|meter)\b/.test(label))
        return { newType: 'METER', confidence: 'high', heuristicApplied: 'rule10_meter_priority', alternativeTypes: [], reasoning: 'Label compteur (priorité produit WiseFM).' }
      if (/\btgbt\b/.test(label))
        return { newType: 'ELECTRICAL_PANEL', confidence: 'high', heuristicApplied: 'rule10_panel_priority', alternativeTypes: [], reasoning: 'Label TGBT (priorité produit WiseFM).' }
    }

    if (productContext === 'mall_vol2') {
      // Patterns sécurité spécifiques avant règles génériques
      if (/\b(ria|robinet incendie)\b/.test(label))
        return { newType: 'RIA', confidence: 'high', heuristicApplied: 'rule7_ria_priority', alternativeTypes: [], reasoning: 'Label RIA (priorité produit Vol.2).' }
      if (/\b(extincteur)\b/.test(label))
        return { newType: 'EXTINGUISHER', confidence: 'high', heuristicApplied: 'rule7_extinguisher_priority', alternativeTypes: [], reasoning: 'Label extincteur (priorité produit Vol.2).' }
      if (/\b(camera|cctv|surveillance)\b/.test(label))
        return { newType: 'CCTV_CAMERA', confidence: 'high', heuristicApplied: 'rule7_cctv_priority', alternativeTypes: [{ type: 'CCTV_ZONE', confidence: 0.4 }], reasoning: 'Label CCTV (priorité produit Vol.2).' }
    }

    return null
  }
}
