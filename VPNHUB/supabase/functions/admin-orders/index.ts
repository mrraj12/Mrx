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

interface OrderFilters {
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Hash token for lookup in admin_sessions
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate admin token using admin_sessions table
async function validateToken(token: string): Promise<{ valid: boolean; adminId?: string; adminRole?: string }> {
  try {
    const tokenHash = await hashToken(token);

    const { data: session } = await supabase
      .from('admin_sessions')
      .select('id, admin_id, expires_at, is_active')
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .maybeSingle();

    if (!session) return { valid: false };

    if (new Date(session.expires_at) < new Date()) {
      await supabase.from('admin_sessions').update({ is_active: false }).eq('id', session.id);
      return { valid: false };
    }

    const { data: admin } = await supabase
      .from('admin_users')
      .select('id, role, is_active')
      .eq('id', session.admin_id)
      .maybeSingle();

    if (!admin || !admin.is_active) {
      return { valid: false };
    }

    // Update last activity
    await supabase.from('admin_sessions').update({ last_activity_at: new Date().toISOString() }).eq('id', session.id);

    return { valid: true, adminId: admin.id, adminRole: admin.role };
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
    const { action, token, orderId, filters, page = 1, pageSize = 20, adminNotes } = body;

    const validation = await validateToken(token);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LIST ORDERS
    if (action === 'list') {
      let query = supabase
        .from('orders')
        .select(`
          *,
          package:packages(*)
        `, { count: 'exact' });

      // Apply filters
      if (filters?.status) {
        query = query.eq('order_status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`email.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Pagination
      const offset = (page - 1) * pageSize;
      query = query.range(offset, offset + pageSize - 1).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch orders' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result: PaginatedResult<any> = {
        data: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };

      return new Response(
        JSON.stringify({ success: true, result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET SINGLE ORDER
    if (action === 'get') {
      if (!orderId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Order ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          package:packages(*),
          vpn_client:vpn_clients(*)
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (error || !order) {
        return new Response(
          JSON.stringify({ success: false, error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, order }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // APPROVE ORDER
    if (action === 'approve') {
      if (!orderId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Order ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          package:packages(*)
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ success: false, error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (order.order_status === 'approved' || order.order_status === 'completed') {
        return new Response(
          JSON.stringify({ success: false, error: 'Order already approved' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get an available VPN node
      const { data: nodes } = await supabase
        .from('vpn_nodes')
        .select('id, panel_id, country, city, node_name, inbound_id, panel:vpn_panels(*)')
        .eq('is_active', true)
        .limit(1);

      if (!nodes || nodes.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'No VPN nodes available' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const node = nodes[0];
      const pkg = order.package as any;

      // Generate VPN client UUID
      const clientUuid = crypto.randomUUID();
      const expireDate = new Date(Date.now() + (pkg?.duration_days || 30) * 24 * 60 * 60 * 1000);

      // Call VPN provision service
      let subscriptionUrl = '';
      let inboundId = node.inbound_id;

      try {
        const provisionResponse = await fetch(`${supabaseUrl}/functions/v1/vpn-provision`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            panelId: node.panel_id,
            inboundId: node.inbound_id,
            clientUuid,
            email: order.email,
            totalGb: pkg?.total_gb || 100,
            expireDays: pkg?.duration_days || 30,
            deviceLimit: pkg?.device_limit || 1
          })
        });

        const provisionData = await provisionResponse.json();
        if (provisionData.success) {
          subscriptionUrl = provisionData.subscriptionUrl;
          inboundId = provisionData.inboundId;
        }
      } catch (err) {
        console.error('VPN provision failed:', err);
        // Continue without VPN creation - can be retried
      }

      // Create VPN client record
      const { data: vpnClient, error: vpnError } = await supabase
        .from('vpn_clients')
        .insert({
          user_id: order.user_id,
          order_id: orderId,
          package_id: order.package_id,
          node_id: node.id,
          client_uuid: clientUuid,
          email: order.email,
          subscription_url: subscriptionUrl,
          total_gb: pkg?.total_gb || 100,
          used_gb: 0,
          remaining_gb: pkg?.total_gb || 100,
          device_limit: pkg?.device_limit || 1,
          expire_date: expireDate.toISOString(),
          status: 'active',
          inbound_id: inboundId
        })
        .select()
        .single();

      if (vpnError) {
        console.error('Failed to create VPN client:', vpnError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create VPN subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update order status
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          order_status: 'approved',
          vpn_client_id: vpnClient.id,
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: validation.adminId
        })
        .eq('id', orderId)
        .select()
        .single();

      // Calculate commission if user has a reseller
      if (order.user_id) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('referred_by_reseller_id')
          .eq('user_id', order.user_id)
          .maybeSingle();

        if (userProfile?.referred_by_reseller_id) {
          const { data: reseller } = await supabase
            .from('resellers')
            .select('id, commission_rate')
            .eq('id', userProfile.referred_by_reseller_id)
            .maybeSingle();

          if (reseller) {
            const price = parseFloat(order.plan_price?.replace(/[^\d.]/g, '') || '0') || (pkg?.price || 0);
            const commissionRate = reseller.commission_rate || 10;
            const commissionAmount = Math.round((price * commissionRate / 100) * 100) / 100;

            // Insert commission record
            await supabase.from('reseller_commissions').insert({
              reseller_id: reseller.id,
              user_id: order.user_id,
              order_id: orderId,
              package_id: order.package_id,
              package_name: pkg?.name || order.plan_title,
              package_price: price,
              commission_rate: commissionRate,
              commission_amount: commissionAmount,
              currency: 'CNY',
              status: 'approved'
            });

            // Update order with commission
            await supabase
              .from('orders')
              .update({
                reseller_id: reseller.id,
                commission_rate: commissionRate,
                commission_amount: commissionAmount,
                commission_status: 'calculated'
              })
              .eq('id', orderId);

            // Trigger stats recalculation
            try {
              await fetch(`${supabaseUrl}/functions/v1/calculate-reseller-stats`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`
                },
                body: JSON.stringify({ resellerId: reseller.id })
              });
            } catch (e) {
              console.error('Stats recalculation failed:', e);
            }
          }
        }
      }

      // Log action
      await logAction(validation.adminId!, 'order_approved', 'order', orderId, {
        package_name: pkg?.name,
        vpn_client_id: vpnClient.id
      });

      return new Response(
        JSON.stringify({ success: true, order: updatedOrder, vpnClient }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // REJECT ORDER
    if (action === 'reject') {
      if (!orderId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Order ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!adminNotes) {
        return new Response(
          JSON.stringify({ success: false, error: 'Admin notes required for rejection' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: updatedOrder, error } = await supabase
        .from('orders')
        .update({
          order_status: 'rejected',
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: validation.adminId
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to reject order' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'order_rejected', 'order', orderId, { reason: adminNotes });

      return new Response(
        JSON.stringify({ success: true, order: updatedOrder }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin orders error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
