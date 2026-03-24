// ═══ EQUIPMENT LIBRARY — Types ═══

export type EquipmentCategory =
  | 'camera_dome'
  | 'camera_ptz'
  | 'camera_bullet'
  | 'camera_multidirectional'
  | 'camera_fisheye'
  | 'nvr'
  | 'video_analytics_server'
  | 'badge_reader'
  | 'biometric_reader'
  | 'electric_lock'
  | 'door_controller'
  | 'turnstile'
  | 'barrier'
  | 'interphone'
  | 'smoke_detector'
  | 'heat_detector'
  | 'manual_call_point'
  | 'sprinkler_head'
  | 'fire_alarm_panel'
  | 'emergency_light'
  | 'panic_bar'
  | 'wayfinding_totem'
  | 'digital_signage'
  | 'directory_board'
  | 'parking_guidance'
  | 'qr_code_stand'

export interface EquipmentSpecs {
  resolution?: string
  fov?: number
  rangeM?: number
  ip_rating?: string
  ik_rating?: string
  power_watts?: number
  poe?: boolean
  h265?: boolean
  wdr?: boolean
  ir_range_m?: number
  operating_temp?: string
  sensor_size?: string
  focal_length?: string
  channels?: number
  storage_tb?: number
  throughput_mbps?: number
  reader_type?: string
  credential_types?: string[]
  weatherproof?: boolean
  max_users?: number
  coverage_m2?: number
  db_level?: number
  detection_type?: string
  response_time_sec?: number
  battery_hours?: number
  screen_size_inch?: number
  brightness_nits?: number
  connectivity?: string[]
  dimensions_mm?: string
  weight_kg?: number
}

export interface EquipmentItem {
  id: string
  brand: string
  model: string
  category: EquipmentCategory
  subcategory: string
  specs: EquipmentSpecs
  price_fcfa: number
  price_eur: number
  datasheet_url: string
  certifications: string[]
  compatible_with: string[]
  installation_notes: string
  maintenance_interval_months: number
  available_abidjan: boolean
  supplier_ci?: string
}
