// supabase/functions/proph3t-claude/index.ts
// Deno Edge Function — Proph3t Expert Vivant via Claude API v3
// 6 modes : vol2, vol3, simulation, dce, benchmark, contradiction, rapport

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:5173,http://localhost:3000").split(",")

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? ""
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-key, content-type, apikey",
    "Vary": "Origin",
  }
}

interface MemoryRow {
  id: string
  session_id: string
  event_type: string
  entity_type: string
  description: string
  impact_metric?: string
  created_at: string
}

interface EdgeFunctionContext {
  question?: string
  volume?: string
  mode?: string
  proph3tAnswer?: string
  projectData?: unknown
  memoryNarrative?: string
  floorContext?: Record<string, unknown>
  projectId?: string
  sessionId?: string
  benchmarkData?: unknown
  scenarioA?: unknown
  scenarioB?: unknown
  lastApprovedState?: unknown
  changes?: unknown
  reportType?: string
  userPreferences?: Record<string, unknown>
}

// ── System prompts par mode ──────────────────────────────

function buildSystemPrompt(mode: string, ctx: EdgeFunctionContext, memoryContext: string): string {
  const floorCtx = ctx.floorContext ?? {}

  const PROMPTS: Record<string, string> = {

    vol2: `Tu es Proph3t, Expert Vivant en securite des centres commerciaux africains.
Propriete d'Atlas Studio (Pame Atokouna).

Memoire du projet : ${memoryContext}
Etage actuel : ${floorCtx.level} (${floorCtx.widthM}m x ${floorCtx.heightM}m)
Donnees projet : ${JSON.stringify(ctx.projectData)}

Normes maitrisees : APSAD R82, NF S 61-938, EN 62676-4, ISO 22341, EN 1125, Decret CI 2009-264, Loi CI 2014-388.
Preferences utilisateur memorisees : ${JSON.stringify(ctx.userPreferences ?? {})}
Fabricants disponibles en CI : Wisenet (Hanwha), Hikvision, Dahua, DORMA+kaba, ABLOY, SUPREMA, IDEMIA, ASSA ABLOY.

Proph3t local a repondu : "${ctx.proph3tAnswer}"

INSTRUCTIONS :
- Complete, affine et approfondis la reponse locale
- Cite toujours la norme applicable avec son numero exact
- Donne des references fabricants reelles disponibles en CI avec prix indicatifs en FCFA
- Adapte au contexte ivoirien/africain (pas de references franco-francaises inadaptees)
- Si risque non mentionne par Proph3t local → le signaler
- Ton : expert, direct, professionnel, en francais
- Maximum 4 paragraphes`,

    vol3: `Tu es Proph3t, Expert Vivant en experience client retail africain.
Propriete d'Atlas Studio.

Memoire : ${memoryContext}
Etage : ${floorCtx.level}
Donnees : ${JSON.stringify(ctx.projectData)}

Normes : NF X 08-003, ISO 7010, ISO 23601, EN 301 549, NF C 71-800, Decret CI 2012-1088.
Benchmark : 50+ malls africains (Abidjan, Dakar, Lagos, Nairobi, Casablanca).
Contexte : Cosmos Angre, Abidjan — ouverture octobre 2026. Cosmos Club integre.

Proph3t local : "${ctx.proph3tAnswer}"

Complete avec benchmarks concrets, normes ISO/NF exactes, recommandations chiffrees en FCFA.
Max 4 paragraphes, francais direct.`,

    simulation: `Tu es Proph3t, analyste de simulations securitaires.
Propriete d'Atlas Studio.
Resultats : ${JSON.stringify(ctx.projectData)}
Contexte : ${memoryContext}
Interprete, identifie les risques, propose des corrections. Normes NF S 61-938, APSAD R82. Max 3 paragraphes.`,

    dce: `Tu es Proph3t, expert en redaction de DCE pour centres commerciaux africains.
Propriete d'Atlas Studio.

Projet : Cosmos Angre Shopping Center, Abidjan, Cote d'Ivoire
Donnees securite : ${JSON.stringify(ctx.projectData)}

TACHE : Rediger le Cahier des Charges Techniques du systeme de videoprotection.
Format DCE professionnel :
§1. Objet du marche
§2. Description du systeme (references exactes)
§3. Specifications techniques par equipement (tableau : designation / reference / qte / specs)
§4. Normes applicables (APSAD R82, EN 62676, NF S 61-938, EN 1125)
§5. Contraintes d'installation
§6. Maintenance et garantie

Ton : technique, juridiquement correct, francais professionnel de marches publics.
Detail suffisant pour qu'un installateur puisse chiffrer sans demander de precisions.`,

    benchmark: `Tu es Proph3t, analyste de benchmark des centres commerciaux africains.
Propriete d'Atlas Studio.

Donnees projet : ${JSON.stringify(ctx.projectData)}
Base benchmark : ${JSON.stringify(ctx.benchmarkData)}
Proph3t local : "${ctx.proph3tAnswer}"

TACHE : Analyse de positionnement avec recommandations actionnables.
- 3 forces et 3 faiblesses vs pairs
- Chiffrer l'ecart (pas juste "sous la moyenne" mais "de combien")
- Actions concretes avec ROI en FCFA
- Benchmark CI Classe A prioritaire, puis UEMOA, puis Afrique subsaharienne
- Max 3 paragraphes, chiffres precis, francais direct`,

    contradiction: `Tu es Proph3t, auditeur de coherence pour Atlas Mall Suite.
Propriete d'Atlas Studio.

Etat actuel : ${JSON.stringify(ctx.projectData)}
Dernier etat approuve : ${JSON.stringify(ctx.lastApprovedState)}
Modifications detectees : ${JSON.stringify(ctx.changes)}

TACHE : Analyse de contradiction entre etat approuve et etat actuel.
- Chaque modification qui invalide une conformite precedente
- Gravite (bloquant ouverture / necessite re-validation / mineur)
- Chemin de correction le plus rapide
- Max 2 paragraphes, direct`,

    rapport: `Tu es Proph3t, redacteur de rapports techniques professionnels.
Propriete d'Atlas Studio.

Donnees : ${JSON.stringify(ctx.projectData)}
Type : ${ctx.reportType}
Proph3t local : "${ctx.proph3tAnswer}"

TACHE : Rediger la partie narrative du rapport ${ctx.reportType}.
- Synthese executive (3 phrases — pour le DG)
- Analyse detaillee (points forts, ameliorations, chiffres)
- Recommandations priorisees (P0/P1/P2 avec delais)
- Disclaimer legal CI si rapport APSAD
- Ton professionnel, factuel`,
  }

  return PROMPTS[mode] ?? PROMPTS.vol2
}

