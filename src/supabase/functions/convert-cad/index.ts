// supabase/functions/convert-cad/index.ts
// Deno Edge Function — CAD File Conversion Server
//
// Converts proprietary CAD formats to open standards:
//   DWG → DXF  via ODA File Converter (Open Design Alliance)
//   RVT → IFC  via Autodesk Platform Services (APS) API
//
// Environment variables required:
//   ODA_CONVERTER_PATH  — path to ODAFileConverter binary on the server
//   APS_CLIENT_ID       — Autodesk APS OAuth client ID
//   APS_CLIENT_SECRET   — Autodesk APS OAuth client secret
//   SUPABASE_URL        — for storage uploads
//   SUPABASE_SERVICE_ROLE_KEY — for storage uploads

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-key",
}

// ═══ ODA DWG → DXF CONVERSION ═══

async function convertDwgToDxf(fileBytes: Uint8Array, fileName: string): Promise<{ dxfContent: string; version: string }> {
  const odaPath = Deno.env.get("ODA_CONVERTER_PATH")

  if (!odaPath) {
    // Fallback: use libredwg if available
    return await convertDwgViaLibreDwg(fileBytes, fileName)
  }

  // Write temp input file
  const tmpDir = await Deno.makeTempDir({ prefix: "atlas-dwg-" })
  const inputPath = `${tmpDir}/input.dwg`
  const outputDir = `${tmpDir}/output`

  try {
    await Deno.mkdir(outputDir, { recursive: true })
    await Deno.writeFile(inputPath, fileBytes)

    // Run ODA File Converter
    // ODAFileConverter <input_folder> <output_folder> <output_version> <output_type> <recurse> <audit>
    // Output version: "ACAD2018" for modern DXF
    // Output type: "DXF" for ASCII DXF
    const cmd = new Deno.Command(odaPath, {
      args: [tmpDir, outputDir, "ACAD2018", "DXF", "0", "1"],
      stdout: "piped",
      stderr: "piped",
    })

    const { code, stderr } = await cmd.output()

    if (code !== 0) {
      const errText = new TextDecoder().decode(stderr)
      throw new Error(`ODA conversion failed (code ${code}): ${errText}`)
    }

    // Read output DXF
    const outputFiles = []
    for await (const entry of Deno.readDir(outputDir)) {
      if (entry.name.toLowerCase().endsWith(".dxf")) {
        outputFiles.push(entry.name)
      }
    }

    if (outputFiles.length === 0) {
      throw new Error("ODA converter produced no DXF output")
    }

    const dxfBytes = await Deno.readFile(`${outputDir}/${outputFiles[0]}`)
    const dxfContent = new TextDecoder().decode(dxfBytes)

    // Extract version from DXF header
    const versionMatch = dxfContent.match(/\$ACADVER[\s\S]*?AC(\d{4})/)
    const version = versionMatch ? `AC${versionMatch[1]}` : "unknown"

    return { dxfContent, version }
  } finally {
    // Cleanup temp files
    try {
      await Deno.remove(tmpDir, { recursive: true })
    } catch { /* ignore cleanup errors */ }
  }
}

