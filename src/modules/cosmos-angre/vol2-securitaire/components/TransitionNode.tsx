import type { TransitionNode as TransitionNodeType } from '../../shared/proph3t/types'

interface TransitionNodeProps {
  transition: TransitionNodeType
  selected: boolean
  scale: number
  onClick: () => void
}

function transitionIcon(type: TransitionNodeType['type']): string {
  switch (type) {
    case 'escalator_montant': return '↑'
    case 'escalator_descendant': return '↓'
    case 'ascenseur': return '⇅'
    case 'rampe_pmr': return '♿'
    case 'escalier_secours': return '⚠'
    case 'monte_charge': return '⬆'
    default: return '↕'
  }
}

export default function TransitionNodeComponent({ transition: tr, selected, scale, onClick }: TransitionNodeProps) {
  const cx = tr.x * scale
  const cy = tr.y * scale

  return (
    <g className="cursor-pointer" onClick={onClick}>
      <circle
        cx={cx}
        cy={cy}
        r={10}
        fill={tr.pmr ? '#8B5CF6' : '#6366F1'}
        fillOpacity={0.7}
        stroke="#fff"
        strokeWidth={1}
      />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={9}
        fontWeight="bold"
      >
        {transitionIcon(tr.type)}
      </text>
      <text
        x={cx}
        y={cy - 14}
        textAnchor="middle"
        fill="#A5B4FC"
        fontSize={7}
        fontFamily="system-ui"
      >
        {tr.label}
      </text>
      {tr.pmr && (
        <text
          x={cx + 12}
          y={cy - 6}
          fill="#A78BFA"
          fontSize={7}
        >
          PMR
        </text>
      )}
      {selected && (
        <circle
          cx={cx}
          cy={cy}
          r={14}
          fill="none"
          stroke="#A5B4FC"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
      )}
    </g>
  )
}
