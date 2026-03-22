import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import type { Zone, Camera, Door, POI } from '../proph3t/types'

// ═══ HELPERS ═══

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined

function isSupabaseConfigured(): boolean {
  return !!SUPABASE_URL && !SUPABASE_URL.includes('placeholder')
}

type SupabaseTable = 'zones' | 'cameras' | 'doors' | 'pois'

interface WithId {
  id: string
  [key: string]: string | number | boolean | null | undefined
}

async function fetchTable<T>(
  table: SupabaseTable,
  projectId: string
): Promise<T[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('project_id', projectId)

  if (error) throw new Error(`Erreur chargement ${table}: ${error.message}`)
  return (data ?? []) as T[]
}

async function upsertRecord<T extends WithId>(
  table: SupabaseTable,
  record: T
): Promise<T> {
  if (!isSupabaseConfigured()) return record

  const { data, error } = await supabase
    .from(table)
    .upsert(record)
    .select()
    .single()

  if (error) throw new Error(`Erreur sauvegarde ${table}: ${error.message}`)
  return data as T
}

async function deleteRecord(
  table: SupabaseTable,
  id: string
): Promise<void> {
  if (!isSupabaseConfigured()) return

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Erreur suppression ${table}: ${error.message}`)
}

// ═══ QUERY HOOKS ═══

export function useZones(projectId: string) {
  return useQuery<Zone[], Error>({
    queryKey: ['zones', projectId],
    queryFn: () => fetchTable<Zone>('zones', projectId),
    enabled: !!projectId,
    staleTime: 30_000,
  })
}

export function useCameras(projectId: string) {
  return useQuery<Camera[], Error>({
    queryKey: ['cameras', projectId],
    queryFn: () => fetchTable<Camera>('cameras', projectId),
    enabled: !!projectId,
    staleTime: 30_000,
  })
}

export function useDoors(projectId: string) {
  return useQuery<Door[], Error>({
    queryKey: ['doors', projectId],
    queryFn: () => fetchTable<Door>('doors', projectId),
    enabled: !!projectId,
    staleTime: 30_000,
  })
}

export function usePois(projectId: string) {
  return useQuery<POI[], Error>({
    queryKey: ['pois', projectId],
    queryFn: () => fetchTable<POI>('pois', projectId),
    enabled: !!projectId,
    staleTime: 30_000,
  })
}

// ═══ MUTATION HOOKS ═══

export function useMutateZone() {
  const queryClient = useQueryClient()

  return useMutation<Zone, Error, Zone>({
    mutationFn: (zone) => upsertRecord<Zone>('zones', zone as Zone & WithId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['zones', variables.floorId] })
    },
  })
}

export function useMutateCamera() {
  const queryClient = useQueryClient()

  return useMutation<Camera, Error, Camera>({
    mutationFn: (camera) => upsertRecord<Camera>('cameras', camera as Camera & WithId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['cameras', variables.floorId] })
    },
  })
}

export function useMutateDoor() {
  const queryClient = useQueryClient()

  return useMutation<Door, Error, Door>({
    mutationFn: (door) => upsertRecord<Door>('doors', door as Door & WithId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['doors', variables.floorId] })
    },
  })
}

export function useMutatePoi() {
  const queryClient = useQueryClient()

  return useMutation<POI, Error, POI>({
    mutationFn: (poi) => upsertRecord<POI>('pois', poi as POI & WithId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['pois', variables.floorId] })
    },
  })
}

export function useDeleteEntity(table: SupabaseTable) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteRecord(table, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [table] })
    },
  })
}
