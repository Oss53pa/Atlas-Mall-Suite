// supabase/functions/proph3t-claude/index.ts
// Deno Edge Function — Proph3t Expert Vivant via Claude API
// Now reads/writes memory from Supabase proph3t_memory table

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-key, content-type, apikey",
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  const {
    question,
    volume,
    proph3tAnswer,
    projectData,
    memoryNarrative,
    floorContext,
    mode,
    projectId,
    sessionId,
  } = await req.json()

  const clientKey = req.headers.get("x-client-key")
  if (!clientKey?.startsWith("sk-ant-")) {
    return new Response(JSON.stringify({ error: "Cle Claude invalide" }), { status: 401, headers: CORS })
  }

  // ── Load memory context from Supabase ──────────────────────

  let memoryContext = memoryNarrative ?? ""

  if (projectId) {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

      if (supabaseUrl && supabaseKey) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/proph3t_memory?projet_id=eq.${projectId}&order=created_at.desc&limit=20`,
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
      // Continue with provided memoryNarrative as fallback
    }
  }

  // ── System prompts ─────────────────────────────────────────

  const systemPrompts: Record<string, string> = {
    vol2: `Tu es Proph3t, l'Expert Vivant en securite des centres commerciaux africains.
Tu connais ce projet en profondeur. Voici ton historique de ce projet :
${memoryContext}

Etage actuel analyse : ${floorContext?.level} (${floorContext?.widthM}m x ${floorContext?.heightM}m)
Donnees completes du projet : ${JSON.stringify(projectData)}

Normes maitrisees : APSAD R82, NF S 61-938, EN 62676, ISO 22341, EN 50132, reglementations CI/UEMOA.
Fabricants maitrises : Wisenet (Hanwha), Hikvision, Dahua, Axis, DORMA, ABLOY, SUPREMA, CAME, ASSA ABLOY.
Contexte : Cosmos Angre Shopping Center, Abidjan — ouverture octobre 2026.

Proph3t IA locale a deja repondu : "${proph3tAnswer}"

Complete, affine et enrichis cette reponse. Cite les normes applicables avec leur numero exact.
Donne des references fabricants reelles avec modeles et prix indicatifs en FCFA.
Si tu identifies un risque non mentionne par Proph3t local, signale-le.
Sois concis (max 4 paragraphes). Reponds en francais.`,

    vol3: `Tu es Proph3t, l'Expert Vivant en experience client retail africain.
Tu connais ce projet en profondeur. Voici ton historique :
${memoryContext}

Etage actuel : ${floorContext?.level}
Donnees projet : ${JSON.stringify(projectData)}

Normes maitrisees : NF X 08-003, ISO 7010, ISO 23601, EN 301 549, NF C 71-800, regles accessibilite PMR.
Benchmark : 50+ malls africains (Abidjan, Dakar, Lagos, Nairobi, Casablanca).
Contexte : Cosmos Angre, Abidjan — soft opening octobre 2026, inauguration novembre 2026.
Programme Cosmos Club integre.

Proph3t local a repondu : "${proph3tAnswer}"

Complete avec des benchmarks concrets de malls africains.
Pour la signaletique : cite les normes ISO 7010 / NF X 08-003 avec les formules de calcul.
Propose des recommandations actionnables, chiffrees en FCFA quand possible.
Max 4 paragraphes, en francais.`,

    simulation: `Tu es Proph3t, analyste de simulations securitaires.
Resultats de simulation a interpreter : ${JSON.stringify(projectData)}
Contexte projet : ${memoryContext}
Interprete les resultats, identifie les zones de risque, propose des actions correctives prioritaires.
Cite les normes (NF S 61-938, APSAD R82). Max 3 paragraphes, en francais.`,
  }

  const systemPrompt = systemPrompts[mode ?? volume] ?? systemPrompts.vol2

  // ── Call Claude API ────────────────────────────────────────

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": clientKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 900,
      messages: [{ role: "user", content: systemPrompt + "\n\nQuestion : " + question }]
    })
  })

  const data = await claudeRes.json()
  const answer = data.content?.[0]?.text || "Erreur Claude API."

  // ── Save exchange to memory ────────────────────────────────

  if (projectId && sessionId) {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

      if (supabaseUrl && supabaseKey) {
        // Save the question
        await fetch(`${supabaseUrl}/rest/v1/proph3t_memory`, {
          method: "POST",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            projet_id: projectId,
            session_id: sessionId,
            event_type: "analysis",
            entity_type: "zone",
            entity_id: "chat",
            description: `[Q] ${question.slice(0, 200)}`,
          }),
        })

        // Save the answer
        await fetch(`${supabaseUrl}/rest/v1/proph3t_memory`, {
          method: "POST",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            projet_id: projectId,
            session_id: sessionId,
            event_type: "analysis",
            entity_type: "zone",
            entity_id: "chat",
            description: `[A] ${answer.slice(0, 200)}`,
            impact_metric: `claude-enrichment ${mode ?? volume}`,
          }),
        })
      }
    } catch (err) {
      console.warn("Failed to save memory:", err)
    }
  }

  return new Response(
    JSON.stringify({ answer }),
    { headers: { ...CORS, "Content-Type": "application/json" } }
  )
})