async function convertDwgViaLibreDwg(fileBytes: Uint8Array, _fileName: string): Promise<{ dxfContent: string; version: string }> {
  // Try dwgread/dwg2dxf from libredwg (commonly available on Linux)
  const tmpDir = await Deno.makeTempDir({ prefix: "atlas-dwg-libre-" })
  const inputPath = `${tmpDir}/input.dwg`
  const outputPath = `${tmpDir}/output.dxf`

  try {
    await Deno.writeFile(inputPath, fileBytes)

    // Try dwg2dxf first
    try {
      const cmd = new Deno.Command("dwg2dxf", {
        args: ["-o", outputPath, inputPath],
        stdout: "piped",
        stderr: "piped",
      })
      const { code } = await cmd.output()

      if (code === 0) {
        const dxfBytes = await Deno.readFile(outputPath)
        const dxfContent = new TextDecoder().decode(dxfBytes)
        return { dxfContent, version: "libredwg" }
      }
    } catch { /* dwg2dxf not available */ }

    // Try LibreCAD CLI
    try {
      const cmd = new Deno.Command("librecad", {
        args: ["--convert", inputPath, outputPath],
        stdout: "piped",
        stderr: "piped",
      })
      const { code } = await cmd.output()

      if (code === 0) {
        const dxfBytes = await Deno.readFile(outputPath)
        const dxfContent = new TextDecoder().decode(dxfBytes)
        return { dxfContent, version: "librecad" }
      }
    } catch { /* LibreCAD not available */ }

    throw new Error(
      "Aucun convertisseur DWG disponible sur le serveur. " +
      "Installez ODA File Converter (ODA_CONVERTER_PATH) ou libredwg (dwg2dxf). " +
      "En attendant, exportez le fichier en .dxf depuis AutoCAD."
    )
  } finally {
    try {
      await Deno.remove(tmpDir, { recursive: true })
    } catch { /* ignore */ }
  }
}

// ═══ AUTODESK APS: RVT → IFC CONVERSION ═══

interface ApsToken {
  access_token: string
  expires_in: number
}

async function getApsToken(): Promise<string> {
  const clientId = Deno.env.get("APS_CLIENT_ID")
  const clientSecret = Deno.env.get("APS_CLIENT_SECRET")

  if (!clientId || !clientSecret) {
    throw new Error(
      "Autodesk APS non configure. Definissez APS_CLIENT_ID et APS_CLIENT_SECRET " +
      "pour activer la conversion RVT → IFC."
    )
  }

  const res = await fetch("https://developer.api.autodesk.com/authentication/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "data:read data:write data:create bucket:read bucket:create",
    }),
  })

  if (!res.ok) {
    throw new Error(`APS authentication failed: ${res.status} ${await res.text()}`)
  }

  const data: ApsToken = await res.json()
  return data.access_token
}

