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

function generateResellerCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueResellerCode(): Promise<string> {
  let code = generateResellerCode();
  let exists = true;
  while (exists) {
    const { data } = await supabase
      .from('resellers')
      .select('id')
      .eq('reseller_code', code)
      .maybeSingle();
    if (!data) {
      exists = false;
    } else {
      code = generateResellerCode();
    }
  }
  return code;
}

// Log admin action
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
    const { resellerRequestId, commissionRate, adminId, autoApproved, telegramChatId, telegramMessageId } = body;

    if (!resellerRequestId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Reseller request ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the request
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

    // Get default commission rate from settings if not provided
    let rate = commissionRate;
    if (!rate) {
      const { data: settings } = await supabase
        .from('app_settings')
        .select('default_commission_rate')
        .maybeSingle();
      rate = settings?.default_commission_rate || 10.00;
    }

    // Generate unique reseller code
    const code = await generateUniqueResellerCode();

    // Create reseller record
    const { data: reseller, error: resellerError } = await supabase
      .from('resellers')
      .insert({
        user_id: request.user_id,
        reseller_code: code,
        status: 'active',
        commission_rate: rate,
        approved_by: adminId || null,
        approved_at: new Date().toISOString()
      })
      .select()
      .single();

    if (resellerError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create reseller' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update request status
    await supabase
      .from('reseller_requests')
      .update({
        status: 'approved',
        reviewed_by: adminId || null,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', resellerRequestId);

    // Update user profile
    await supabase
      .from('user_profiles')
      .update({
        is_reseller: true,
        reseller_status: 'active'
      })
      .eq('user_id', request.user_id);

    // Log action
    await logAction(adminId || null, 'reseller_approved', reseller.id, {
      request_id: resellerRequestId,
      commission_rate: rate,
      auto_approved: autoApproved || false
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
              text: `✅ <b>Reseller Approved</b>\n\nUser ID: ${request.user_id}\nReseller Code: ${code}\nCommission Rate: ${rate}%\nApproved: ${new Date().toLocaleString()}`,
              parse_mode: 'HTML'
            })
          });
        }
      } catch (err) {
        console.error('Telegram update failed:', err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, reseller }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Approve reseller error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
