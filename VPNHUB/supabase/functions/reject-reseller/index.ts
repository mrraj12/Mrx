import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function logAction(adminId: string | null, action: string, targetId: string, details?: Record<string, any>) {
  try {
    await supabase.from('admin_logs').insert({
      admin_id: adminId,
      action,
      target_type: 'reseller',
      target_id: targetId,
      details
    });
  } catch {
    // Ignore log errors
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { resellerRequestId, reason, adminId, telegramChatId, telegramMessageId } = body;

    if (!resellerRequestId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Reseller request ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: request, error: reqError } = await supabase
      .from('reseller_requests')
      .select('*')
      .eq('id', resellerRequestId)
      .maybeSingle();

    if (reqError || !request) {
      return new Response(
        JSON.stringify({ success: false, error: 'Request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (request.status !== 'pending') {
      return new Response(
        JSON.stringify({ success: false, error: 'Request already processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update request status
    const { data: updated, error } = await supabase
      .from('reseller_requests')
      .update({
        status: 'rejected',
        reviewed_by: adminId || null,
        reviewed_at: new Date().toISOString(),
        reject_reason: reason || null
      })
      .eq('id', resellerRequestId)
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to reject request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user profile
    await supabase
      .from('user_profiles')
      .update({ reseller_status: 'rejected' })
      .eq('user_id', request.user_id);

    await logAction(adminId || null, 'reseller_rejected', resellerRequestId, {
      reason: reason,
      user_id: request.user_id
    });

    // Update Telegram message if applicable
    if (telegramChatId && telegramMessageId) {
      try {
        const { data: tgSettings } = await supabase
          .from('telegram_settings')
          .select('bot_token')
          .maybeSingle();
        if (tgSettings?.bot_token) {
          await fetch(`https://api.telegram.org/bot${tgSettings.bot_token}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              message_id: telegramMessageId,
              text: `❌ <b>Reseller Rejected</b>\n\nUser ID: ${request.user_id}\nReason: ${reason || 'No reason provided'}\nRejected: ${new Date().toLocaleString()}`,
              parse_mode: 'HTML'
            })
          });
        }
      } catch (err) {
        console.error('Telegram update failed:', err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, request: updated }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Reject reseller error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
