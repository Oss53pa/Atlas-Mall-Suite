// ═══ VOL.2 SECURITY CONFIG STORE — Données dynamiques par projet ═══
//
// Remplace le contenu hardcodé des 7 sections Vol.2 :
//   AccesSection, IncendieSection, IncidentWorkflow, OrganigrammeSection,
//   PerimetreSection, ProceduresSection, VmsIntegration
//
// Principes identiques à experienceStore (Vol.3) :
//   • Scope par projectId
//   • Templates par verticale (mall, hotel, office, hospital, campus)
//   • CRUD complet
//   • Persistance localStorage

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VerticalId } from '../../../../verticals/types'
import {
  getAccessEquipmentTemplates, getAccessRightTemplates,
  getFireEquipmentTemplates, getFireScenarioTemplates, getFireExerciseTemplates,
  getErpCheckTemplates,
  getOrgNodeTemplates, getOrgConnectionTemplates,
  getPerimeterEquipmentTemplates,
  getProcedureTemplates, getSecurityAgentTemplates,
  getVmsProviderTemplates,
  getIncidentTemplates,
} from './securityConfigTemplates'

// ─── Types ────────────────────────────────────────────────

export type EquipStatus = 'Opérationnel' | 'En cours' | 'Planifié' | 'Hors service'
export type Conformite  = 'conforme' | 'non_conforme' | 'a_verifier'

export interface AccessEquipment {
  id: string; name: string; description: string; status: EquipStatus
}
export interface AccessRight {
  id: string; zone: string; niveau: string; typeAcces: string
  badge: boolean; biometrie: boolean; sas: boolean; reference: string
}

export interface FireEquipment {
  id: string; name: string; description: string
}
export interface ErpCheck {
  id: string; item: string; status: Conformite
}
export interface FireScenario {
  id: string; name: string; description: string
}
export interface FireExercise {
  id: string; date: string; type: string; result: string; status: 'ok' | 'partiel' | 'echec'
}

export interface OrgNode {
  id: string; name: string; role: string; level: number; email?: string; phone?: string
}
export interface OrgConnection {
  from: string; to: string
}

export interface PerimeterEquipment {
  id: string; name: string; description: string; status: EquipStatus
}

export interface Procedure {
  id: string; title: string; content: string
}
export interface SecurityAgent {
  id: string; nom: string; poste: string; ssiap: string
  dateCertif: string; renouvellement: string
  status: 'valide' | 'a_renouveler' | 'expire'
}

export type VmsProvider = 'milestone' | 'genetec' | 'dahua_dss' | 'hikvision_ivms' | 'avigilon' | 'axxon'
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error'
export interface VmsConfig {
  id: string; provider: VmsProvider; name: string; host?: string; port?: number
  status: ConnectionStatus; cameraCount: number
}

export type IncidentState    = 'detecte' | 'assigne' | 'en_cours' | 'resolu' | 'cloture'
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
export interface IncidentTemplate {
  id: string; title: string; category: string; severity: IncidentSeverity
  state: IncidentState; defaultResponse: string
}

// ─── State ────────────────────────────────────────────────

interface SecurityConfigState {
  // Record<projectId, items[]>
  accessEquipments:    Record<string, AccessEquipment[]>
  accessRights:        Record<string, AccessRight[]>
  fireEquipments:      Record<string, FireEquipment[]>
  fireScenarios:       Record<string, FireScenario[]>
  fireExercises:       Record<string, FireExercise[]>
  erpChecks:           Record<string, ErpCheck[]>
  orgNodes:            Record<string, OrgNode[]>
  orgConnections:      Record<string, OrgConnection[]>
  perimeterEquipments: Record<string, PerimeterEquipment[]>
  procedures:          Record<string, Procedure[]>
  securityAgents:      Record<string, SecurityAgent[]>
  vmsProviders:        Record<string, VmsConfig[]>
  incidentTemplates:   Record<string, IncidentTemplate[]>

  initializedProjects: string[]
  ensureInitialized: (projectId: string, verticalId: VerticalId) => void
  resetToTemplate:   (projectId: string, verticalId: VerticalId) => void

  // CRUD génériques
  setList: <K extends SecurityListKey>(key: K, projectId: string, items: SecurityListMap[K]) => void
  addItem: <K extends SecurityListKey>(key: K, projectId: string, item: SecurityListMap[K][number]) => void
  updateItem: <K extends SecurityListKey>(key: K, projectId: string, id: string, patch: Partial<SecurityListMap[K][number]>) => void
  deleteItem: <K extends SecurityListKey>(key: K, projectId: string, id: string) => void
}

