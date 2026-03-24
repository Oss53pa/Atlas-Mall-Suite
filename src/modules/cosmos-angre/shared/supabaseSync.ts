// ═══ SUPABASE SYNC LAYER — Atlas Mall Suite ═══
// Centralized DB persistence for all stores. Handles:
// - Column name mapping (camelCase ↔ snake_case)
// - Hydration (load project data from Supabase)
// - Mutations (persist changes to Supabase)
// - Graceful fallback when Supabase is not configured

import { supabase } from '../../../lib/supabase'
import type {
  Floor, Zone, Camera, Door, POI, SignageItem, TransitionNode,
} from './proph3t/types'

// ═══ CONFIGURATION ═══

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined

export function isSupabaseConfigured(): boolean {
  return !!SUPABASE_URL && !SUPABASE_URL.includes('placeholder')
}

// ═══ DB ROW TYPES ═══

interface DBRow { [key: string]: string | number | boolean | null | undefined }

// ═══ FLOOR MAPPERS ═══

export function mapFloorFromDB(row: DBRow): Floor {
  return {
    id: row.id as string,
    projectId: row.projet_id as string,
    level: row.level as Floor['level'],
    order: row.floor_order as number,
    svgPath: (row.svg_path as string) ?? undefined,
    dwgUrl: (row.dwg_url as string) ?? undefined,
    widthM: (row.width_m as number) ?? 120,
    heightM: (row.height_m as number) ?? 80,
    zones: [],
    transitions: [],
  }
}

export function mapFloorToDB(floor: Floor, projetId: string): DBRow {
  return {
    id: floor.id,
    projet_id: projetId,
    level: floor.level,
    floor_order: floor.order,
    svg_path: floor.svgPath ?? null,
    dwg_url: floor.dwgUrl ?? null,
    width_m: floor.widthM,
    height_m: floor.heightM,
  }
}

// ═══ ZONE MAPPERS ═══

export function mapZoneFromDB(row: DBRow): Zone {
  return {
    id: row.id as string,
    floorId: row.floor_id as string,
    label: row.label as string,
    type: row.type as Zone['type'],
    x: row.x as number,
    y: row.y as number,
    w: row.w as number,
    h: row.h as number,
    niveau: row.niveau as Zone['niveau'],
    color: (row.color as string) ?? '#E0E0E0',
    description: (row.description as string) ?? undefined,
    surfaceM2: (row.surface_m2 as number) ?? undefined,
    lux: (row.lux as number) ?? undefined,
  }
}

export function mapZoneToDB(zone: Zone, projetId: string): DBRow {
  return {
    id: zone.id,
    projet_id: projetId,
    floor_id: zone.floorId,
    label: zone.label,
    type: zone.type,
    x: zone.x,
    y: zone.y,
    w: zone.w,
    h: zone.h,
    niveau: zone.niveau,
    color: zone.color,
    description: zone.description ?? null,
    surface_m2: zone.surfaceM2 ?? null,
    lux: zone.lux ?? null,
  }
}

// ═══ CAMERA MAPPERS ═══

export function mapCameraFromDB(row: DBRow): Camera {
  return {
    id: row.id as string,
    floorId: row.floor_id as string,
    label: row.label as string,
    model: row.model as Camera['model'],
    x: row.x as number,
    y: row.y as number,
    angle: (row.angle as number) ?? 270,
    fov: (row.fov as number) ?? 109,
    range: (row.range_normalized as number) ?? 0.12,
    rangeM: (row.range_m as number) ?? 12,
    color: (row.color as string) ?? '#3b82f6',
    note: (row.note as string) ?? undefined,
    priority: (row.priority as Camera['priority']) ?? 'normale',
    wisefmEquipmentId: (row.wisefm_equipment_id as string) ?? undefined,
    capexFcfa: (row.capex_fcfa as number) ?? 0,
    autoPlaced: (row.auto_placed as boolean) ?? false,
    coverageScore: undefined,
  }
}

export function mapCameraToDB(cam: Camera, projetId: string): DBRow {
  return {
    id: cam.id,
    projet_id: projetId,
    floor_id: cam.floorId,
    label: cam.label,
    model: cam.model,
    x: cam.x,
    y: cam.y,
    angle: cam.angle,
    fov: cam.fov,
    range_normalized: cam.range,
    range_m: cam.rangeM,
    color: cam.color,
    note: cam.note ?? null,
    priority: cam.priority,
    wisefm_equipment_id: cam.wisefmEquipmentId ?? null,
    capex_fcfa: cam.capexFcfa,
    auto_placed: cam.autoPlaced,
  }
}