// ── Main handler ─────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  let parsedBody: EdgeFunctionContext
  try {
    parsedBody = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Corps de requete invalide" }), { status: 400, headers: cors })
  }

  const clientKey = req.headers.get("x-client-key")
  if (!clientKey?.startsWith("sk-ant-")) {
    return new Response(JSON.stringify({ error: "Cle Claude invalide" }), { status: 401, headers: cors })
  }

  // ── Load memory context from Supabase ──────────────────────

  let memoryContext = parsedBody.memoryNarrative ?? ""

  if (parsedBody.projectId) {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

      if (supabaseUrl && supabaseKey) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/proph3t_memory?projet_id=eq.${encodeURIComponent(parsedBody.projectId)}&order=created_at.desc&limit=20`,
          {
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
            },
          }
        )

        if (res.ok) {
          const rows: MemoryRow[] = await res.json()
          if (rows.length > 0) {
            const contextLines = rows.reverse().map(
              (r) => `[${r.event_type}/${r.entity_type}] ${r.description}${r.impact_metric ? ` (${r.impact_metric})` : ""}`
            )
            memoryContext = `Historique projet (${rows.length} evenements recents):\n${contextLines.join("\n")}`
          }
        }
      }
    } catch (err) {
      console.warn("Failed to load memory from Supabase:", err)
    }
  }

  // ── Build system prompt ────────────────────────────────────

  const mode = (parsedBody.mode ?? parsedBody.volume ?? "vol2") as string
  const systemPrompt = buildSystemPrompt(mode, parsedBody, memoryContext)

  // ── Call Claude API with exponential retry on 529 ──────────

  let claudeRes: Response | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": clientKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          messages: [{ role: "user", content: systemPrompt + "\n\nQuestion : " + (parsedBody.question ?? "") }]
        })
      })
    } catch {
      claudeRes = null
    }

    if (claudeRes && claudeRes.status !== 529) break
    // Retry exponentiel sur 529 (overload)
    await new Promise(r => setTimeout(r, (attempt + 1) * 2000))
  }

  if (!claudeRes || !claudeRes.ok) {
    console.warn(`Claude API error: ${claudeRes?.status ?? "network"}`)
    return new Response(
      JSON.stringify({ answer: "Analyse impossible — reessayez dans quelques instants." }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    )
  }

  const data = await claudeRes.json()
  const answer = data.content?.[0]?.text || "Reponse Claude vide. Veuillez reformuler."

  // ── Save exchange to memory ────────────────────────────────

  if (parsedBody.projectId && parsedBody.sessionId) {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

      if (supabaseUrl && supabaseKey) {
        const memHeaders = {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        }

        // Sauvegarder question + reponse
        await Promise.allSettled([
          fetch(`${supabaseUrl}/rest/v1/proph3t_memory`, {
            method: "POST",
            headers: memHeaders,
            body: JSON.stringify({
              projet_id: parsedBody.projectId,
              session_id: parsedBody.sessionId,
              event_type: "analysis",
              entity_type: "zone",
              entity_id: "chat",
              description: `[Q] ${String(parsedBody.question ?? "").slice(0, 200)}`,
            }),
          }),
          fetch(`${supabaseUrl}/rest/v1/proph3t_memory`, {
            method: "POST",
            headers: memHeaders,
            body: JSON.stringify({
              projet_id: parsedBody.projectId,
              session_id: parsedBody.sessionId,
              event_type: "analysis",
              entity_type: "zone",
              entity_id: "chat",
              description: `[A] ${answer.slice(0, 200)}`,
              impact_metric: `claude-enrichment ${mode}`,
            }),
          }),
        ])
      }
    } catch (err) {
      console.warn("Failed to save memory:", err)
    }
  }

  return new Response(
    JSON.stringify({ answer }),
    { headers: { ...cors, "Content-Type": "application/json" } }
  )
})
