// ═══ WEB WORKER — RASTER VECTORIZER (NON-BLOQUANT) ═══
// Optional Potrace-based bitmap vectorization for plan images

export interface RasterVectorizerRequest {
  type: 'vectorize'
  imageData: ImageData
  threshold?: number
}

export interface RasterVectorizerResponse {
  type: 'vectorize'
  svgPaths: string[]
  error?: string
}

self.onmessage = async (event: MessageEvent<RasterVectorizerRequest>) => {
  const { type, imageData, threshold = 128 } = event.data

  if (type !== 'vectorize') return

  try {
    // Simple edge-detection based vectorization
    // Converts image to high-contrast B&W, then extracts contour paths
    const { width, height, data } = imageData
    const bw = new Uint8Array(width * height)

    // Convert to grayscale + threshold
    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4]
      const g = data[i * 4 + 1]
      const b = data[i * 4 + 2]
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      bw[i] = gray < threshold ? 1 : 0
    }

    // Simple contour extraction using marching squares
    const paths: string[] = []
    const visited = new Uint8Array(width * height)

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        if (bw[idx] === 1 && !visited[idx]) {
          // Check if this is an edge pixel (at least one neighbor is 0)
          const isEdge =
            bw[idx - 1] === 0 || bw[idx + 1] === 0 ||
            bw[idx - width] === 0 || bw[idx + width] === 0

          if (isEdge) {
            visited[idx] = 1
            // Trace the contour
            const contour = traceContour(bw, visited, x, y, width, height)
            if (contour.length > 4) {
              const simplified = simplifyPath(contour, 2)
              const pathStr = simplified
                .map((p, i) => `${i === 0 ? 'M' : 'L'}${(p[0] / width).toFixed(4)},${(p[1] / height).toFixed(4)}`)
                .join(' ')
              paths.push(pathStr + ' Z')
            }
          }
        }
      }
    }

    self.postMessage({ type: 'vectorize', svgPaths: paths } satisfies RasterVectorizerResponse)
  } catch (err) {
    self.postMessage({
      type: 'vectorize',
      svgPaths: [],
      error: err instanceof Error ? err.message : 'Erreur vectorisation',
    } satisfies RasterVectorizerResponse)
  }
}

function traceContour(
  bw: Uint8Array, visited: Uint8Array,
  startX: number, startY: number,
  width: number, height: number
): [number, number][] {
  const contour: [number, number][] = [[startX, startY]]
  const dirs = [[-1, 0], [0, -1], [1, 0], [0, 1], [-1, -1], [1, -1], [1, 1], [-1, 1]]
  let cx = startX, cy = startY
  const maxSteps = 10000

  for (let step = 0; step < maxSteps; step++) {
    let found = false
    for (const [dx, dy] of dirs) {
      const nx = cx + dx, ny = cy + dy
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
      const nIdx = ny * width + nx
      if (bw[nIdx] === 1 && !visited[nIdx]) {
        const isEdge =
          (nx > 0 && bw[nIdx - 1] === 0) || (nx < width - 1 && bw[nIdx + 1] === 0) ||
          (ny > 0 && bw[nIdx - width] === 0) || (ny < height - 1 && bw[nIdx + width] === 0)
        if (isEdge) {
          visited[nIdx] = 1
          contour.push([nx, ny])
          cx = nx
          cy = ny
          found = true
          break
        }
      }
    }
    if (!found) break
  }

  return contour
}

function simplifyPath(points: [number, number][], tolerance: number): [number, number][] {
  if (points.length <= 2) return points
  // Ramer-Douglas-Peucker simplification
  let maxDist = 0
  let maxIdx = 0
  const first = points[0]
  const last = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDist(points[i], first, last)
    if (dist > maxDist) { maxDist = dist; maxIdx = i }
  }

  if (maxDist > tolerance) {
    const left = simplifyPath(points.slice(0, maxIdx + 1), tolerance)
    const right = simplifyPath(points.slice(maxIdx), tolerance)
    return [...left.slice(0, -1), ...right]
  }

  return [first, last]
}

function perpendicularDist(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.sqrt((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2)
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq))
  return Math.sqrt((p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2)
}
