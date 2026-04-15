// ═══ FLOOR CLUSTERING TESTS — DBSCAN 2D (M14) ═══

import { describe, it, expect } from 'vitest'
import { clusterFloors, labelClusters } from '../floorClustering'

describe('clusterFloors', () => {
  it('détecte 1 cluster pour un plan monolithique', () => {
    const pts = []
    for (let x = 0; x < 100; x += 5)
      for (let y = 0; y < 80; y += 5) pts.push({ x, y })
    const { clusters } = clusterFloors(pts, { minPts: 5, maxSample: 1000 })
    expect(clusters.length).toBe(1)
    expect(clusters[0].width).toBeGreaterThan(90)
  }, 15000)

  it('détecte 2 clusters avec plans posés verticalement', () => {
    const pts = []
    // Étage 1 : Y 0-50
    for (let x = 0; x < 60; x += 5)
      for (let y = 0; y < 50; y += 5) pts.push({ x, y })
    // Étage 2 : Y 200-250 (gap de 150 unités)
    for (let x = 0; x < 60; x += 5)
      for (let y = 200; y < 250; y += 5) pts.push({ x, y })
    const { clusters } = clusterFloors(pts, { epsFactor: 1 / 15, minPts: 5, maxSample: 1000 })
    expect(clusters.length).toBe(2)
  }, 15000)

  it('détecte 2+ clusters pour layout diagonal', () => {
    const pts = []
    const rects = [
      { x0: 0, y0: 0 },
      { x0: 200, y0: 200 },
    ]
    for (const r of rects) {
      for (let x = 0; x < 40; x += 4)
        for (let y = 0; y < 40; y += 4) pts.push({ x: r.x0 + x, y: r.y0 + y })
    }
    const { clusters } = clusterFloors(pts, { epsFactor: 1 / 15, minPts: 5, maxSample: 1000 })
    expect(clusters.length).toBeGreaterThanOrEqual(2)
  }, 15000)

  it('retourne clusters vides pour entrée vide', () => {
    const { clusters } = clusterFloors([])
    expect(clusters).toEqual([])
  })

  it('labelClusters attribue RDC pour 1 cluster', () => {
    const labeled = labelClusters([{
      minX: 0, minY: 0, maxX: 100, maxY: 80,
      width: 100, height: 80, centerX: 50, centerY: 40,
      pointCount: 100,
    }])
    expect(labeled[0].id).toBe('RDC')
    expect(labeled[0].stackOrder).toBe(0)
  })

  it('labelClusters attribue B1/RDC/R+1 pour 3 clusters', () => {
    const clusters = [
      { minX: 0, minY: 0, maxX: 50, maxY: 50, width: 50, height: 50, centerX: 25, centerY: 25, pointCount: 100 },
      { minX: 0, minY: 100, maxX: 50, maxY: 150, width: 50, height: 50, centerX: 25, centerY: 125, pointCount: 100 },
      { minX: 0, minY: 200, maxX: 50, maxY: 250, width: 50, height: 50, centerX: 25, centerY: 225, pointCount: 100 },
    ]
    const labeled = labelClusters(clusters)
    expect(labeled.map(l => l.id)).toEqual(['B1', 'RDC', 'R+1'])
  })
})
