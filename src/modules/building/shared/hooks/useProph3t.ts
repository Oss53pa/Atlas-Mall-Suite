import { useCallback } from 'react'
import type {
  Zone,
  Camera,
  Door,
  BlindSpot,
  SecurityScore,
  ChatAnswer,
  CascadeTrigger,
  CascadeResult
} from '../proph3t/types'
import type { FullProjectContext } from '../proph3t/chatEngine'
import { proph3tAnswer } from '../proph3t/chatEngine'
import { runCascade } from '../proph3t/cascadeEngine'
import type { CascadeState } from '../proph3t/cascadeEngine'
import { detectBlindSpots, scoreSecurite, solveCameraPlacement } from '../proph3t/engine'
import { useWorker } from './useWorker'

interface CoverageSolverInput {
  zones: Zone[]
  floorId: string
  widthM: number
  heightM: number
  existingCameras: Camera[]
}

interface AutoPlaceOptions {
  floorId: string
  widthM: number
  heightM: number
  existingCameras: Camera[]
}

export function useProph3t() {
  const coverageWorker = useWorker<CoverageSolverInput, Camera[]>(
    () => new Worker(
      new URL('../proph3t/workers/coverageSolver.worker.ts', import.meta.url),
      { type: 'module' }
    )
  )

  const askProph3t = useCallback(
    (question: string, context: FullProjectContext): ChatAnswer => {
      return proph3tAnswer(question, context)
    },
    []
  )

  const cascade = useCallback(
    (state: CascadeState, trigger: CascadeTrigger): Promise<CascadeResult> => {
      return runCascade(state, trigger)
    },
    []
  )

  const autoPlaceCameras = useCallback(
    async (
      zones: Zone[],
      cameras: Camera[],
      options: AutoPlaceOptions
    ): Promise<Camera[]> => {
      const input: CoverageSolverInput = {
        zones,
        floorId: options.floorId,
        widthM: options.widthM,
        heightM: options.heightM,
        existingCameras: options.existingCameras,
      }

      // Try worker first for non-blocking compute; fall back to main thread
      try {
        return await coverageWorker.run(input)
      } catch {
        return solveCameraPlacement({
          zones,
          floorId: options.floorId,
          widthM: options.widthM,
          heightM: options.heightM,
          existingCameras: cameras,
        })
      }
    },
    [coverageWorker]
  )

  const detectBlindSpotsForProject = useCallback(
    (zones: Zone[], cameras: Camera[]): BlindSpot[] => {
      return detectBlindSpots(zones, cameras)
    },
    []
  )

  const calculateScore = useCallback(
    (
      zones: Zone[],
      cameras: Camera[],
      doors: Door[],
      exits: Door[]
    ): SecurityScore => {
      return scoreSecurite(zones, cameras, doors, exits)
    },
    []
  )

  return {
    askProph3t,
    runCascade: cascade,
    autoPlaceCameras,
    detectBlindSpots: detectBlindSpotsForProject,
    calculateScore,
    workerProgress: coverageWorker.progress,
    workerRunning: coverageWorker.isRunning,
    cancelWorker: coverageWorker.cancel,
  }
}
