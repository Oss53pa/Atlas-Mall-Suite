// ═══ PROJECT MANAGEMENT — Types ═══

export interface PlanAction {
  id: string
  code: string
  title: string
  description: string
  responsible: string
  startDate: string
  endDate: string
  dependencies: string[]
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'blocked'
  progress: number
  deliverables: string[]
  budget_fcfa?: number
  notes?: string
}

export interface SignaletiqueItem {
  id: string
  code: string
  type: string
  zone: string
  floor: string
  status: 'to_order' | 'ordered' | 'delivered' | 'installed' | 'operational'
  supplier?: string
  orderDate?: string
  deliveryDate?: string
  installDate?: string
  notes?: string
}

export interface TouchpointItem {
  id: string
  code: string
  name: string
  type: 'physical' | 'digital' | 'human'
  status: 'design' | 'development' | 'testing' | 'deployed' | 'operational'
  dependencies: string[]
  responsible: string
  dueDate: string
  testResults?: string
  notes?: string
}

export interface GanttBar {
  actionId: string
  code: string
  title: string
  startDate: Date
  endDate: Date
  progress: number
  status: PlanAction['status']
  dependencies: string[]
  isCriticalPath: boolean
}
