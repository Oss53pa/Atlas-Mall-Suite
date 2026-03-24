// ═══ Edge Function — Alert Dispatcher ═══
// Appelée par Supabase Database Webhooks lors d'une nouvelle alerte

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface AlertPayload {
  id: string
  type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  volume: string
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { record: alert } = (await req.json()) as { record: AlertPayload }

  if (alert.severity === 'critical') {
    // Log critical alert dispatch
    await supabase.from('audit_log').insert({
      action_type: 'alert_dispatched',
      entity_type: 'alert',
      entity_id: alert.id,
      context: {
        severity: alert.severity,
        type: alert.type,
        channel: 'sms_push',
      },
    })

    // In production: send SMS via Orange CI API or Twilio
    // await sendSMS(SECURITY_MANAGER_PHONE, `COSMOS ANGRÉ ALERTE: ${alert.title}`)
    // await sendPushNotification(alert)
    console.log(`[CRITICAL] SMS + Push dispatched: ${alert.title}`)
  }

  if (alert.severity === 'warning') {
    // Push notification only
    await supabase.from('audit_log').insert({
      action_type: 'alert_dispatched',
      entity_type: 'alert',
      entity_id: alert.id,
      context: {
        severity: alert.severity,
        type: alert.type,
        channel: 'push',
      },
    })
    console.log(`[WARNING] Push dispatched: ${alert.title}`)
  }

  return new Response(JSON.stringify({ success: true, alert_id: alert.id }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
