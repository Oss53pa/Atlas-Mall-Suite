// ═══ IMAGE PREPROCESSOR — Clean architectural plans before analysis ═══
// Removes: annotations, hatches, thin lines, text, network overlays
// Keeps: walls (thick dark lines), room boundaries

export interface PreprocessOptions {
  wallThreshold: number      // 0-255, pixels darker than this → wall (default 80)
  noiseThreshold: number     // 0-255, pixels lighter than this → background (default 200)
  dilationRadius: number     // px, connect fragmented walls (default 1)
  minComponentSize: number   // px, remove isolated small elements (default 50)
  removeText: boolean        // blank out text regions (default true)
}

const DEFAULT_OPTIONS: PreprocessOptions = {
  wallThreshold: 80,
  noiseThreshold: 200,
  dilationRadius: 1,
  minComponentSize: 50,
  removeText: true,
}

// ── Main preprocessing pipeline ──────────────────────────────

export async function preprocessPlanImage(
  imageSource: File | Blob | string,
  options: Partial<PreprocessOptions> = {}
): Promise<{ cleanBlob: Blob; cleanUrl: string; originalUrl: string; stats: PreprocessStats }> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const img = await loadImageElement(imageSource)
  const W = img.width
  const H = img.height

  // Original URL for comparison
  const originalUrl = typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource instanceof File ? imageSource : imageSource)

  // Draw to canvas
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, W, H)
  const data = imageData.data

  let wallPixels = 0
  let removedPixels = 0

  // Step 1: Detect "ink" pixels — any pixel that is dark OR saturated (colored)
  // AutoCAD plans use colored lines: blue=structure, red=fire, magenta=electrical
  // We need to keep ALL of these, not just black pixels
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]

    // Luminance (grayscale equivalent)
    const lum = Math.round(r * 0.299 + g * 0.587 + b * 0.114)

    // Saturation: how far from gray? High saturation = colored line
    const maxC = Math.max(r, g, b)
    const minC = Math.min(r, g, b)
    const saturation = maxC > 0 ? (maxC - minC) / maxC : 0

    // A pixel is "ink" (wall/line) if:
    // - It's dark (luminance < wallThreshold), OR
    // - It's saturated (colored line, saturation > 0.3 and not too bright)
    const isDark = lum <= opts.wallThreshold
    const isColoredLine = saturation > 0.3 && lum < 200
    const isBackground = lum >= opts.noiseThreshold && saturation < 0.15

    if (isDark || isColoredLine) {
      data[i] = data[i + 1] = data[i + 2] = 0  // Ink: black
      wallPixels++
    } else if (isBackground) {
      data[i] = data[i + 1] = data[i + 2] = 255  // Background: white
    } else {
      // Light unsaturated mid-range: noise (light hatches, faded annotations)
      data[i] = data[i + 1] = data[i + 2] = 255
      removedPixels++
    }
  }

  // Step 3: Remove small isolated components (mobilier symbols, dimension arrows)
  if (opts.minComponentSize > 0) {
    removeSmallComponents(data, W, H, opts.minComponentSize)
  }

  // Step 4: Morphological dilation to reconnect fragmented walls
  if (opts.dilationRadius > 0) {
    dilateBlack(data, W, H, opts.dilationRadius)
  }

  ctx.putImageData(imageData, 0, 0)

  // Convert to blob
  const cleanBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      'image/png'
    )
  })

  const cleanUrl = URL.createObjectURL(cleanBlob)

  return {
    cleanBlob,
    cleanUrl,
    originalUrl,
    stats: {
      width: W,
      height: H,
      wallPixelsPct: Math.round((wallPixels / (W * H)) * 100),
      removedPixelsPct: Math.round((removedPixels / (W * H)) * 100),
    },
  }
}

export interface PreprocessStats {
  width: number
  height: number
  wallPixelsPct: number
  removedPixelsPct: number
}

// ── Remove small connected components ────────────────────────
// Flood-fill black regions; if area < minSize, turn them white

function removeSmallComponents(data: Uint8ClampedArray, W: number, H: number, minSize: number): void {
  const visited = new Uint8Array(W * H)

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x
      if (visited[idx] || data[idx * 4] !== 0) continue

      // BFS to find connected black component
      const pixels: number[] = []
      const queue = [idx]
      visited[idx] = 1

      while (queue.length > 0) {
        const ci = queue.pop()!
        pixels.push(ci)
        const cx = ci % W, cy = Math.floor(ci / W)

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue
          const ni = ny * W + nx
          if (!visited[ni] && data[ni * 4] === 0) {
            visited[ni] = 1
            queue.push(ni)
          }
        }
      }

      // If too small, erase it
      if (pixels.length < minSize) {
        for (const pi of pixels) {
          data[pi * 4] = data[pi * 4 + 1] = data[pi * 4 + 2] = 255
        }
      }
    }
  }
}

// ── Morphological dilation (expand black pixels) ─────────────

function dilateBlack(data: Uint8ClampedArray, W: number, H: number, radius: number): void {
  // Find all black pixels first
  const blackPixels: number[] = []
  for (let i = 0; i < W * H; i++) {
    if (data[i * 4] === 0) blackPixels.push(i)
  }

  // Dilate: mark neighbors of black pixels as black
  for (const idx of blackPixels) {
    const cx = idx % W, cy = Math.floor(idx / W)
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = cx + dx, ny = cy + dy
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
          const ni = (ny * W + nx) * 4
          data[ni] = data[ni + 1] = data[ni + 2] = 0
        }
      }
    }
  }
}

// ── Load image from various sources ──────────────────────────

function loadImageElement(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    if (typeof source === 'string') {
      img.src = source
    } else {
      img.src = URL.createObjectURL(source)
    }
  })
}
