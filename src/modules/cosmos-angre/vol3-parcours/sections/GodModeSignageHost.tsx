// ═══ Vol.3 · GOD MODE Signage Host ═══
//
// Hôte qui prépare un GodModeInput à partir des données Vol.3 (parcours)
// et monte le panel partagé.

import { useCallback } from 'react'
import { usePlanEngineStore } from '../../shared/stores/planEngineStore'
import GodModeSignagePanel from '../../shared/components/GodModeSignagePanel'
import {
  buildWayfinderGraph,
} from '../../vol4-wayfinder/engines/wayfinderBridge'
import type { GodModeInput } from '../../shared/engines/godModeSignageEngine'

export default function GodModeSignageHost() {
  const parsedPlan = usePlanEngineStore((s) => s.parsedPlan)

  const buildInput = useCallback((): GodModeInput => {
    if (!parsedPlan) {
      return {
        navGraph: { nodes: [], edges: [], _nodeIndex: new Map(), _adj: new Map() } as any,
        ceilingHeightM: 3.0,
        entrances: [],
      }
    }

    // Réutilise le wayfinderBridge pour obtenir le graphe de navigation
    const { graph } = buildWayfinderGraph({ parsedPlan })

    // Entrées : nœuds kind="entrance"
    const entrances = graph.nodes
      .filter((n) => n.kind === 'entrance')
      .map((n) => ({
        x: n.x,
        y: n.y,
        floorId: 'RDC',
        label: n.label ?? 'Entrée',
      }))

    // Transits verticaux : nœuds kind="transit"
    const verticalTransits = graph.nodes
      .filter((n) => n.kind === 'transit')
      .map((n) => ({
        x: n.x,
        y: n.y,
        floorId: 'RDC',
        kind: 'escalator',
      }))

    // Zones attractives : tous les spaces avec un label significatif (marchand)
    const attractiveSpaces = parsedPlan.spaces
      .filter((s) => s.areaSqm > 20 && s.areaSqm < 500)
      .slice(0, 30)
      .map((s) => ({
        polygon: s.polygon,
        attractivityScore: Math.min(1, s.areaSqm / 200),
      }))

    return {
      navGraph: graph,
      ceilingHeightM: 3.2,
      entrances: entrances.length > 0 ? entrances : [
        { x: parsedPlan.bounds.centerX, y: parsedPlan.bounds.minY + 5, floorId: 'RDC', label: 'Entrée principale' },
      ],
      verticalTransits,
      attractiveSpaces,
    }
  }, [parsedPlan])

  if (!parsedPlan) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="text-slate-200 font-semibold mb-1">Aucun plan chargé</div>
        <p className="text-slate-500 text-sm max-w-md">
          Importez ou chargez un plan pour activer le GOD MODE signalétique.
        </p>
      </div>
    )
  }

  return <GodModeSignagePanel buildInput={buildInput} volumeColor="#a855f7" />
}
