// ═══ Vol.4 · GOD MODE Signage Host ═══
//
// Même logique que Vol.3 mais enrichi avec le graphe Wayfinder multi-étages
// (positions des bornes interactives incluses comme ancres de signalétique).

import { useCallback } from 'react'
import { usePlanEngineStore } from '../../shared/stores/planEngineStore'
import GodModeSignagePanel from '../../shared/components/GodModeSignagePanel'
import { buildWayfinderGraph } from '../engines/wayfinderBridge'
import { useVol4Store } from '../store/vol4Store'
import type { GodModeInput } from '../../shared/engines/godModeSignageEngine'

export default function GodModeSignageHost() {
  const parsedPlan = usePlanEngineStore((s) => s.parsedPlan)
  const kiosks = useVol4Store((s) => s.kiosks)

  const buildInput = useCallback((): GodModeInput => {
    if (!parsedPlan) {
      return {
        navGraph: { nodes: [], edges: [], _nodeIndex: new Map(), _adj: new Map() } as any,
        ceilingHeightM: 3.0,
        entrances: [],
      }
    }

    const { graph } = buildWayfinderGraph({ parsedPlan })

    const entrances = graph.nodes
      .filter((n) => n.kind === 'entrance')
      .map((n) => ({ x: n.x, y: n.y, floorId: 'RDC', label: n.label ?? 'Entrée' }))

    const verticalTransits = graph.nodes
      .filter((n) => n.kind === 'transit')
      .map((n) => ({ x: n.x, y: n.y, floorId: 'RDC', kind: 'escalator' }))

    // Les bornes Vol.4 sont des points d'information très fréquentés — elles
    // servent d'ancres supplémentaires pour la signalétique institutionnelle.
    const kioskAnchors = kiosks.map((k) => ({
      x: k.x, y: k.y, floorId: k.floorId, label: `Borne « ${k.label} »`,
    }))

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
      entrances: [...entrances, ...kioskAnchors],
      verticalTransits,
      attractiveSpaces,
    }
  }, [parsedPlan, kiosks])

  if (!parsedPlan) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="text-slate-200 font-semibold mb-1">Aucun plan chargé</div>
        <p className="text-slate-500 text-sm max-w-md">
          Importez ou chargez un plan pour activer le GOD MODE signalétique.
          Les bornes interactives configurées seront incluses comme ancres.
        </p>
      </div>
    )
  }

  return <GodModeSignagePanel buildInput={buildInput} volumeColor="#b38a5a" />
}
