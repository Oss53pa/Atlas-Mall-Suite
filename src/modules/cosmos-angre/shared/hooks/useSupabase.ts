// ═══ SUPABASE REACT QUERY HOOKS — Atlas Mall Suite ═══
// React Query hooks for all entity types.
// CRITICAL: DB column is `projet_id` (French), NOT `project_id`.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import type { Zone, Camera, Door, POI, SignageItem, Floor, TransitionNode } from '../proph3t/types'
import {
  mapFloorFromDB, mapFloorToDB,
  mapZoneFromDB, mapZoneToDB,
  mapCameraFromDB, mapCameraToDB,
  mapDoorFromDB, mapDoorToDB,
  mapPoiFromDB, mapPoiToDB,
  mapSignageFromDB, mapSignageToDB,
  mapTransitionFromDB, mapTransitionToDB,
  isSupabaseConfigured,
  type ProjectData,
  loadProjectFromSupabase,
} from '../supabaseSync'

// Re-export for convenience
export { isSupabaseConfigured }

// ═══ TABLE TYPE ═══

type SupabaseTable =
  | 'floors' | 'zones' | 'cameras' | 'doors' | 'pois'
  | 'signage_items' | 'transitions' | 'incidents'
  | 'nav_nodes' | 'nav_edges'

// ═══ GENERIC HELPERS ═══

interface DBRow { [key: string]: string | number | boolean | null | undefined }

async function fetchByProjet(
  table: SupabaseTable,
  projetId: string,
): Promise<DBRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('projet_id', projetId)
  if (error) throw new Error(`Erreur chargement ${table}: ${error.message}`)
  return (data ?? []) as DBRow[]
}

async function upsertRow(table: SupabaseTable, row: DBRow): Promise<DBRow> {
  if (!isSupabaseConfigured()) return row
  const { data, error } = await supabase.from(table).upsert(row).select().single()
  if (error) throw new Error(`Erreur sauvegarde ${table}: ${error.message}`)
  return data as DBRow
}

async function deleteRow(table: SupabaseTable, id: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw new Error(`Erreur suppression ${table}: ${error.message}`)
}

// ═══ QUERY HOOKS ═══

export function useFloors(projetId: string) {
  return useQuery({
    queryKey: ['floors', projetId],
    queryFn: async () => (await fetchByProjet('floors', projetId)).map(r => mapFloorFromDB(r)),
    enabled: !!projetId,
    staleTime: 30_000,
  })
}

export function useZones(projetId: string) {
  return useQuery({
    queryKey: ['zones', projetId],
    queryFn: async () => (await fetchByProjet('zones', projetId)).map(r => mapZoneFromDB(r)),
    enabled: !!projetId,
    staleTime: 30_000,
  })
}

export function useCameras(projetId: string) {
  return useQuery({
    queryKey: ['cameras', projetId],
    queryFn: async () => (await fetchByProjet('cameras', projetId)).map(r => mapCameraFromDB(r)),
    enabled: !!projetId,
    staleTime: 30_000,
  })
}

export function useDoors(projetId: string) {
  return useQuery({
    queryKey: ['doors', projetId],
    queryFn: async () => (await fetchByProjet('doors', projetId)).map(r => mapDoorFromDB(r)),
    enabled: !!projetId,
    staleTime: 30_000,
  })
}

export function usePois(projetId: string) {
  return useQuery({
    queryKey: ['pois', projetId],
    queryFn: async () => (await fetchByProjet('pois', projetId)).map(r => mapPoiFromDB(r)),
    enabled: !!projetId,
    staleTime: 30_000,
  })
}

export function useSignageItems(projetId: string) {
  return useQuery({
    queryKey: ['signage_items', projetId],
    queryFn: async () => (await fetchByProjet('signage_items', projetId)).map(r => mapSignageFromDB(r)),
    enabled: !!projetId,
    staleTime: 30_000,
  })
}

export function useTransitions(projetId: string) {
  return useQuery({
    queryKey: ['transitions', projetId],
    queryFn: async () => (await fetchByProjet('transitions', projetId)).map(r => mapTransitionFromDB(r)),
    enabled: !!projetId,
    staleTime: 30_000,
  })
}

export function useIncidents(projetId: string) {
  return useQuery({
    queryKey: ['incidents', projetId],
    queryFn: () => fetchByProjet('incidents', projetId),
    enabled: !!projetId,
    staleTime: 30_000,
  })
}

export function useNavNodes(projetId: string) {
  return useQuery({
    queryKey: ['nav_nodes', projetId],
    queryFn: () => fetchByProjet('nav_nodes', projetId),
    enabled: !!projetId,
    staleTime: 30_000,
  })
}

export function useNavEdges(projetId: string) {
  return useQuery({
    queryKey: ['nav_edges', projetId],
    queryFn: () => fetchByProjet('nav_edges', projetId),
    enabled: !!projetId,
    staleTime: 30_000,
  })
}

// ═══ LOAD ALL PROJECT DATA AT ONCE ═══

export function useLoadProject(projetId: string) {
  return useQuery<ProjectData | null>({
    queryKey: ['project-all', projetId],
    queryFn: () => loadProjectFromSupabase(projetId),
    enabled: !!projetId,
    staleTime: 30_000,
  })
}

// ═══ MUTATION HOOKS ═══

export function useMutateFloor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (floor: Floor) => upsertRow('floors', mapFloorToDB(floor, floor.projectId ?? '')),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['floors'] }) },
  })
}

export function useMutateZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { zone: Zone; projetId: string }) => upsertRow('zones', mapZoneToDB(args.zone, args.projetId)),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['zones'] }) },
  })
}

export function useMutateCamera() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { camera: Camera; projetId: string }) => upsertRow('cameras', mapCameraToDB(args.camera, args.projetId)),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['cameras'] }) },
  })
}

export function useMutateDoor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { door: Door; projetId: string }) => upsertRow('doors', mapDoorToDB(args.door, args.projetId)),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['doors'] }) },
  })
}

export function useMutatePoi() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { poi: POI; projetId: string }) => upsertRow('pois', mapPoiToDB(args.poi, args.projetId)),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['pois'] }) },
  })
}

export function useMutateSignageItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { item: SignageItem; projetId: string }) => upsertRow('signage_items', mapSignageToDB(args.item, args.projetId)),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['signage_items'] }) },
  })
}

export function useMutateTransition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { transition: TransitionNode; projetId: string }) => upsertRow('transitions', mapTransitionToDB(args.transition, args.projetId)),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['transitions'] }) },
  })
}

// ═══ DELETE HOOK ═══

export function useDeleteEntity(table: SupabaseTable) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteRow(table, id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: [table] }) },
  })
}
