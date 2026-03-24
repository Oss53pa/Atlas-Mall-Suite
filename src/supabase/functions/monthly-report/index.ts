// ═══ Edge Function — Rapport Mensuel Automatique ═══
// Déclenchée le 1er de chaque mois à 6h00

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  const period = monthStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  // 1. Fetch incidents for the month
  const { data: incidents } = await supabase
    .from('incidents')
    .select('*')
    .gte('created_at', monthStart.toISOString())
    .lte('created_at', monthEnd.toISOString())

  // 2. Fetch alerts
  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .gte('created_at', monthStart.toISOString())
    .lte('created_at', monthEnd.toISOString())

  // 3. Fetch plan actions progress
  const { data: actions } = await supabase
    .from('plan_actions')
    .select('*')

  // 4. Generate report text
  const totalIncidents = incidents?.length ?? 0
  const criticalAlerts = alerts?.filter((a: any) => a.severity === 'critical').length ?? 0
  const actionsCompleted = actions?.filter((a: any) => a.statut === 'termine').length ?? 0
  const totalActions = actions?.length ?? 13

  const reportText = `
═══ RAPPORT MENSUEL COSMOS ANGRÉ ═══
Période : ${period}

── SÉCURITÉ (Vol. 2) ──
Incidents total : ${totalIncidents}
Alertes critiques : ${criticalAlerts}

── EXPÉRIENCE CLIENT (Vol. 3) ──
Plan d'action : ${actionsCompleted}/${totalActions} actions complétées

── PROPH3T ──
Rapport généré automatiquement le ${now.toLocaleDateString('fr-FR')}
  `.trim()

  // 5. Log the export
  await supabase.from('export_logs').insert({
    type: 'monthly_report',
    content: reportText,
    created_at: now.toISOString(),
  })

  return new Response(JSON.stringify({ success: true, period, report: reportText }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
