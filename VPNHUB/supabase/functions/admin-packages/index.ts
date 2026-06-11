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

interface PackageFormData {
  name: string;
  description?: string;
  total_gb: number;
  duration_days: number;
  device_limit: number;
  price: number;
  is_active: boolean;
}

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
    const { action, token, packageId, packageData } = body;

    const validation = await validateToken(token);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREATE PACKAGE
    if (action === 'create') {
      if (!packageData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Package data required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data: PackageFormData = packageData;

      // Validate required fields
      if (!data.name || !data.total_gb || !data.duration_days || !data.price) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get max display order
      const { data: maxOrder } = await supabase
        .from('packages')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const displayOrder = (maxOrder?.display_order || 0) + 1;

      const { data: pkg, error } = await supabase
        .from('packages')
        .insert({
          name: data.name,
          description: data.description,
          total_gb: data.total_gb,
          duration_days: data.duration_days,
          device_limit: data.device_limit || 1,
          price: data.price,
          is_active: data.is_active ?? true,
          display_order: displayOrder
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create package:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create package' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'package_created', 'package', pkg.id, { name: data.name });

      return new Response(
        JSON.stringify({ success: true, pkg }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE PACKAGE
    if (action === 'update') {
      if (!packageId || !packageData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Package ID and data required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: pkg, error } = await supabase
        .from('packages')
        .update({
          ...packageData,
          updated_at: new Date().toISOString()
        })
        .eq('id', packageId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update package:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update package' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'package_updated', 'package', packageId, { changes: packageData });

      return new Response(
        JSON.stringify({ success: true, pkg }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE PACKAGE (soft delete)
    if (action === 'delete') {
      if (!packageId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Package ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if package is in use
      const { data: orders, error: checkError } = await supabase
        .from('orders')
        .select('id')
        .eq('package_id', packageId)
        .limit(1);

      if (orders && orders.length > 0) {
        // Package is in use, just deactivate
        const { error } = await supabase
          .from('packages')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', packageId);

        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to deactivate package' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await logAction(validation.adminId!, 'package_deactivated', 'package', packageId);

        return new Response(
          JSON.stringify({ success: true, message: 'Package deactivated (in use)' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Not in use, can delete
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', packageId);

      if (error) {
        console.error('Failed to delete package:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to delete package' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'package_deleted', 'package', packageId);

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
    console.error('Admin packages error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
