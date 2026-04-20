// Tests F-008 : garde-fou `maxExpansions` + `RouteAbortedError`.
import { describe, it, expect } from 'vitest'
import {
  astarForward,
  RouteAbortedError,
  type RouteOptions,
} from '../../modules/cosmos-angre/vol4-wayfinder/engines/astarEngine'
import type { NavGraph, NavNode, NavEdge } from '../../modules/cosmos-angre/shared/engines/plan-analysis/navGraphEngine'

function buildLineGraph(n: number): NavGraph {
  const nodes: NavNode[] = []
  const edges: NavEdge[] = []
  for (let i = 0; i < n; i++) {
    nodes.push({ id: `n${i}`, x: i, y: 0, kind: 'path' })
    if (i > 0) {
      edges.push({
        id: `e${i}`,
        fromId: `n${i - 1}`,
        toId: `n${i}`,
        waypoints: [],
        lengthM: 1,
        congestion: 1,
        attractivity: 0,
        weight: 1,
      } as unknown as NavEdge)
    }
  }
  const _adj = new Map<string, Array<{ edgeId: string; to: string; weight: number }>>()
  const _nodeIndex = new Map<string, number>()
  for (let i = 0; i < nodes.length; i++) _nodeIndex.set(nodes[i].id, i)
  for (const n of nodes) _adj.set(n.id, [])
  for (const e of edges) {
    _adj.get(e.fromId)!.push({ edgeId: e.id, to: e.toId, weight: e.weight ?? 1 })
    _adj.get(e.toId)!.push({ edgeId: e.id, to: e.fromId, weight: e.weight ?? 1 })
  }
  return { nodes, edges, _adj, _nodeIndex } as unknown as NavGraph
}

describe('astarEngine F-008 — maxExpansions', () => {
  const options: RouteOptions = { mode: 'standard' }

  it('trouve le chemin sur un graphe simple', () => {
    const graph = buildLineGraph(10)
    const result = astarForward({ graph, fromId: 'n0', toId: 'n9', options })
    expect(result).not.toBeNull()
    expect(result!.nodeIds).toEqual(['n0', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9'])
  })

  it('leve RouteAbortedError si maxExpansions=1 sur un grand graphe', () => {
    const graph = buildLineGraph(100)
    expect(() =>
      astarForward({ graph, fromId: 'n0', toId: 'n99', options: { ...options, maxExpansions: 1 } })
    ).toThrow(RouteAbortedError)
  })

  it('leve RouteAbortedError si signal deja aborte', () => {
    const graph = buildLineGraph(10)
    const controller = new AbortController()
    controller.abort()
    expect(() =>
      astarForward({ graph, fromId: 'n0', toId: 'n9', options: { ...options, signal: controller.signal } })
    ).toThrow(RouteAbortedError)
  })

  it('retourne null sur noeud inexistant', () => {
    const graph = buildLineGraph(5)
    const result = astarForward({ graph, fromId: 'n0', toId: 'missing', options })
    expect(result).toBeNull()
  })
})
