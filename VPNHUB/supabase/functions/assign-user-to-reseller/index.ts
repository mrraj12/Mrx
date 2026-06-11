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
    const { resellerCode, resellerId, userId, assignedBy, assignedType = 'referral_link' } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find reseller by code or id
    let reseller;
    if (resellerCode) {
      const { data } = await supabase
        .from('resellers')
        .select('*')
        .eq('reseller_code', resellerCode)
        .eq('status', 'active')
        .maybeSingle();
      reseller = data;
    } else if (resellerId) {
      const { data } = await supabase
        .from('resellers')
        .select('*')
        .eq('id', resellerId)
        .eq('status', 'active')
        .maybeSingle();
      reseller = data;
    }

    if (!reseller) {
      return new Response(
        JSON.stringify({ success: false, error: 'Reseller not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already assigned to another reseller
    const { data: existing } = await supabase
      .from('reseller_users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ success: false, error: 'User already assigned to a reseller' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create reseller user link
    const { data: link, error } = await supabase
      .from('reseller_users')
      .insert({
        reseller_id: reseller.id,
        user_id: userId,
        referral_code: resellerCode || reseller.reseller_code,
        assigned_by: assignedBy || null,
        assigned_type: assignedType
      })
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to assign user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user profile
    await supabase
      .from('user_profiles')
      .update({
        referred_by_reseller_id: reseller.id,
        reseller_code_used: resellerCode || reseller.reseller_code
      })
      .eq('user_id', userId);

    // Update reseller stats
    await supabase.rpc('increment_reseller_user_count', { reseller_id: reseller.id });

    return new Response(
      JSON.stringify({ success: true, link }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Assign user error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
