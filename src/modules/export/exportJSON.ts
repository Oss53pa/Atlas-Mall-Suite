// ═══ EXPORT JSON — Donnees brutes pour integration systemes tiers ═══

export interface JSONExportConfig {
  projectName: string
  volume: 'vol1' | 'vol2' | 'vol3' | 'all'
  includeMetadata: boolean
  includeGeometry: boolean
  prettyPrint: boolean
}

export function exportJSON(data: Record<string, unknown>, config: JSONExportConfig): Blob {
  const envelope = {
    _meta: config.includeMetadata ? {
      exportedAt: new Date().toISOString(),
      project: config.projectName,
      volume: config.volume,
      generator: 'Atlas Mall Suite / Proph3t Engine',
      version: '1.0',
    } : undefined,
    data,
  }

  const json = config.prettyPrint
    ? JSON.stringify(envelope, null, 2)
    : JSON.stringify(envelope)

  return new Blob([json], { type: 'application/json' })
}

export function exportVol1JSON(
  spaces: Record<string, unknown>[],
  tenants: Record<string, unknown>[],
  occupancy: Record<string, unknown>,
  projectName: string,
): Blob {
  return exportJSON({ spaces, tenants, occupancy }, {
    projectName,
    volume: 'vol1',
    includeMetadata: true,
    includeGeometry: true,
    prettyPrint: true,
  })
}

export function exportVol2JSON(
  cameras: Record<string, unknown>[],
  doors: Record<string, unknown>[],
  zones: Record<string, unknown>[],
  securityScore: Record<string, unknown>,
  projectName: string,
): Blob {
  return exportJSON({ cameras, doors, zones, securityScore }, {
    projectName,
    volume: 'vol2',
    includeMetadata: true,
    includeGeometry: true,
    prettyPrint: true,
  })
}

export function exportVol3JSON(
  moments: Record<string, unknown>[],
  signage: Record<string, unknown>[],
  heatmapData: Record<string, unknown>,
  projectName: string,
): Blob {
  return exportJSON({ moments, signage, heatmapData }, {
    projectName,
    volume: 'vol3',
    includeMetadata: true,
    includeGeometry: true,
    prettyPrint: true,
  })
}
