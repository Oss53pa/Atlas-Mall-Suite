// ═══ TOUR PLAYER — Floating playback bar ═══
//
// Mounts at the bottom of the viewer while a tour is active.
// • Shows step card (title + description + optional media)
// • Prev / Next / Play-auto buttons
// • Step dots for direct navigation
// • Auto-play countdown via 1-second interval
// • Emits onFloorChange when a step requires switching floors

import { useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Play, Pause, X } from 'lucide-react'
import { useTourStore } from './stores/tourStore'
import TourStepCard from './TourStepCard'
import type { FloorLevelKey } from '../proph3t/libraries/spaceTypeLibrary'

interface TourPlayerProps {
  /** Called whenever active step changes to a different floor */
  onFloorChange?: (floor: FloorLevelKey) => void
  /** Called whenever active step changes (to pan the viewport) */
  onStepChange?: (x: number, y: number, zoomLevel?: number) => void
  className?: string
}

export default function TourPlayer({ onFloorChange, onStepChange, className = '' }: TourPlayerProps) {
  const player       = useTourStore((s) => s.player)
  const tours        = useTourStore((s) => s.tours)
  const stopTour     = useTourStore((s) => s.stopTour)
  const goToStep     = useTourStore((s) => s.goToStep)
  const nextStep     = useTourStore((s) => s.nextStep)
  const prevStep     = useTourStore((s) => s.prevStep)
  const toggleAP     = useTourStore((s) => s.toggleAutoPlay)
  const tick         = useTourStore((s) => s.tickCountdown)

  const tour = tours.find((t) => t.id === player.activeTourId)
  const step = tour?.steps[player.currentStepIndex]

  // ── Auto-play countdown interval ─────────────────────────────────────────
  useEffect(() => {
    if (!player.autoPlay || !player.isPlaying) return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [player.autoPlay, player.isPlaying, tick])

  // ── Notify parent of step/floor changes ──────────────────────────────────
  useEffect(() => {
    if (!step) return
    onFloorChange?.(step.floorLevel)
    onStepChange?.(step.x, step.y, step.zoomLevel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.currentStepIndex, player.activeTourId])

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!player.isPlaying) return
    if (e.key === 'ArrowRight') nextStep()
    if (e.key === 'ArrowLeft')  prevStep()
    if (e.key === 'Escape')     stopTour()
    if (e.key === ' ')          { e.preventDefault(); toggleAP() }
  }, [player.isPlaying, nextStep, prevStep, stopTour, toggleAP])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!tour || !step || !player.isPlaying) return null

  const stepCount  = tour.steps.length
  const isFirst    = player.currentStepIndex === 0
  const isLast     = player.currentStepIndex === stepCount - 1

  return (
    <div
      className={[
        'absolute bottom-4 left-1/2 -translate-x-1/2 z-40',
        'w-[340px] max-w-[calc(100vw-2rem)]',
        'bg-[#0f1e35]/95 backdrop-blur-md border border-white/15 rounded-2xl shadow-2xl',
        className,
      ].join(' ')}
      style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,211,238,0.15)' }}
    >
      {/* Header: tour name + close */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0">
        <span className="text-[10px] uppercase tracking-widest text-cyan-400/70 font-semibold">
          {tour.name}
        </span>
        <button
          onClick={stopTour}
          className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* Step card */}
      <div className="px-4 py-3">
        <TourStepCard
          step={step}
          index={player.currentStepIndex}
          total={stepCount}
          autoPlay={player.autoPlay}
          countdown={player.countdown}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-1.5 px-4 pb-2">
        {tour.steps.map((_, i) => (
          <button
            key={i}
            onClick={() => goToStep(i)}
            className={[
              'rounded-full transition-all',
              i === player.currentStepIndex
                ? 'w-4 h-2 bg-cyan-400'
                : i < player.currentStepIndex
                  ? 'w-2 h-2 bg-cyan-700'
                  : 'w-2 h-2 bg-white/15 hover:bg-white/30',
            ].join(' ')}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 pb-4 gap-2">
        {/* Prev */}
        <button
          onClick={prevStep}
          disabled={isFirst}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-white/50 hover:text-white hover:border-white/25 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={14} /> Préc
        </button>

        {/* Auto-play toggle */}
        <button
          onClick={toggleAP}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
            player.autoPlay
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
              : 'border-white/10 text-white/50 hover:text-white hover:border-white/25',
          ].join(' ')}
        >
          {player.autoPlay ? <Pause size={12} /> : <Play size={12} />}
          {player.autoPlay ? `${player.countdown}s` : 'Auto'}
        </button>

        {/* Next */}
        <button
          onClick={isLast ? stopTour : nextStep}
          className={[
            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
            isLast
              ? 'bg-green-500/15 border-green-500/40 text-green-300 hover:bg-green-500/25'
              : 'border-white/10 text-white/50 hover:text-white hover:border-white/25',
          ].join(' ')}
        >
          {isLast ? 'Terminer' : 'Suiv'} <ChevronRight size={14} />
        </button>
      </div>

      {/* Keyboard hint */}
      <div className="px-4 pb-2 text-[9px] text-white/20 text-center">
        ← → Naviguer · Espace Auto-play · Échap Fermer
      </div>
    </div>
  )
}
