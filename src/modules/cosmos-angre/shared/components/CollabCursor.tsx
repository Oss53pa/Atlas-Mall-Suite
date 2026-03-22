import React from 'react'

interface CursorData {
  userId: string
  name: string
  x: number
  y: number
  color: string
}

interface CollabCursorProps {
  cursors: CursorData[]
}

export default function CollabCursor({ cursors }: CollabCursorProps) {
  return (
    <>
      {cursors.map((c) => (
        <g
          key={c.userId}
          transform={`translate(${c.x}, ${c.y})`}
          style={{ transition: 'transform 120ms ease-out' }}
        >
          <path
            d="M0 0 L0 14 L4 10 L8 16 L10 15 L6 9 L11 9 Z"
            fill={c.color}
            stroke="#fff"
            strokeWidth={0.8}
          />
          <rect
            x={12}
            y={8}
            width={c.name.length * 5.5 + 8}
            height={14}
            rx={3}
            fill={c.color}
            opacity={0.9}
          />
          <text
            x={16}
            y={18}
            fill="#fff"
            fontSize={8}
            fontFamily="system-ui"
            fontWeight={500}
          >
            {c.name}
          </text>
        </g>
      ))}
    </>
  )
}
