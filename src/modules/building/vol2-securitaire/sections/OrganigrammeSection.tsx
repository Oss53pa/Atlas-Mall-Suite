
interface OrgNode {
  id: string
  initials: string
  title: string
  description: string
  count: number | string
  color: string
  x: number
  y: number
  width: number
}

const nodes: OrgNode[] = [
  { id: 'dir', initials: 'DS', title: 'Directeur Sûreté', description: 'Pilotage global, audits, relation préfecture', count: 1, color: '#38bdf8', x: 400, y: 40, width: 240 },
  { id: 'cpj', initials: 'CJ', title: 'Chef de poste Jour', description: 'Coordination équipes, gestion PC sécurité', count: 1, color: '#22c55e', x: 200, y: 200, width: 240 },
  { id: 'cpn', initials: 'CN', title: 'Chef de poste Nuit', description: 'Coordination équipes, gestion PC sécurité', count: 1, color: '#a77d4c', x: 600, y: 200, width: 240 },
  { id: 'agents', initials: 'AG', title: 'Agents de sécurité SSIAP', description: 'Rondes, contrôle accès, intervention', count: '12 agents', color: '#f59e0b', x: 200, y: 360, width: 240 },
  { id: 'maint', initials: 'MT', title: 'Maintenance SSI', description: 'Vérification trimestrielle, conformité ERP', count: 'Ext.', color: '#64748b', x: 600, y: 360, width: 240 },
]

const connections: [string, string][] = [
  ['dir', 'cpj'],
  ['dir', 'cpn'],
  ['cpj', 'agents'],
  ['cpn', 'maint'],
]

function _getNodeCenter(node: OrgNode): { x: number; y: number } {
  return { x: node.x + node.width / 2, y: node.y + 60 }
}

function NodeCard({ node }: { node: OrgNode }) {
  return (
    <foreignObject x={node.x} y={node.y} width={node.width} height={110}>
      <div
        className="h-full rounded-[10px] p-4 flex items-start gap-3"
        style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}
      >
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: `${node.color}20`, color: node.color, border: `2px solid ${node.color}40` }}
        >
          {node.initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-tight">{node.title}</p>
          <p className="text-[11px] mt-1 leading-snug" style={{ color: '#4a5568' }}>{node.description}</p>
          <span className="inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${node.color}15`, color: node.color, border: `1px solid ${node.color}30` }}>
            {typeof node.count === 'number' ? `${node.count} personne${node.count > 1 ? 's' : ''}` : node.count}
          </span>
        </div>
      </div>
    </foreignObject>
  )
}

export default function OrganigrammeSection() {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]))

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>
          VOL. 2 — PLAN SÉCURITAIRE
        </p>
        <h1 className="text-[28px] font-light text-white mb-3">Organigramme</h1>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>
          Organisation de l'équipe de sécurité du centre commercial The Mall.
        </p>
      </div>

      <div className="rounded-[10px] p-6 overflow-x-auto" style={{ background: '#0f1623', border: '1px solid #1e2a3a' }}>
        <svg width="840" height="500" viewBox="0 0 840 500" className="mx-auto">
          {/* Connection lines */}
          {connections.map(([fromId, toId]) => {
            const from = nodeMap[fromId]
            const to = nodeMap[toId]
            const fromCenter = { x: from.x + from.width / 2, y: from.y + 110 }
            const toCenter = { x: to.x + to.width / 2, y: to.y }
            const midY = (fromCenter.y + toCenter.y) / 2
            return (
              <path
                key={`${fromId}-${toId}`}
                d={`M ${fromCenter.x} ${fromCenter.y} C ${fromCenter.x} ${midY}, ${toCenter.x} ${midY}, ${toCenter.x} ${toCenter.y}`}
                fill="none"
                stroke="#1e2a3a"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            )
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <NodeCard key={node.id} node={node} />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {nodes.map((n) => (
          <div key={n.id} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: n.color }} />
            <span className="text-[12px]" style={{ color: '#4a5568' }}>{n.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
