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

interface DashboardStats {
  total_users: number;
  total_orders: number;
  pending_orders: number;
  approved_orders: number;
  rejected_orders: number;
  active_vpn_clients: number;
  expired_vpn_clients: number;
  suspended_vpn_clients: number;
  total_revenue: number;
  total_traffic_used_gb: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Validate admin token
async function validateToken(token: string): Promise<{ valid: boolean; adminId?: string }> {
  try {
    const { data: sessionLog, error } = await supabase
      .from('admin_logs')
      .select('admin_id, details')
      .eq('action', 'login')
      .eq('details->token', token)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !sessionLog) {
      return { valid: false };
    }

    const sessionDetails = sessionLog.details as any;
    const expiresAt = new Date(sessionDetails.expires_at);

    if (expiresAt < new Date()) {
      return { valid: false };
    }

    // Check if admin is still active
    const { data: admin } = await supabase
      .from('admin_users')
      .select('is_active')
      .eq('id', sessionLog.admin_id)
      .maybeSingle();

    if (!admin || !admin.is_active) {
      return { valid: false };
    }

    return { valid: true, adminId: sessionLog.admin_id };
  } catch {
    return { valid: false };
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
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
    const { token } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate token
    const validation = await validateToken(token);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get total users
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    // Get order statistics
    const { data: orderStats } = await supabase
      .from('orders')
      .select('order_status');

    const orderCounts = (orderStats || []).reduce((acc: Record<string, number>, order) => {
      const status = order.order_status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Get VPN client statistics
    const { data: clientStats } = await supabase
      .from('vpn_clients')
      .select('status, used_gb');

    const clientCounts = (clientStats || []).reduce((acc: Record<string, number>, client) => {
      const status = client.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const totalTrafficUsed = (clientStats || []).reduce((sum: number, client) => {
      return sum + (parseFloat(client.used_gb as any) || 0);
    }, 0);

    // Calculate revenue (approved orders with package prices)
    const { data: approvedOrders } = await supabase
      .from('orders')
      .select('plan_price, package:packages(price)')
      .in('order_status', ['approved', 'completed']);

    let totalRevenue = 0;
    (approvedOrders || []).forEach(order => {
      const price = (order as any).package?.price || parseFloat(order.plan_price?.replace(/[^\d.]/g, '') || '0');
      totalRevenue += price;
    });

    const stats: DashboardStats = {
      total_users: totalUsers || 0,
      total_orders: (orderStats || []).length,
      pending_orders: orderCounts['pending'] || 0,
      approved_orders: (orderCounts['approved'] || 0) + (orderCounts['completed'] || 0),
      rejected_orders: orderCounts['rejected'] || 0,
      active_vpn_clients: clientCounts['active'] || 0,
      expired_vpn_clients: clientCounts['expired'] || 0,
      suspended_vpn_clients: clientCounts['suspended'] || 0,
      total_revenue: totalRevenue,
      total_traffic_used_gb: Math.round(totalTrafficUsed * 10) / 10
    };

    return new Response(
      JSON.stringify({ success: true, stats }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
