// ═══ DOMAIN EVENTS — Inter-volume event bus ═══
// Permet aux 3 volets de réagir aux modifications d'un Lot sans couplage direct.
// Vol.1 change un statut → Vol.2 peut recalculer la couverture → Vol.3 le parcours.

import type { Lot, LotId, LotStatus } from './LotEntity'
import type { FloorLevel } from './FloorLevel'

// ─── Event types ────────────────────────────────────────────

export type DomainEvent =
  | { kind: 'lot.created'; lot: Lot }
  | { kind: 'lot.updated'; lot: Lot; previous: Lot }
  | { kind: 'lot.deleted'; lotId: LotId }
  | { kind: 'lot.statusChanged'; lotId: LotId; previous: LotStatus; next: LotStatus }
  | { kind: 'lot.tenantAssigned'; lotId: LotId; tenantId: string | null }
  | { kind: 'floor.added'; level: FloorLevel }
  | { kind: 'floor.removed'; level: FloorLevel }
  | { kind: 'plan.imported'; importId: string; lotCount: number }
  | { kind: 'plan.cleared' }
  | { kind: 'security.coverageRecomputed'; floorLevel: FloorLevel; coveragePct: number }
  | { kind: 'parcours.pathRecomputed'; floorLevel: FloorLevel; lengthM: number }

export type DomainEventKind = DomainEvent['kind']
export type EventOfKind<K extends DomainEventKind> = Extract<DomainEvent, { kind: K }>

// ─── Bus implementation ─────────────────────────────────────

type Handler<E extends DomainEvent = DomainEvent> = (event: E) => void

class DomainEventBus {
  private handlers = new Map<DomainEventKind | '*', Set<Handler>>()

  /** S'abonner à un type d'événement. Retourne un unsubscribe. */
  on<K extends DomainEventKind>(kind: K, handler: Handler<EventOfKind<K>>): () => void {
    const set = this.handlers.get(kind) ?? new Set()
    set.add(handler as Handler)
    this.handlers.set(kind, set)
    return () => set.delete(handler as Handler)
  }

  /** S'abonner à TOUS les événements (debug / logging). */
  onAny(handler: Handler): () => void {
    const set = this.handlers.get('*') ?? new Set()
    set.add(handler)
    this.handlers.set('*', set)
    return () => set.delete(handler)
  }

  /** Émet un événement (synchrone). Les erreurs d'un handler ne bloquent pas les autres. */
  emit(event: DomainEvent): void {
    const specific = this.handlers.get(event.kind)
    if (specific) {
      for (const h of specific) {
        try { h(event) } catch (err) { console.error(`[EventBus] handler failed for ${event.kind}`, err) }
      }
    }
    const any = this.handlers.get('*')
    if (any) {
      for (const h of any) {
        try { h(event) } catch (err) { console.error(`[EventBus] wildcard handler failed`, err) }
      }
    }
  }

  /** Vide tous les handlers (utile pour les tests). */
  clear(): void {
    this.handlers.clear()
  }
}

// ─── Singleton global ───────────────────────────────────────

export const eventBus = new DomainEventBus()

// ─── Helper ergonomiques ────────────────────────────────────

export function emitLotCreated(lot: Lot): void {
  eventBus.emit({ kind: 'lot.created', lot })
}

export function emitLotUpdated(lot: Lot, previous: Lot): void {
  eventBus.emit({ kind: 'lot.updated', lot, previous })
  if (previous.commercial?.status !== lot.commercial?.status && lot.commercial) {
    eventBus.emit({
      kind: 'lot.statusChanged',
      lotId: lot.id,
      previous: previous.commercial?.status ?? ('vacant' as LotStatus),
      next: lot.commercial.status,
    })
  }
  if (previous.commercial?.tenantId !== lot.commercial?.tenantId) {
    eventBus.emit({
      kind: 'lot.tenantAssigned',
      lotId: lot.id,
      tenantId: lot.commercial?.tenantId ?? null,
    })
  }
}

export function emitLotDeleted(id: LotId): void {
  eventBus.emit({ kind: 'lot.deleted', lotId: id })
}
