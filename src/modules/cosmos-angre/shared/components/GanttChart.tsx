import React, { useMemo } from 'react'

export interface GanttTask {
  id: string
  label: string
  startDate: string
  endDate: string
  progress: number // 0-100
  color: string
  group?: string
  dependencies?: string[]
}

interface GanttChartProps {
  tasks: GanttTask[]
  todayLine?: boolean
  height?: number
}

export default function GanttChart({ tasks, todayLine = true, height = 400 }: GanttChartProps) {
  const ROW_H = 28
  const LABEL_W = 160
  const PADDING = 16

  const { minDate, maxDate, totalDays } = useMemo(() => {
    const dates = tasks.flatMap(t => [new Date(t.startDate).getTime(), new Date(t.endDate).getTime()])
    const min = Math.min(...dates)
    const max = Math.max(...dates)
    const days = Math.max(1, Math.ceil((max - min) / 86_400_000))
    return { minDate: min, maxDate: max, totalDays: days }
  }, [tasks])

  const chartW = 600
  const svgW = LABEL_W + chartW + PADDING * 2
  const svgH = Math.max(height, tasks.length * ROW_H + 60)

  const dayToX = (date: string) => {
    const d = new Date(date).getTime()
    return LABEL_W + PADDING + ((d - minDate) / (maxDate - minDate)) * chartW
  }

  const todayX = dayToX(new Date().toISOString())

  // Month markers
  const months: { label: string; x: number }[] = []
  const start = new Date(minDate)
  const end = new Date(maxDate)
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cursor <= end) {
    months.push({
      label: cursor.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      x: dayToX(cursor.toISOString()),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return (
    <div className="overflow-x-auto rounded-lg" style={{ background: '#0f1729', border: '1px solid #1e2a3a' }}>
      <svg width={svgW} height={svgH} className="text-white">
        {/* Month headers */}
        {months.map((m, i) => (
          <g key={i}>
            <line x1={m.x} y1={20} x2={m.x} y2={svgH} stroke="#1e2a3a" strokeWidth={1} />
            <text x={m.x + 4} y={14} fill="#6b7280" fontSize={10}>{m.label}</text>
          </g>
        ))}

        {/* Rows */}
        {tasks.map((task, i) => {
          const y = 30 + i * ROW_H
          const x1 = dayToX(task.startDate)
          const x2 = dayToX(task.endDate)
          const barW = Math.max(4, x2 - x1)
          const progressW = barW * (task.progress / 100)

          return (
            <g key={task.id}>
              {/* Row stripe */}
              {i % 2 === 0 && <rect x={0} y={y} width={svgW} height={ROW_H} fill="rgba(255,255,255,0.02)" />}

              {/* Label */}
              <text x={8} y={y + ROW_H / 2 + 4} fill="#94a3b8" fontSize={11} className="select-none">
                {task.label.length > 22 ? task.label.slice(0, 22) + '...' : task.label}
              </text>

              {/* Bar background */}
              <rect x={x1} y={y + 4} width={barW} height={ROW_H - 8} rx={4} fill={`${task.color}30`} />

              {/* Bar progress */}
              <rect x={x1} y={y + 4} width={progressW} height={ROW_H - 8} rx={4} fill={task.color} opacity={0.8} />

              {/* Progress text */}
              <text x={x1 + barW + 4} y={y + ROW_H / 2 + 4} fill="#6b7280" fontSize={10}>
                {task.progress}%
              </text>
            </g>
          )
        })}

        {/* Today line */}
        {todayLine && (
          <line x1={todayX} y1={20} x2={todayX} y2={svgH} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
        )}
      </svg>
    </div>
  )
}
