import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-key, content-type",
}

const VISION_SYSTEM_PROMPT = `Tu es Proph3t Vision, un expert en lecture de plans architecturaux de centres commerciaux africains.

Tu analyses une image de plan architectural et tu extrais TOUTES les informations suivantes en JSON strict.

REGLES D'EXTRACTION :
1. Identifier tous les espaces visibles (pieces, zones, locaux) avec leur nom et type
2. Identifier les murs (lignes epaisses ou doubles lignes)
3. Identifier les portes (arcs de cercle ou symboles de porte)
4. Identifier toutes les cotes visibles (chiffres avec unites)
5. Identifier l'echelle du plan si visible ("1:100", "ECHELLE 1/200", etc.)
6. Identifier le niveau d'etage si mentionne (RDC, R+1, B1, etc.)

TYPES D'ESPACES possibles (utiliser exactement ces valeurs) :
parking | commerce | restauration | circulation | technique | backoffice | financier | sortie_secours | loisirs | services | hotel | bureaux | exterieur

COORDONNEES : toutes normalisees entre 0 et 1 (0,0 = coin superieur gauche de l'image)

FORMAT DE REPONSE — JSON strict, sans markdown, sans commentaires :
{
  "zones": [
    {
      "id": "z1",
      "label": "Nom de l'espace tel qu'ecrit sur le plan",
      "estimatedType": "commerce",
      "boundingBox": { "x": 0.1, "y": 0.2, "w": 0.3, "h": 0.25 },
      "confidence": 0.85,
      "color": null
    }
  ],
  "walls": [
    { "id": "w1", "x1": 0.1, "y1": 0.2, "x2": 0.4, "y2": 0.2, "confidence": 0.9 }
  ],
  "doors": [
    { "id": "d1", "x": 0.25, "y": 0.35, "widthEstimated": 0.02, "openingAngle": 90, "confidence": 0.8 }
  ],
  "dimensions": [
    { "id": "dim1", "valueText": "14.50 m", "value": 14.5, "unit": "m", "x": 0.3, "y": 0.15, "confidence": 0.95 }
  ],
  "scale": { "ratio": "1:100", "value": 100, "confidence": 0.9 },
  "floorLevel": "RDC",
  "confidence": 0.82,
  "proph3tNotes": [
    "Plan bien structure avec calques distincts",
    "3 acces parking identifies",
    "Cotes en millimetres"
  ]
}

Si une information n'est pas visible, retourner un tableau vide ou null pour ce champ.
Retourne UNIQUEMENT le JSON, sans texte avant ou apres.`

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization manquante" }),
        { status: 401, headers: CORS }
      )
    }

    const { imageBase64, mediaType, fileName } = await req.json()

    if (!imageBase64 || !mediaType) {
      return new Response(
        JSON.stringify({ error: "Image manquante" }),
        { status: 400, headers: CORS }
      )
    }

    // Verification taille (Claude Vision : max 5MB par image)
    const imageSizeBytes = (imageBase64.length * 3) / 4
    if (imageSizeBytes > 5_000_000) {
      return new Response(
        JSON.stringify({ error: "Image trop grande — max 5MB. Compresser avant import." }),
        { status: 413, headers: CORS }
      )
    }

    const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY")
    if (!claudeApiKey) {
      return new Response(
        JSON.stringify({ error: "Cle API Anthropic non configuree sur le serveur" }),
        { status: 500, headers: CORS }
      )
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: imageBase64 },
              },
              {
                type: "text",
                text: VISION_SYSTEM_PROMPT + `\n\nFichier analyse : ${fileName ?? 'plan.jpg'}\nAnalyse ce plan architectural et retourne le JSON demande.`,
              },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      const errData = await res.json()
      return new Response(
        JSON.stringify({ error: `Erreur Claude API: ${errData.error?.message ?? res.status}` }),
        { status: res.status, headers: CORS }
      )
    }

    const data = await res.json()
    const result = data.content?.[0]?.text ?? '{}'

    return new Response(
      JSON.stringify({ result, fileName }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erreur interne" }),
      { status: 500, headers: CORS }
    )
  }
})
