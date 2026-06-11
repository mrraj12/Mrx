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

// 3X-UI API Client for testing connections
class XUIApiClient {
  private panelUrl: string;
  private username: string;
  private password: string;

  constructor(panelUrl: string, username: string, password: string) {
    this.panelUrl = panelUrl.replace(/\/$/, '');
    this.username = username;
    this.password = password;
  }

  async login(): Promise<{ success: boolean; session?: string }> {
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
        const session = setCookie ? setCookie.split(';')[0] : undefined;
        return { success: true, session };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  }

  async getStatus(session: string): Promise<{ online: boolean; version?: string }> {
    try {
      const response = await fetch(`${this.panelUrl}/panel/api/status`, {
        headers: { 'Cookie': session }
      });
      const data = await response.json();
      return { online: data.success, version: data.obj?.xuiVersion };
    } catch {
      return { online: false };
    }
  }

  async getInbounds(session: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.panelUrl}/panel/api/inbounds`, {
        headers: { 'Cookie': session }
      });
      const data = await response.json();
      return data.success ? (data.obj || []) : [];
    } catch {
      return [];
    }
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
    const { action, token, panelId, nodeId, panelData, nodeData } = body;

    const validation = await validateToken(token);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const permissions = validation.permissions as any;

    // LIST PANELS
    if (action === 'list_panels') {
      const { data, error } = await supabase
        .from('vpn_panels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch panels' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get node counts for each panel
      const panelsWithStats = await Promise.all((data || []).map(async (panel) => {
        const { count: nodesCount } = await supabase
          .from('vpn_nodes')
          .select('*', { count: 'exact', head: true })
          .eq('panel_id', panel.id);

        const { count: clientsCount } = await supabase
          .from('vpn_clients')
          .select('*', { count: 'exact', head: true })
          .eq('node_id', panel.id);

        return {
          ...panel,
          password: '***', // Hide password
          nodes_count: nodesCount || 0,
          clients_count: clientsCount || 0
        };
      }));

      return new Response(
        JSON.stringify({ success: true, panels: panelsWithStats }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LIST NODES
    if (action === 'list_nodes') {
      let query = supabase
        .from('vpn_nodes')
        .select(`
          *,
          panel:vpn_panels(id, name, country, is_active)
        `)
        .order('created_at', { ascending: false });

      if (panelId) {
        query = query.eq('panel_id', panelId);
      }

      const { data, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch nodes' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get client counts for each node
      const nodesWithStats = await Promise.all((data || []).map(async (node) => {
        const { count: clientsCount } = await supabase
          .from('vpn_clients')
          .select('*', { count: 'exact', head: true })
          .eq('node_id', node.id);

        return {
          ...node,
          clients_count: clientsCount || 0
        };
      }));

      return new Response(
        JSON.stringify({ success: true, nodes: nodesWithStats }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permissions for modifications
    if (!permissions?.nodes_manage) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREATE PANEL
    if (action === 'create_panel') {
      if (!panelData || !panelData.name || !panelData.panel_url) {
        return new Response(
          JSON.stringify({ success: false, error: 'Panel name and URL required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('vpn_panels')
        .insert({
          name: panelData.name,
          country: panelData.country || 'Unknown',
          panel_url: panelData.panel_url,
          username: panelData.username || 'admin',
          password: panelData.password || '',
          version: '3X-UI',
          subscription_path: panelData.subscription_path || 'sub',
          is_active: panelData.is_active !== false,
          max_clients: panelData.max_clients || 100
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create panel' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'panel_created', 'vpn_panel', data.id, {
        name: panelData.name,
        url: panelData.panel_url
      });

      return new Response(
        JSON.stringify({ success: true, panel: { ...data, password: '***' } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE PANEL
    if (action === 'update_panel') {
      if (!panelId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Panel ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updateData: any = {};
      if (panelData.name !== undefined) updateData.name = panelData.name;
      if (panelData.country !== undefined) updateData.country = panelData.country;
      if (panelData.panel_url !== undefined) updateData.panel_url = panelData.panel_url;
      if (panelData.username !== undefined) updateData.username = panelData.username;
      if (panelData.password !== undefined) updateData.password = panelData.password;
      if (panelData.subscription_path !== undefined) updateData.subscription_path = panelData.subscription_path;
      if (panelData.is_active !== undefined) updateData.is_active = panelData.is_active;
      if (panelData.max_clients !== undefined) updateData.max_clients = panelData.max_clients;

      const { data, error } = await supabase
        .from('vpn_panels')
        .update(updateData)
        .eq('id', panelId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update panel' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'panel_updated', 'vpn_panel', panelId, updateData);

      return new Response(
        JSON.stringify({ success: true, panel: { ...data, password: '***' } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE PANEL
    if (action === 'delete_panel') {
      if (!panelId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Panel ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete nodes first
      await supabase
        .from('vpn_nodes')
        .delete()
        .eq('panel_id', panelId);

      const { error } = await supabase
        .from('vpn_panels')
        .delete()
        .eq('id', panelId);

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to delete panel' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'panel_deleted', 'vpn_panel', panelId);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREATE NODE
    if (action === 'create_node') {
      if (!nodeData || !nodeData.panel_id || !nodeData.node_name) {
        return new Response(
          JSON.stringify({ success: false, error: 'Panel ID and node name required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('vpn_nodes')
        .insert({
          panel_id: nodeData.panel_id,
          inbound_id: nodeData.inbound_id || 1,
          country: nodeData.country || 'Unknown',
          city: nodeData.city,
          node_name: nodeData.node_name,
          is_active: nodeData.is_active !== false
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create node' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'node_created', 'vpn_node', data.id, {
        name: nodeData.node_name,
        panel_id: nodeData.panel_id
      });

      return new Response(
        JSON.stringify({ success: true, node: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE NODE
    if (action === 'update_node') {
      if (!nodeId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Node ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updateData: any = {};
      if (nodeData.panel_id !== undefined) updateData.panel_id = nodeData.panel_id;
      if (nodeData.inbound_id !== undefined) updateData.inbound_id = nodeData.inbound_id;
      if (nodeData.country !== undefined) updateData.country = nodeData.country;
      if (nodeData.city !== undefined) updateData.city = nodeData.city;
      if (nodeData.node_name !== undefined) updateData.node_name = nodeData.node_name;
      if (nodeData.is_active !== undefined) updateData.is_active = nodeData.is_active;

      const { data, error } = await supabase
        .from('vpn_nodes')
        .update(updateData)
        .eq('id', nodeId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update node' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'node_updated', 'vpn_node', nodeId, updateData);

      return new Response(
        JSON.stringify({ success: true, node: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE NODE
    if (action === 'delete_node') {
      if (!nodeId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Node ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('vpn_nodes')
        .delete()
        .eq('id', nodeId);

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to delete node' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'node_deleted', 'vpn_node', nodeId);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TEST PANEL CONNECTION
    if (action === 'test_connection') {
      if (!panelId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Panel ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: panel } = await supabase
        .from('vpn_panels')
        .select('*')
        .eq('id', panelId)
        .maybeSingle();

      if (!panel) {
        return new Response(
          JSON.stringify({ success: false, error: 'Panel not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const client = new XUIApiClient(panel.panel_url, panel.username, panel.password);
      const loginResult = await client.login();

      if (!loginResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to login to panel' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const status = await client.getStatus(loginResult.session!);
      const inbounds = await client.getInbounds(loginResult.session!);

      return new Response(
        JSON.stringify({
          success: true,
          connection: {
            online: status.online,
            version: status.version,
            inbounds_count: inbounds.length,
            inbounds: inbounds.map((i: any) => ({
              id: i.id,
              tag: i.tag,
              port: i.port,
              protocol: i.protocol
            }))
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET PANEL STATS
    if (action === 'get_stats') {
      if (!panelId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Panel ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: panel } = await supabase
        .from('vpn_panels')
        .select('*')
        .eq('id', panelId)
        .maybeSingle();

      if (!panel) {
        return new Response(
          JSON.stringify({ success: false, error: 'Panel not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get all nodes for this panel
      const { data: nodes } = await supabase
        .from('vpn_nodes')
        .select('id')
        .eq('panel_id', panelId);

      const nodeIds = (nodes || []).map(n => n.id);

      // Get client stats
      const { data: clients } = await supabase
        .from('vpn_clients')
        .select('status, used_gb')
        .in('node_id', nodeIds);

      const stats = {
        total_clients: clients?.length || 0,
        active_clients: clients?.filter(c => c.status === 'active').length || 0,
        suspended_clients: clients?.filter(c => c.status === 'suspended').length || 0,
        expired_clients: clients?.filter(c => c.status === 'expired').length || 0,
        total_traffic_gb: clients?.reduce((sum, c) => sum + (parseFloat(c.used_gb as any) || 0), 0) || 0
      };

      return new Response(
        JSON.stringify({ success: true, stats }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin nodes error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
