// ═══ LOT ENTITY — Canonical source-of-truth for a commercial/security/parcours lot ═══
// Un "Lot" représente un espace exploitable du centre commercial. Les 3 volets
// (Commercial, Sécuritaire, Parcours) lisent et enrichissent le MÊME objet.
//
// Architecture : Entity (identité + géométrie partagée) + extensions optionnelles
// par volume. Chaque volume ne peut lire/écrire que sa propre extension.

import { FloorLevel } from './FloorLevel'
import type { MetricXY } from './coordinates'

// ─── Primary types réutilisables ────────────────────────────

export type LotId = string & { readonly __brand: 'LotId' }
export type TenantId = string & { readonly __brand: 'TenantId' }

export const lotId = (s: string): LotId => s as LotId
export const tenantId = (s: string): TenantId => s as TenantId

/** Type d'espace (source unique — remplace les divers SpaceType dispersés). */
export enum LotType {
  Commerce = 'commerce',
  Restauration = 'restauration',
  Services = 'services',
  Loisirs = 'loisirs',
  Bureau = 'bureau',
  Technique = 'technique',
  Circulation = 'circulation',
  Parking = 'parking',
  Sanitaire = 'sanitaire',
  Logistique = 'logistique',
  Exterieur = 'exterieur',
  Inconnu = 'inconnu',
}

/** Statut commercial. */
export enum LotStatus {
  Vacant = 'vacant',
  Occupied = 'occupied',
  Reserved = 'reserved',
  Works = 'works',
  Negotiation = 'negotiation',
}

// ─── Commercial extension (Vol.1) ───────────────────────────

export interface CommercialExtension {
  status: LotStatus
  tenantId?: TenantId
  category?: string          // 'mode', 'restauration', 'services'...
  anchor?: boolean           // locomotive
  rentFcfaM2?: number        // loyer mensuel FCFA/m²
  monthlyRentFcfa?: number   // loyer mensuel total calculé
  leaseStart?: string        // ISO date
  leaseEnd?: string          // ISO date
  notes?: string
}

// ─── Security extension (Vol.2) ─────────────────────────────

export interface SecurityExtension {
  /** Priorité de couverture caméra (1 = critique, 3 = optionnel). */
  coveragePriority?: 1 | 2 | 3
  /** Nécessite contrôle d'accès ? */
  accessControl?: boolean
  /** Présence détectée de sortie de secours dans ce lot. */
  hasEmergencyExit?: boolean
  /** Classification ERP (type M, N, W...). */
  erpSubType?: string
  /** Risque incendie (1 = faible, 5 = élevé). */
  fireRisk?: 1 | 2 | 3 | 4 | 5
}

// ─── Parcours extension (Vol.3) ─────────────────────────────

export interface ParcoursExtension {
  /** Point d'intérêt majeur (restaurant vedette, enseigne ancre, etc.). */
  isPoi?: boolean
  /** Accessible PMR ? */
  accessiblePmr?: boolean
  /** Étape d'un parcours client type. */
  journeyStepOrder?: number
  /** Signalétique visible depuis les circulations principales ? */
  hasVisibleSignage?: boolean
}

// ─── Canonical Lot entity ───────────────────────────────────

export interface Lot {
  /** Identifiant stable (UUID ou hash géométrique). */
  readonly id: LotId
  /** Libellé visible (ex: "B-12", "Restaurant 3", "WC H"). */
  label: string
  /** Type canonique. */
  type: LotType
  /** Niveau d'étage canonique. */
  floorLevel: FloorLevel
  /** Polygone fermé en mètres (coords métriques, Y standard DXF). */
  polygon: MetricXY[]
  /** Surface utile en m² (recalculée depuis le polygone). */
  areaSqm: number
  /** Timestamp de création (ISO). */
  readonly createdAt: string
  /** Timestamp de dernière modification (ISO). */
  updatedAt: string
  /** Version optimiste (pour conflits de sync). */
  version: number

  /** Extensions par volume — chaque volume lit/écrit uniquement la sienne. */
  commercial?: CommercialExtension
  security?: SecurityExtension
  parcours?: ParcoursExtension

  /** Métadonnées non-métier (provenance, tags...). */
  metadata?: Record<string, unknown>
}

// ─── Constructor / helpers ──────────────────────────────────

export interface LotInit {
  id: LotId
  label: string
  type: LotType
  floorLevel: FloorLevel
  polygon: MetricXY[]
  areaSqm: number
  commercial?: CommercialExtension
  security?: SecurityExtension
  parcours?: ParcoursExtension
  metadata?: Record<string, unknown>
}

export function createLot(init: LotInit): Lot {
  const now = new Date().toISOString()
  return {
    id: init.id,
    label: init.label,
    type: init.type,
    floorLevel: init.floorLevel,
    polygon: init.polygon,
    areaSqm: init.areaSqm,
    createdAt: now,
    updatedAt: now,
    version: 1,
    commercial: init.commercial,
    security: init.security,
    parcours: init.parcours,
    metadata: init.metadata,
  }
}

/** Met à jour un lot en bumping version + updatedAt. */
export function touchLot(lot: Lot, patch: Partial<Lot>): Lot {
  return {
    ...lot,
    ...patch,
    id: lot.id,         // id immutable
    createdAt: lot.createdAt,
    updatedAt: new Date().toISOString(),
    version: lot.version + 1,
  }
}

/** Crée / remplace l'extension commerciale atomiquement. */
export function withCommercial(lot: Lot, ext: CommercialExtension): Lot {
  return touchLot(lot, { commercial: ext })
}

export function withSecurity(lot: Lot, ext: SecurityExtension): Lot {
  return touchLot(lot, { security: ext })
}

export function withParcours(lot: Lot, ext: ParcoursExtension): Lot {
  return touchLot(lot, { parcours: ext })
}

// ─── Queries ────────────────────────────────────────────────

/** Filtre les lots par étage. */
export function lotsOnFloor(lots: Lot[], level: FloorLevel): Lot[] {
  return lots.filter(l => l.floorLevel === level)
}

/** Filtre par type commercial. */
export function commercialLots(lots: Lot[]): Lot[] {
  return lots.filter(l => l.type === LotType.Commerce || l.type === LotType.Restauration || l.type === LotType.Services)
}

/** Surface totale d'un ensemble de lots. */
export function totalAreaSqm(lots: Lot[]): number {
  return lots.reduce((sum, l) => sum + l.areaSqm, 0)
}

/** GLA = Gross Leasable Area (commerces + restauration + services). */
export function glaSqm(lots: Lot[]): number {
  return totalAreaSqm(commercialLots(lots))
}

// ─── Type guards ────────────────────────────────────────────

export function hasCommercial(lot: Lot): lot is Lot & { commercial: CommercialExtension } {
  return lot.commercial !== undefined
}

export function hasSecurity(lot: Lot): lot is Lot & { security: SecurityExtension } {
  return lot.security !== undefined
}

export function hasParcours(lot: Lot): lot is Lot & { parcours: ParcoursExtension } {
  return lot.parcours !== undefined
}
