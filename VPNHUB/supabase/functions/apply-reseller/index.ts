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

// Send Telegram notification about new reseller request
async function sendTelegramNotification(userId: string, message?: string) {
  try {
    const { data: settings } = await supabase
      .from('telegram_settings')
      .select('*')
      .maybeSingle();

    if (!settings || !settings.is_enabled || !settings.bot_token || !settings.chat_id) {
      return;
    }

    const { data: user } = await supabase.auth.admin.getUserById(userId);
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, phone')
      .eq('user_id', userId)
      .maybeSingle();

    const text = `🔔 <b>New Reseller Request</b>

👤 User: ${profile?.full_name || user?.user?.email || 'Unknown'}
📧 Email: ${user?.user?.email || 'N/A'}
🆔 User ID: ${userId}
📝 Message: ${message || 'No message'}
⏰ Requested At: ${new Date().toLocaleString()}

Reply with /approve_reseller ${userId} to approve
Reply with /reject_reseller ${userId} to reject`;

    await fetch(`https://api.telegram.org/bot${settings.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.chat_id,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Approve Reseller', callback_data: `approve_reseller:${userId}` },
            { text: '❌ Reject Reseller', callback_data: `reject_reseller:${userId}` }
          ]]
        }
      })
    });
  } catch (err) {
    console.error('Telegram notification failed:', err);
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
    const { userId, message } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing pending request
    const { data: existing } = await supabase
      .from('reseller_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ success: false, error: 'You already have a pending reseller request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already a reseller
    const { data: existingReseller } = await supabase
      .from('resellers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingReseller) {
      return new Response(
        JSON.stringify({ success: false, error: 'You are already a reseller' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create reseller request
    const { data: request, error } = await supabase
      .from('reseller_requests')
      .insert({
        user_id: userId,
        status: 'pending',
        requested_message: message || null
      })
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user profile status
    await supabase
      .from('user_profiles')
      .update({ reseller_status: 'pending' })
      .eq('user_id', userId);

    // Send Telegram notification
    await sendTelegramNotification(userId, message);

    // Check auto-approve setting
    const { data: appSettings } = await supabase
      .from('app_settings')
      .select('auto_approve_resellers, default_commission_rate')
      .maybeSingle();

    if (appSettings?.auto_approve_resellers) {
      // Auto approve
      await fetch(`${supabaseUrl}/functions/v1/approve-reseller`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          resellerRequestId: request.id,
          commissionRate: appSettings.default_commission_rate,
          autoApproved: true
        })
      });
    }

    return new Response(
      JSON.stringify({ success: true, request }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Apply reseller error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
