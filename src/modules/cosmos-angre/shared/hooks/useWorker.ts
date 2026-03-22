import { useRef, useCallback, useEffect, useState } from 'react'
import { wrap, type Remote } from 'comlink'

// ═══ RAW WORKER (postMessage protocol) ═══

interface WorkerMessage<T> {
  type: 'result' | 'progress' | 'error'
  data?: T
  percent?: number
  message?: string
}

export function useWorker<TInput, TOutput>(
  createWorker: () => Worker
) {
  const workerRef = useRef<Worker | null>(null)
  const [progress, setProgress] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => { workerRef.current?.terminate() }
  }, [])

  const run = useCallback((input: TInput): Promise<TOutput> => {
    return new Promise<TOutput>((resolve, reject) => {
      workerRef.current?.terminate()
      const worker = createWorker()
      workerRef.current = worker
      setIsRunning(true)
      setError(null)
      setProgress(0)

      worker.onmessage = (e: MessageEvent<WorkerMessage<TOutput>>) => {
        const msg = e.data
        if (msg.type === 'progress') {
          setProgress(msg.percent ?? 0)
        } else if (msg.type === 'result') {
          setIsRunning(false)
          setProgress(100)
          if (msg.data !== undefined) {
            resolve(msg.data)
          } else {
            reject(new Error('Worker returned result without data'))
          }
        } else if (msg.type === 'error') {
          setIsRunning(false)
          setError(msg.message ?? 'Worker error')
          reject(new Error(msg.message))
        }
      }

      worker.onerror = (e) => {
        setIsRunning(false)
        setError(e.message)
        reject(new Error(e.message))
      }

      worker.postMessage(input)
    })
  }, [createWorker])

  const cancel = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    setIsRunning(false)
  }, [])

  return { run, cancel, progress, isRunning, error }
}

// ═══ COMLINK-STYLE TYPED WORKER ═══

/**
 * Wraps a Worker with Comlink's `wrap()` for full type-safe RPC.
 * Usage:
 *   const api = useComlinkWorker<MyWorkerAPI>(() => new Worker(...))
 *   const result = await api.current.someMethod(arg)
 */
export function useComlinkWorker<T>(
  createWorker: () => Worker
): { proxy: Remote<T> | null; terminate: () => void } {
  const workerRef = useRef<Worker | null>(null)
  const proxyRef = useRef<Remote<T> | null>(null)

  if (!proxyRef.current) {
    const worker = createWorker()
    workerRef.current = worker
    proxyRef.current = wrap<T>(worker)
  }

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
      proxyRef.current = null
    }
  }, [])

  const terminate = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    proxyRef.current = null
  }, [])

  return { proxy: proxyRef.current, terminate }
}
