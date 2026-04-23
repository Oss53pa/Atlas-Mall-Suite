// ═══ DWG → DXF CONVERTER — LibreDWG WASM (runs in browser, 100% free) ═══
// The dwg2dxf WASM is a compiled C CLI program (LibreDWG).
// It works like: dwg2dxf input.dwg → outputs input.dxf
// We use Emscripten's virtual filesystem to feed it the file.

/**
 * Convert a DWG file to DXF text using LibreDWG WASM.
 * First call loads the WASM module (~6MB, cached after first load).
 */
export async function convertDwgToDxf(
  dwgFile: File,
  onProgress?: (msg: string) => void
): Promise<string> {
  onProgress?.('Chargement du moteur de conversion DWG (LibreDWG WASM)...')

  const dwgData = new Uint8Array(await dwgFile.arrayBuffer())
  const inputName = 'input.dwg'
  const outputName = 'input.dxf'

  // Each conversion creates a fresh WASM instance with the right arguments.
  // Emscripten CLI programs read argv during initialization, so we must
  // pass the filename before the module starts.
  const factory = (await import('dwg2dxf')).default

  onProgress?.('Initialisation du convertisseur WASM...')

  let stdoutBuf = ''
  let stderrBuf = ''

  const module = await factory({
    // Pass CLI arguments: dwg2dxf input.dwg
    arguments: [inputName],

    // Serve WASM from public/ directory
    locateFile: (path: string) => {
      if (path.endsWith('.wasm')) return '/' + path
      return path
    },

    // Capture stdout/stderr for debugging
    print: (text: string) => { stdoutBuf += text + '\n' },
    printErr: (text: string) => { stderrBuf += text + '\n' },

    // Pre-load the DWG file into the virtual filesystem before main() runs
    preRun: [(mod: { FS: { writeFile: (path: string, data: Uint8Array) => void } }) => {
      onProgress?.('Ecriture du fichier DWG en memoire virtuelle...')
      mod.FS.writeFile(inputName, dwgData)
    }],
  })

  onProgress?.('Conversion terminee, lecture du DXF...')

  // The program has already run at this point (main() executes during init).
  // Read the output DXF from the virtual filesystem.
  const FS = module.FS

  // Try to find the output file
  const candidatePaths = [outputName, '/' + outputName, './' + outputName]

  for (const path of candidatePaths) {
    try {
      const dxfContent = FS.readFile(path, { encoding: 'utf8' }) as string
      if (dxfContent && dxfContent.length > 50 && dxfContent.includes('SECTION')) {
        onProgress?.(`DXF genere (${Math.round(dxfContent.length / 1024)} Ko)`)
        return dxfContent
      }
    } catch {
      // File not at this path, try next
    }
  }

  // List all files for debugging
  let files: string[] = []
  try { files = FS.readdir('/') as string[] } catch { /* ignore */ }

  // Check for any .dxf file in the root
  for (const f of files) {
    if (f.endsWith('.dxf')) {
      try {
        const content = FS.readFile('/' + f, { encoding: 'utf8' }) as string
        if (content && content.length > 50) {
          onProgress?.(`DXF genere: ${f} (${Math.round(content.length / 1024)} Ko)`)
          return content
        }
      } catch { /* ignore */ }
    }
  }

  // Conversion failed
  const debugInfo = [
    stderrBuf ? `stderr: ${stderrBuf.slice(0, 200)}` : '',
    `fichiers: ${files.filter(f => f !== '.' && f !== '..').join(', ')}`,
  ].filter(Boolean).join('. ')

  throw new Error(`Conversion DWG echouee — aucun fichier DXF produit. ${debugInfo}`)
}

/**
 * Check if a file is a DWG (by extension).
 */
export function isDwgFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.dwg')
}
