import { Play, Pause, Square, FastForward } from 'lucide-react'

interface SimulationPlayerProps {
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  currentTime: number
  totalTime: number
  speed: number
  onSpeedChange: (speed: number) => void
  onSeek?: (time: number) => void
  label?: string
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

const SPEEDS = [0.5, 1, 2, 5]

export default function SimulationPlayer({
  isPlaying,
  onPlay,
  onPause,
  onStop,
  currentTime,
  totalTime,
  speed,
  onSpeedChange,
  onSeek,
  label = 'Simulation',
}: SimulationPlayerProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-t border-gray-800">
      <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide min-w-[80px]">
        {label}
      </span>

      <div className="flex items-center gap-1">
        {isPlaying ? (
          <button
            onClick={onPause}
            className="p-1.5 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={onPlay}
            className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onStop}
          className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
      </div>

      <input
        type="range"
        min={0}
        max={totalTime}
        value={currentTime}
        onChange={(e) => onSeek?.(Number(e.target.value))}
        className="flex-1 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full"
      />

      <span className="text-[10px] text-gray-400 font-mono min-w-[90px] text-right">
        {formatTime(currentTime)} / {formatTime(totalTime)}
      </span>

      <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-0.5">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors flex items-center gap-0.5 ${
              speed === s
                ? 'bg-gray-700 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {s > 1 && <FastForward className="w-2.5 h-2.5" />}
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}