// ═══ DOOR MAPPERS ═══

export function mapDoorFromDB(row: DBRow): Door {
  return {
    id: row.id as string,
    floorId: row.floor_id as string,
    label: row.label as string,
    x: row.x as number,
    y: row.y as number,
    zoneType: (row.zone_type as Door['zoneType']) ?? 'circulation',
    isExit: (row.is_exit as boolean) ?? false,
    hasBadge: (row.has_badge as boolean) ?? false,
    hasBiometric: (row.has_biometric as boolean) ?? false,
    hasSas: (row.has_sas as boolean) ?? false,
    ref: (row.ref as string) ?? '',
    normRef: (row.norm_ref as string) ?? '',
    note: (row.note as string) ?? '',
    widthM: (row.width_m as number) ?? 0.9,
    wisefmEquipmentId: (row.wisefm_equipment_id as string) ?? undefined,
    capexFcfa: (row.capex_fcfa as number) ?? 0,
  }
}

export function mapDoorToDB(door: Door, projetId: string): DBRow {
  return {
    id: door.id,
    projet_id: projetId,
    floor_id: door.floorId,
    label: door.label,
    x: door.x,
    y: door.y,
    zone_type: door.zoneType,
    is_exit: door.isExit,
    has_badge: door.hasBadge,
    has_biometric: door.hasBiometric,
    has_sas: door.hasSas,
    ref: door.ref,
    norm_ref: door.normRef,
    note: door.note,
    width_m: door.widthM,
    wisefm_equipment_id: door.wisefmEquipmentId ?? null,
    capex_fcfa: door.capexFcfa,
  }
}

// ═══ POI MAPPERS ═══

export function mapPoiFromDB(row: DBRow): POI {
  return {
    id: row.id as string,
    floorId: row.floor_id as string,
    label: row.label as string,
    type: (row.type as POI['type']) ?? 'enseigne',
    x: row.x as number,
    y: row.y as number,
    pmr: (row.pmr as boolean) ?? false,
    color: (row.color as string) ?? '#22c55e',
    icon: (row.icon as string) ?? '',
    note: (row.note as string) ?? undefined,
    cosmosClubOffre: (row.cosmos_club_offre as string) ?? undefined,
    qrUrl: (row.qr_url as string) ?? undefined,
    linkedFloorId: (row.linked_floor_id as string) ?? undefined,
  }
}

export function mapPoiToDB(poi: POI, projetId: string): DBRow {
  return {
    id: poi.id,
    projet_id: projetId,
    floor_id: poi.floorId,
    label: poi.label,
    type: poi.type,
    x: poi.x,
    y: poi.y,
    pmr: poi.pmr,
    color: poi.color,
    icon: poi.icon,
    note: poi.note ?? null,
    cosmos_club_offre: poi.cosmosClubOffre ?? null,
    qr_url: poi.qrUrl ?? null,
    linked_floor_id: poi.linkedFloorId ?? null,
  }
}

// ═══ SIGNAGE MAPPERS ═══

export function mapSignageFromDB(row: DBRow): SignageItem {
  return {
    id: row.id as string,
    floorId: row.floor_id as string,
    type: row.type as SignageItem['type'],
    x: row.x as number,
    y: row.y as number,
    orientationDeg: (row.orientation_deg as number) ?? 0,
    poseHeightM: (row.pose_height_m as number) ?? 0,
    textHeightMm: (row.text_height_mm as number) ?? 0,
    maxReadingDistanceM: (row.max_reading_distance_m as number) ?? 0,
    visibilityScore: (row.visibility_score as number) ?? 0,
    isLuminous: (row.is_luminous as boolean) ?? false,
    requiresBAES: (row.requires_baes as boolean) ?? false,
    content: (row.content as string) ?? undefined,
    ref: (row.ref as string) ?? '',
    capexFcfa: (row.capex_fcfa as number) ?? 0,
    normRef: (row.norm_ref as string) ?? '',
    proph3tNote: (row.proph3t_note as string) ?? undefined,
    autoPlaced: (row.auto_placed as boolean) ?? false,
  }
}

export function mapSignageToDB(item: SignageItem, projetId: string): DBRow {
  return {
    id: item.id,
    projet_id: projetId,
    floor_id: item.floorId,
    type: item.type,
    x: item.x,
    y: item.y,
    orientation_deg: item.orientationDeg,
    pose_height_m: item.poseHeightM,
    text_height_mm: item.textHeightMm,
    max_reading_distance_m: item.maxReadingDistanceM,
    visibility_score: item.visibilityScore,
    is_luminous: item.isLuminous,
    requires_baes: item.requiresBAES,
    content: item.content ?? null,
    ref: item.ref,
    capex_fcfa: item.capexFcfa,
    norm_ref: item.normRef,
    proph3t_note: item.proph3tNote ?? null,
    auto_placed: item.autoPlaced ?? false,
  }
}

