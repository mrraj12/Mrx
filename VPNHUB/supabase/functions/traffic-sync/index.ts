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

// 3X-UI API Client for traffic sync
class XUIApiClient {
  private panelUrl: string;
  private username: string;
  private password: string;
  private session: string | null = null;

  constructor(panelUrl: string, username: string, password: string) {
    this.panelUrl = panelUrl.replace(/\/$/, '');
    this.username = username;
    this.password = password;
  }

  async login(): Promise<boolean> {
    try {
      const response = await fetch(`${this.panelUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          username: this.username,
          password: this.password
        })
      });

      const data = await response.json();
      if (data.success) {
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
          this.session = setCookie.split(';')[0];
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async getHeaders(): Promise<HeadersInit> {
    if (!this.session) {
      await this.login();
    }
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': this.session || ''
    };
  }

  async getClientTraffic(inboundId: number, email: string): Promise<{ up: number; down: number; total: number } | null> {
    try {
      const response = await fetch(
        `${this.panelUrl}/panel/api/inbounds/getClientTraffics/${inboundId}/${email}`,
        {
          method: 'GET',
          headers: await this.getHeaders()
        }
      );

      const data = await response.json();
      if (data.success && data.obj) {
        return {
          up: data.obj.up || 0,
          down: data.obj.down || 0,
          total: (data.obj.up || 0) + (data.obj.down || 0)
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}

async function syncClientTraffic(client: any): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the node and panel info
    const { data: node, error: nodeError } = await supabase
      .from('vpn_nodes')
      .select(`
        *,
        panel:vpn_panels(*)
      `)
      .eq('id', client.node_id)
      .maybeSingle();

    if (nodeError || !node || !node.panel) {
      return { success: false, error: 'Node or panel not found' };
    }

    const panel = node.panel as any;
    const xuiClient = new XUIApiClient(panel.panel_url, panel.username, panel.password);

    // Login to panel
    const loggedIn = await xuiClient.login();
    if (!loggedIn) {
      return { success: false, error: 'Failed to login to panel' };
    }

    // Get traffic data
    const traffic = await xuiClient.getClientTraffic(
      client.inbound_id || node.inbound_id,
      client.email
    );

    if (!traffic) {
      return { success: false, error: 'Failed to get traffic data' };
    }

    // Convert bytes to GB
    const usedGb = traffic.total / (1024 * 1024 * 1024);
    const remainingGb = Math.max(0, client.total_gb - usedGb);

    // Update client record
    const { error: updateError } = await supabase
      .from('vpn_clients')
      .update({
        used_gb: Math.round(usedGb * 1000) / 1000, // 3 decimal places
        remaining_gb: Math.round(remainingGb * 1000) / 1000,
        last_sync_at: new Date().toISOString(),
        status: remainingGb <= 0 ? 'expired' :
               new Date(client.expire_date) < new Date() ? 'expired' :
               client.status
      })
      .eq('id', client.id);

    if (updateError) {
      return { success: false, error: 'Failed to update client' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Allow GET for health check
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ status: 'ok', service: 'traffic-sync' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify this is called by service role or cron
    const authHeader = req.headers.get('Authorization');
    if (authHeader && !authHeader.includes(supabaseServiceKey)) {
      // Check for cron secret
      const cronSecret = Deno.env.get('CRON_SECRET');
      const providedSecret = req.headers.get('X-Cron-Secret');
      if (cronSecret && providedSecret !== cronSecret) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get all active VPN clients with node info
    const { data: clients, error: clientsError } = await supabase
      .from('vpn_clients')
      .select('*')
      .in('status', ['active', 'suspended'])
      .order('last_sync_at', { ascending: true })
      .limit(100); // Process in batches

    if (clientsError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch clients' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!clients || clients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No clients to sync', synced: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sync each client
    const results = await Promise.allSettled(
      clients.map(async (client) => {
        const result = await syncClientTraffic(client);
        return { clientId: client.id, ...result };
      })
    );

    // Count successes and failures
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          synced++;
        } else {
          failed++;
          if (result.value.error) {
            errors.push(`Client ${clients[index].id}: ${result.value.error}`);
          }
        }
      } else {
        failed++;
        errors.push(`Client ${clients[index].id}: ${result.reason}`);
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        failed,
        total: clients.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Return first 10 errors
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Traffic sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