type SecurityListMap = {
  accessEquipments:    AccessEquipment[]
  accessRights:        AccessRight[]
  fireEquipments:      FireEquipment[]
  fireScenarios:       FireScenario[]
  fireExercises:       FireExercise[]
  erpChecks:           ErpCheck[]
  orgNodes:            OrgNode[]
  orgConnections:      OrgConnection[]
  perimeterEquipments: PerimeterEquipment[]
  procedures:          Procedure[]
  securityAgents:      SecurityAgent[]
  vmsProviders:        VmsConfig[]
  incidentTemplates:   IncidentTemplate[]
}
type SecurityListKey = keyof SecurityListMap

const uid = () => `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

// ─── Store ────────────────────────────────────────────────

export const useSecurityConfigStore = create<SecurityConfigState>()(
  persist(
    (set, get) => ({
      accessEquipments:    {},
      accessRights:        {},
      fireEquipments:      {},
      fireScenarios:       {},
      fireExercises:       {},
      erpChecks:           {},
      orgNodes:            {},
      orgConnections:      {},
      perimeterEquipments: {},
      procedures:          {},
      securityAgents:      {},
      vmsProviders:        {},
      incidentTemplates:   {},
      initializedProjects: [],

      ensureInitialized: (projectId, verticalId) => {
        const s = get()
        if (s.initializedProjects.includes(projectId)) return
        const withIds = <T extends { id: string }>(items: Omit<T, 'id'>[]): T[] =>
          items.map(it => ({ ...it, id: uid() } as T))
        set(state => ({
          accessEquipments:    { ...state.accessEquipments,    [projectId]: withIds(getAccessEquipmentTemplates(verticalId)) },
          accessRights:        { ...state.accessRights,        [projectId]: withIds(getAccessRightTemplates(verticalId)) },
          fireEquipments:      { ...state.fireEquipments,      [projectId]: withIds(getFireEquipmentTemplates(verticalId)) },
          erpChecks:           { ...state.erpChecks,           [projectId]: withIds(getErpCheckTemplates(verticalId)) },
          fireScenarios:       { ...state.fireScenarios,       [projectId]: withIds(getFireScenarioTemplates(verticalId)) },
          fireExercises:       { ...state.fireExercises,       [projectId]: withIds(getFireExerciseTemplates(verticalId)) },
          orgNodes:            { ...state.orgNodes,            [projectId]: withIds(getOrgNodeTemplates(verticalId)) },
          orgConnections:      { ...state.orgConnections,      [projectId]: getOrgConnectionTemplates(verticalId) },
          perimeterEquipments: { ...state.perimeterEquipments, [projectId]: withIds(getPerimeterEquipmentTemplates(verticalId)) },
          procedures:          { ...state.procedures,          [projectId]: withIds(getProcedureTemplates(verticalId)) },
          securityAgents:      { ...state.securityAgents,      [projectId]: withIds(getSecurityAgentTemplates(verticalId)) },
          vmsProviders:        { ...state.vmsProviders,        [projectId]: withIds(getVmsProviderTemplates(verticalId)) },
          incidentTemplates:   { ...state.incidentTemplates,   [projectId]: withIds(getIncidentTemplates(verticalId)) },
          initializedProjects: [...state.initializedProjects, projectId],
        }))
      },

      resetToTemplate: (projectId, verticalId) => {
        set(state => ({ initializedProjects: state.initializedProjects.filter(p => p !== projectId) }))
        get().ensureInitialized(projectId, verticalId)
      },

      setList: (key, pid, items) => set(state => ({
        [key]: { ...(state[key] as Record<string, unknown>), [pid]: items },
      } as unknown as Partial<SecurityConfigState>)),

      addItem: (key, pid, item) => set(state => {
        const list = ((state[key] as Record<string, unknown[]>)[pid] ?? [])
        return ({
          [key]: { ...(state[key] as Record<string, unknown>), [pid]: [...list, item] },
        } as unknown as Partial<SecurityConfigState>)
      }),

      updateItem: (key, pid, id, patch) => set(state => {
        const list = ((state[key] as Record<string, Array<{ id: string }>>)[pid] ?? [])
        return ({
          [key]: {
            ...(state[key] as Record<string, unknown>),
            [pid]: list.map(it => it.id === id ? { ...it, ...patch } : it),
          },
        } as unknown as Partial<SecurityConfigState>)
      }),

      deleteItem: (key, pid, id) => set(state => {
        const list = ((state[key] as Record<string, Array<{ id: string }>>)[pid] ?? [])
        return ({
          [key]: {
            ...(state[key] as Record<string, unknown>),
            [pid]: list.filter(it => it.id !== id),
          },
        } as unknown as Partial<SecurityConfigState>)
      }),
    }),
    { name: 'atlas-security-config-v1', version: 1 },
  ),
)
