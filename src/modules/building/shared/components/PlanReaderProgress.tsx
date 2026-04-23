import React from 'react'
import type { PlanImportState } from '../planReader/planReaderTypes'

interface PlanReaderProgressProps {
  state: PlanImportState
}

const STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'detecting', label: 'Analyse' },
  { key: 'reviewing', label: 'Revision' },
  { key: 'calibrating', label: 'Calibration' },
  { key: 'confirmed', label: 'Confirme' },
] as const

export default function PlanReaderProgress({ state }: PlanReaderProgressProps) {
  const currentIdx = STEPS.findIndex(s => s.key === state.step)

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, idx) => {
          const isActive = idx === currentIdx
          const isDone = idx < currentIdx
          const isError = state.step === 'error' && idx === currentIdx

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isError
                      ? 'bg-red-600 text-white'
                      : isDone
                        ? 'bg-emerald-600 text-white'
                        : isActive
                          ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                          : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  {isError ? '!' : isDone ? '✓' : idx + 1}
                </div>
                <span className={`text-[10px] ${isActive ? 'text-blue-400' : 'text-gray-500'}`}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${isDone ? 'bg-emerald-600' : 'bg-gray-800'}`} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Progress bar */}
      {state.step === 'detecting' && (
        <div className="space-y-2">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 animate-pulse">
            {state.currentOperation}
          </p>
        </div>
      )}

      {/* Stats summary */}
      {(state.step === 'reviewing' || state.step === 'calibrating' || state.step === 'confirmed') && (
        <div className="flex gap-4 text-xs">
          <div className="bg-gray-800/50 rounded px-3 py-2">
            <span className="text-gray-400">Zones : </span>
            <span className="text-white font-medium">{state.detectedZones.length}</span>
          </div>
          <div className="bg-gray-800/50 rounded px-3 py-2">
            <span className="text-gray-400">Cotes : </span>
            <span className="text-white font-medium">{state.detectedDims.length}</span>
          </div>
          {state.calibration && (
            <div className="bg-gray-800/50 rounded px-3 py-2">
              <span className="text-gray-400">Calibration : </span>
              <span className={`font-medium ${
                state.calibration.confidence >= 0.8 ? 'text-emerald-400' :
                state.calibration.confidence >= 0.5 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {Math.round(state.calibration.confidence * 100)}%
              </span>
            </div>
          )}
          <div className="bg-gray-800/50 rounded px-3 py-2">
            <span className="text-gray-400">Source : </span>
            <span className="text-white font-medium uppercase">{state.sourceType}</span>
          </div>
        </div>
      )}

      {/* Errors */}
      {state.errors.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded p-3 space-y-1">
          {state.errors.map((err, i) => (
            <p key={i} className="text-xs text-red-300">{err}</p>
          ))}
        </div>
      )}

      {/* Warnings */}
      {state.warnings.length > 0 && (
        <div className="bg-amber-900/30 border border-amber-700 rounded p-3 space-y-1">
          {state.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-300">{w}</p>
          ))}
        </div>
      )}
    </div>
  )
}