// ═══ TRANSITION MAPPERS ═══

export function mapTransitionFromDB(row: DBRow): TransitionNode {
  return {
    id: row.id as string,
    type: row.type as TransitionNode['type'],
    fromFloor: row.from_floor as TransitionNode['fromFloor'],
    toFloor: row.to_floor as TransitionNode['toFloor'],
    x: row.x as number,
    y: row.y as number,
    pmr: (row.pmr as boolean) ?? false,
    capacityPerMin: (row.capacity_per_min as number) ?? 60,
    label: (row.label as string) ?? '',
  }
}

export function mapTransitionToDB(t: TransitionNode, projetId: string): DBRow {
  return {
    id: t.id,
    projet_id: projetId,
    type: t.type,
    from_floor: t.fromFloor,
    to_floor: t.toFloor,
    x: t.x,
    y: t.y,
    pmr: t.pmr,
    capacity_per_min: t.capacityPerMin,
    label: t.label,
  }
}

// ═══ HYDRATION — Load all project data from Supabase ═══

export interface ProjectData {
  floors: Floor[]
  zones: Zone[]
  cameras: Camera[]
  doors: Door[]
  pois: POI[]
  signageItems: SignageItem[]
  transitions: TransitionNode[]
}

export async function loadProjectFromSupabase(projetId: string): Promise<ProjectData | null> {
  if (!isSupabaseConfigured()) return null

  try {
    const [floorsRes, zonesRes, camerasRes, doorsRes, poisRes, signageRes, transRes] = await Promise.all([
      supabase.from('floors').select('*').eq('projet_id', projetId).order('floor_order'),
      supabase.from('zones').select('*').eq('projet_id', projetId),
      supabase.from('cameras').select('*').eq('projet_id', projetId),
      supabase.from('doors').select('*').eq('projet_id', projetId),
      supabase.from('pois').select('*').eq('projet_id', projetId),
      supabase.from('signage_items').select('*').eq('projet_id', projetId),
      supabase.from('transitions').select('*').eq('projet_id', projetId),
    ])

    return {
      floors: (floorsRes.data ?? []).map(r => mapFloorFromDB(r as DBRow)),
      zones: (zonesRes.data ?? []).map(r => mapZoneFromDB(r as DBRow)),
      cameras: (camerasRes.data ?? []).map(r => mapCameraFromDB(r as DBRow)),
      doors: (doorsRes.data ?? []).map(r => mapDoorFromDB(r as DBRow)),
      pois: (poisRes.data ?? []).map(r => mapPoiFromDB(r as DBRow)),
      signageItems: (signageRes.data ?? []).map(r => mapSignageFromDB(r as DBRow)),
      transitions: (transRes.data ?? []).map(r => mapTransitionFromDB(r as DBRow)),
    }
  } catch (err) {
    console.warn('[SupabaseSync] Failed to load project data:', err)
    return null
  }
}

// ═══ PERSIST — Save entity to Supabase (fire-and-forget) ═══

type TableName = 'floors' | 'zones' | 'cameras' | 'doors' | 'pois' | 'signage_items' | 'transitions'

export async function persistEntity(table: TableName, row: DBRow): Promise<void> {
  if (!isSupabaseConfigured()) return
  try {
    const { error } = await supabase.from(table).upsert(row)
    if (error) console.warn(`[SupabaseSync] Upsert ${table} failed:`, error.message)
  } catch (err) {
    console.warn(`[SupabaseSync] Upsert ${table} error:`, err)
  }
}

export async function deleteEntity(table: TableName, id: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  try {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) console.warn(`[SupabaseSync] Delete ${table} failed:`, error.message)
  } catch (err) {
    console.warn(`[SupabaseSync] Delete ${table} error:`, err)
  }
}

// ═══ BATCH PERSIST — Save multiple entities at once ═══

export async function persistBatch(table: TableName, rows: DBRow[]): Promise<void> {
  if (!isSupabaseConfigured() || rows.length === 0) return
  try {
    const { error } = await supabase.from(table).upsert(rows)
    if (error) console.warn(`[SupabaseSync] Batch upsert ${table} failed:`, error.message)
  } catch (err) {
    console.warn(`[SupabaseSync] Batch upsert ${table} error:`, err)
  }
}
