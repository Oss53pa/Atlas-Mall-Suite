import React from 'react'
import type { NavigationGraph } from '../../shared/proph3t/types'

interface GraphBuilderProps {
  graph: NavigationGraph
  showLabels: boolean
}

export default function GraphBuilder({ graph, showLabels }: GraphBuilderProps) {
  return (
    <g>
      {/* Edges */}
      {graph.edges.map((edge) => {
        const fromNode = graph.nodes.find((n) => n.id === edge.from)
        const toNode = graph.nodes.find((n) => n.id === edge.to)
        if (!fromNode || !toNode) return null

        return (
          <line
            key={edge.id}
            x1={fromNode.x} y1={fromNode.y}
            x2={toNode.x} y2={toNode.y}
            stroke={edge.pmr ? '#06b6d4' : '#4b5563'}
            strokeWidth={edge.pmr ? 0.8 : 0.4}
            strokeDasharray={edge.pmr ? undefined : '2 1'}
            opacity={0.5}
          />
        )
      })}

      {/* Nodes */}
      {graph.nodes.map((node) => (
        <g key={node.id}>
          <circle
            cx={node.x} cy={node.y}
            r={node.poiId ? 2 : 1}
            fill={node.isTransition ? '#8b5cf6' : node.poiId ? '#10b981' : '#6b7280'}
            opacity={0.7}
          />
          {showLabels && node.label && (
            <text
              x={node.x} y={node.y - 3}
              textAnchor="middle" fill="#9ca3af" fontSize={2}
              style={{ pointerEvents: 'none' }}
            >
              {node.label}
            </text>
          )}
        </g>
      ))}
    </g>
  )
}
