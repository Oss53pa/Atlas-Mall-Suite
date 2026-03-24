// ═══ EXPORT — Types ═══

export interface ExportOptions {
  format: 'pdf_a1' | 'pdf_a3' | 'pdf_a4' | 'docx' | 'xlsx' | 'dxf' | 'qr_batch'
  includeCartouche: boolean
  includeLegend: boolean
  includeTable: boolean
  title?: string
  author?: string
  version?: string
}

export interface CartoucheData {
  projectName: string
  address: string
  date: string
  reportNumber: string
  author: string
  version: string
  norm: string
  scale: string
}

export interface ASPADCartouche extends CartoucheData {
  establishmentType: string
  classificationICPE: string
  visaResponsable: string
  surface_m2: number
}
