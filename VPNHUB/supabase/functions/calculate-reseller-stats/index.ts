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
    const { resellerId } = await req.json();

    let resellers;
    if (resellerId) {
      const { data } = await supabase
        .from('resellers')
        .select('*')
        .eq('id', resellerId)
        .maybeSingle();
      resellers = data ? [data] : [];
    } else {
      const { data } = await supabase
        .from('resellers')
        .select('*');
      resellers = data || [];
    }

    const results = [];

    for (const reseller of resellers) {
      // Count users
      const { count: userCount } = await supabase
        .from('reseller_users')
        .select('*', { count: 'exact', head: true })
        .eq('reseller_id', reseller.id);

      // Count approved orders
      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('reseller_id', reseller.id)
        .in('order_status', ['approved', 'completed']);

      // Count packages sold
      const { count: packageCount } = await supabase
        .from('reseller_commissions')
        .select('*', { count: 'exact', head: true })
        .eq('reseller_id', reseller.id)
        .eq('status', 'approved');

      // Sum total sales
      const { data: salesData } = await supabase
        .from('reseller_commissions')
        .select('package_price')
        .eq('reseller_id', reseller.id)
        .eq('status', 'approved');

      const totalSales = (salesData || []).reduce((sum, r) => sum + (r.package_price || 0), 0);

      // Sum total profit
      const { data: profitData } = await supabase
        .from('reseller_commissions')
        .select('commission_amount')
        .eq('reseller_id', reseller.id)
        .eq('status', 'approved');

      const totalProfit = (profitData || []).reduce((sum, r) => sum + (r.commission_amount || 0), 0);

      // Update reseller record
      const { data: updated } = await supabase
        .from('resellers')
        .update({
          total_users: userCount || 0,
          total_orders: orderCount || 0,
          total_packages_sold: packageCount || 0,
          total_sales_amount: totalSales,
          total_profit_amount: totalProfit,
          updated_at: new Date().toISOString()
        })
        .eq('id', reseller.id)
        .select()
        .single();

      // Update stats cache
      await supabase
        .from('reseller_stats_cache')
        .upsert({
          reseller_id: reseller.id,
          total_users: userCount || 0,
          total_orders: orderCount || 0,
          total_packages_sold: packageCount || 0,
          total_sales_amount: totalSales,
          total_profit_amount: totalProfit,
          last_calculated_at: new Date().toISOString()
        }, { onConflict: 'reseller_id' });

      results.push({
        reseller_id: reseller.id,
        total_users: userCount || 0,
        total_orders: orderCount || 0,
        total_packages_sold: packageCount || 0,
        total_sales: totalSales,
        total_profit: totalProfit,
        updated: !!updated
      });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Calculate stats error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
