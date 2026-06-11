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
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Validate admin token
async function validateToken(token: string): Promise<{ valid: boolean; adminId?: string }> {
  try {
    const { data: sessionLog } = await supabase
      .from('admin_logs')
      .select('admin_id, details')
      .eq('action', 'login')
      .eq('details->token', token)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sessionLog) return { valid: false };

    const sessionDetails = sessionLog.details as any;
    if (new Date(sessionDetails.expires_at) < new Date()) {
      return { valid: false };
    }

    const { data: admin } = await supabase
      .from('admin_users')
      .select('id, is_active')
      .eq('id', sessionLog.admin_id)
      .maybeSingle();

    if (!admin || !admin.is_active) {
      return { valid: false };
    }

    return { valid: true, adminId: admin.id };
  } catch {
    return { valid: false };
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
    const { token, action, target_type, target_id, details } = body;

    // Validate token
    const validation = await validateToken(token);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action
    const { data: logEntry, error } = await supabase
      .from('admin_logs')
      .insert({
        admin_id: validation.adminId,
        action,
        target_type,
        target_id,
        details,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent')
      })
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to log action' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, log: logEntry }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin action error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