async function convertRvtToIfc(
  fileBytes: Uint8Array,
  fileName: string,
): Promise<{ ifcUrl: string; urn: string }> {
  const token = await getApsToken()

  // 1. Create/get bucket
  const bucketKey = "atlas-mall-cad-conversion"
  try {
    await fetch("https://developer.api.autodesk.com/oss/v2/buckets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucketKey,
        policyKey: "transient", // auto-delete after 24h
      }),
    })
  } catch { /* bucket may already exist */ }

  // 2. Upload RVT file
  const objectKey = `${Date.now()}-${fileName}`
  const uploadRes = await fetch(
    `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
      },
      body: fileBytes,
    },
  )

  if (!uploadRes.ok) {
    throw new Error(`APS upload failed: ${uploadRes.status}`)
  }

  const uploadData = await uploadRes.json()
  const objectId = uploadData.objectId as string

  // 3. Create translation job: RVT → IFC
  const urn = btoa(objectId).replace(/=/g, "")

  const jobRes = await fetch(
    "https://developer.api.autodesk.com/modelderivative/v2/designdata/job",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: { urn },
        output: {
          formats: [{ type: "ifc" }],
          destination: { region: "us" },
        },
      }),
    },
  )

  if (!jobRes.ok) {
    throw new Error(`APS translation job failed: ${jobRes.status}`)
  }

  // 4. Poll for completion
  const maxWait = 300_000 // 5 minutes
  const pollInterval = 5_000
  const startTime = Date.now()

  while (Date.now() - startTime < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval))

    const statusRes = await fetch(
      `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/manifest`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    if (!statusRes.ok) continue

    const manifest = await statusRes.json()

    if (manifest.status === "success") {
      // Find IFC derivative
      const ifcDerivative = findDerivative(manifest.derivatives, "ifc")
      if (ifcDerivative) {
        // Download IFC
        const dlRes = await fetch(
          `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/manifest/${encodeURIComponent(ifcDerivative.urn)}/signedcookies`,
          { headers: { Authorization: `Bearer ${token}` } },
        )

        if (dlRes.ok) {
          const dlData = await dlRes.json()
          return { ifcUrl: dlData.url ?? ifcDerivative.urn, urn }
        }
      }
      break
    }

    if (manifest.status === "failed") {
      const msg = manifest.derivatives?.[0]?.messages?.[0]?.message ?? "Unknown error"
      throw new Error(`APS translation failed: ${msg}`)
    }

    // Still processing, continue polling
  }

  throw new Error("APS translation timed out after 5 minutes")
}

function findDerivative(derivatives: any[], outputType: string): any {
  if (!Array.isArray(derivatives)) return null
  for (const d of derivatives) {
    if (d.outputType === outputType) {
      if (d.children) {
        for (const child of d.children) {
          if (child.role === "ifc" || child.type === "resource") {
            return child
          }
        }
      }
      return d
    }
  }
  return null
}

// ═══ REQUEST HANDLER ═══

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS })
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "POST required" }),
      { status: 405, headers: { ...CORS, "Content-Type": "application/json" } },
    )
  }

  try {
    const contentType = req.headers.get("content-type") ?? ""

    if (contentType.includes("multipart/form-data")) {
      // File upload via FormData
      const formData = await req.formData()
      const file = formData.get("file") as File | null
      const format = formData.get("format") as string | null

      if (!file) {
        return new Response(
          JSON.stringify({ error: "Fichier manquant (champ 'file')" }),
          { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
        )
      }

      const fileBytes = new Uint8Array(await file.arrayBuffer())

      if (format === "dwg" || file.name.toLowerCase().endsWith(".dwg")) {
        // DWG → DXF
        const result = await convertDwgToDxf(fileBytes, file.name)
        return new Response(
          JSON.stringify({
            success: true,
            format: "dxf",
            sourceFormat: "dwg",
            version: result.version,
            dxfContent: result.dxfContent,
            fileName: file.name.replace(/\.dwg$/i, ".dxf"),
          }),
          { headers: { ...CORS, "Content-Type": "application/json" } },
        )
      }

      if (format === "rvt" || file.name.toLowerCase().endsWith(".rvt")) {
        // RVT → IFC
        const result = await convertRvtToIfc(fileBytes, file.name)
        return new Response(
          JSON.stringify({
            success: true,
            format: "ifc",
            sourceFormat: "rvt",
            ifcUrl: result.ifcUrl,
            urn: result.urn,
            fileName: file.name.replace(/\.rvt$/i, ".ifc"),
          }),
          { headers: { ...CORS, "Content-Type": "application/json" } },
        )
      }

      return new Response(
        JSON.stringify({ error: `Format non supporte: ${file.name}. Formats acceptes: .dwg, .rvt` }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      )
    }

    // JSON body (for status checks)
    const body = await req.json()

    if (body.action === "status") {
      // Check which converters are available
      const odaAvailable = !!Deno.env.get("ODA_CONVERTER_PATH")
      const apsAvailable = !!(Deno.env.get("APS_CLIENT_ID") && Deno.env.get("APS_CLIENT_SECRET"))

      let libredwgAvailable = false
      try {
        const cmd = new Deno.Command("dwg2dxf", { args: ["--version"], stdout: "piped", stderr: "piped" })
        const { code } = await cmd.output()
        libredwgAvailable = code === 0
      } catch { /* not available */ }

      return new Response(
        JSON.stringify({
          converters: {
            dwg_to_dxf: {
              available: odaAvailable || libredwgAvailable,
              method: odaAvailable ? "ODA File Converter" : libredwgAvailable ? "libredwg" : "none",
            },
            rvt_to_ifc: {
              available: apsAvailable,
              method: apsAvailable ? "Autodesk Platform Services" : "none",
            },
          },
        }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      )
    }

    return new Response(
      JSON.stringify({ error: "Action inconnue" }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur interne du serveur de conversion"
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    )
  }
})
