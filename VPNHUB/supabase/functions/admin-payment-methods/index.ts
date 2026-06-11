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
async function validateToken(token: string): Promise<{ valid: boolean; adminId?: string; permissions?: any }> {
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
      .select('id, is_active, permissions')
      .eq('id', sessionLog.admin_id)
      .maybeSingle();

    if (!admin || !admin.is_active) {
      return { valid: false };
    }

    return { valid: true, adminId: admin.id, permissions: admin.permissions };
  } catch {
    return { valid: false };
  }
}

// Log admin action
async function logAction(adminId: string, action: string, targetType: string, targetId: string, details?: Record<string, any>): Promise<void> {
  await supabase.from('admin_logs').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details
  });
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
    const { action, token, methodId, methodData } = body;

    const validation = await validateToken(token);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const permissions = validation.permissions as any;

    // LIST PAYMENT METHODS
    if (action === 'list') {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch payment methods' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, methods: data || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permissions for modifications
    if (!permissions?.payment_methods_manage) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREATE PAYMENT METHOD
    if (action === 'create') {
      if (!methodData || !methodData.name) {
        return new Response(
          JSON.stringify({ success: false, error: 'Method name required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('payment_methods')
        .insert({
          name: methodData.name,
          qr_code_url: methodData.qr_code_url || '',
          account_info: methodData.account_info,
          payment_type: methodData.payment_type || 'qr_code',
          is_active: methodData.is_active !== false
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create payment method' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'payment_method_created', 'payment_method', data.id, {
        name: methodData.name
      });

      return new Response(
        JSON.stringify({ success: true, method: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE PAYMENT METHOD
    if (action === 'update') {
      if (!methodId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Method ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updateData: any = {};
      if (methodData.name !== undefined) updateData.name = methodData.name;
      if (methodData.qr_code_url !== undefined) updateData.qr_code_url = methodData.qr_code_url;
      if (methodData.account_info !== undefined) updateData.account_info = methodData.account_info;
      if (methodData.payment_type !== undefined) updateData.payment_type = methodData.payment_type;
      if (methodData.is_active !== undefined) updateData.is_active = methodData.is_active;

      const { data, error } = await supabase
        .from('payment_methods')
        .update(updateData)
        .eq('id', methodId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update payment method' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'payment_method_updated', 'payment_method', methodId, updateData);

      return new Response(
        JSON.stringify({ success: true, method: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE PAYMENT METHOD
    if (action === 'delete') {
      if (!methodId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Method ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', methodId);

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to delete payment method' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'payment_method_deleted', 'payment_method', methodId);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TOGGLE ACTIVE STATUS
    if (action === 'toggle') {
      if (!methodId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Method ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: current } = await supabase
        .from('payment_methods')
        .select('is_active')
        .eq('id', methodId)
        .maybeSingle();

      if (!current) {
        return new Response(
          JSON.stringify({ success: false, error: 'Payment method not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('payment_methods')
        .update({ is_active: !current.is_active })
        .eq('id', methodId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to toggle payment method' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'payment_method_updated', 'payment_method', methodId, {
        is_active: !current.is_active
      });

      return new Response(
        JSON.stringify({ success: true, method: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // REORDER PAYMENT METHODS
    if (action === 'reorder') {
      const { orders } = body; // Array of { id, display_order }

      if (!orders || !Array.isArray(orders)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid order data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      for (const item of orders) {
        await supabase
          .from('payment_methods')
          .update({ display_order: item.display_order })
          .eq('id', item.id);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin payment methods error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
