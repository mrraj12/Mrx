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

interface ClientFilters {
  status?: string;
  search?: string;
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
async function validateToken(token: string): Promise<{ valid: boolean; adminId?: string }> {
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
      .select('id, is_active')
      .eq('id', session.admin_id)
      .maybeSingle();

    if (!admin || !admin.is_active) {
      return { valid: false };
    }

    await supabase.from('admin_sessions').update({ last_activity_at: new Date().toISOString() }).eq('id', session.id);

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
    const { action, token, clientId, filters, page = 1, pageSize = 20 } = body;

    const validation = await validateToken(token);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LIST CLIENTS
    if (action === 'list') {
      let query = supabase
        .from('vpn_clients')
        .select(`
          *,
          package:packages(*),
          node:vpn_nodes(id, country, city, node_name)
        `, { count: 'exact' });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`email.ilike.%${filters.search}%,client_uuid.ilike.%${filters.search}%`);
      }

      // Pagination
      const offset = (page - 1) * pageSize;
      query = query.range(offset, offset + pageSize - 1).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch clients' }),
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

    // GET SINGLE CLIENT
    if (action === 'get') {
      if (!clientId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Client ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: client, error } = await supabase
        .from('vpn_clients')
        .select(`
          *,
          package:packages(*),
          node:vpn_nodes(id, country, city, node_name, panel:vpn_panels(id, name, country))
        `)
        .eq('id', clientId)
        .maybeSingle();

      if (error || !client) {
        return new Response(
          JSON.stringify({ success: false, error: 'Client not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, client }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SUSPEND CLIENT
    if (action === 'suspend') {
      if (!clientId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Client ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get client with node info
      const { data: client } = await supabase
        .from('vpn_clients')
        .select('*, node:vpn_nodes(panel_id, inbound_id)')
        .eq('id', clientId)
        .maybeSingle();

      if (!client) {
        return new Response(
          JSON.stringify({ success: false, error: 'Client not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update status in database
      const { data: updatedClient, error } = await supabase
        .from('vpn_clients')
        .update({ status: 'suspended', updated_at: new Date().toISOString() })
        .eq('id', clientId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to suspend client' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Try to disable in 3X-UI panel
      try {
        const node = client.node as any;
        if (node?.panel_id) {
          await fetch(`${supabaseUrl}/functions/v1/vpn-provision`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              action: 'disable',
              panelId: node.panel_id,
              inboundId: client.inbound_id,
              clientUuid: client.client_uuid,
              email: client.email
            })
          });
        }
      } catch (err) {
        console.error('Failed to disable in panel:', err);
      }

      await logAction(validation.adminId!, 'client_suspended', 'vpn_client', clientId);

      return new Response(
        JSON.stringify({ success: true, client: updatedClient }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTIVATE CLIENT
    if (action === 'activate') {
      if (!clientId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Client ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: client } = await supabase
        .from('vpn_clients')
        .select('*, node:vpn_nodes(panel_id, inbound_id)')
        .eq('id', clientId)
        .maybeSingle();

      if (!client) {
        return new Response(
          JSON.stringify({ success: false, error: 'Client not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if expired
      if (new Date(client.expire_date) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: 'Client has expired. Cannot reactivate.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: updatedClient, error } = await supabase
        .from('vpn_clients')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', clientId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to activate client' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Try to enable in 3X-UI panel
      try {
        const node = client.node as any;
        if (node?.panel_id) {
          await fetch(`${supabaseUrl}/functions/v1/vpn-provision`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              action: 'enable',
              panelId: node.panel_id,
              inboundId: client.inbound_id,
              clientUuid: client.client_uuid,
              email: client.email
            })
          });
        }
      } catch (err) {
        console.error('Failed to enable in panel:', err);
      }

      await logAction(validation.adminId!, 'client_activated', 'vpn_client', clientId);

      return new Response(
        JSON.stringify({ success: true, client: updatedClient }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE CLIENT
    if (action === 'delete') {
      if (!clientId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Client ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: client } = await supabase
        .from('vpn_clients')
        .select('*, node:vpn_nodes(panel_id, inbound_id)')
        .eq('id', clientId)
        .maybeSingle();

      if (!client) {
        return new Response(
          JSON.stringify({ success: false, error: 'Client not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update status to deleted (soft delete)
      const { error } = await supabase
        .from('vpn_clients')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', clientId);

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to delete client' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Try to delete from 3X-UI panel
      try {
        const node = client.node as any;
        if (node?.panel_id) {
          await fetch(`${supabaseUrl}/functions/v1/vpn-provision`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              action: 'delete',
              panelId: node.panel_id,
              inboundId: client.inbound_id,
              clientUuid: client.client_uuid,
              email: client.email
            })
          });
        }
      } catch (err) {
        console.error('Failed to delete from panel:', err);
      }

      await logAction(validation.adminId!, 'client_deleted', 'vpn_client', clientId);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // REGENERATE SUBSCRIPTION
    if (action === 'regenerate_subscription') {
      if (!clientId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Client ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: client } = await supabase
        .from('vpn_clients')
        .select('*, node:vpn_nodes(panel_id, inbound_id), package:packages(*)')
        .eq('id', clientId)
        .maybeSingle();

      if (!client) {
        return new Response(
          JSON.stringify({ success: false, error: 'Client not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (client.status === 'deleted') {
        return new Response(
          JSON.stringify({ success: false, error: 'Cannot regenerate a deleted client' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const node = client.node as any;
      const pkg = client.package as any;
      const oldUuid = client.client_uuid;
      const newUuid = crypto.randomUUID();

      // Delete old client from 3X-UI panel
      if (node?.panel_id) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/vpn-provision`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              action: 'delete',
              panelId: node.panel_id,
              inboundId: client.inbound_id,
              clientUuid: oldUuid
            })
          });
        } catch (err) {
          console.error('Failed to delete old client from panel:', err);
        }
      }

      // Create new client on panel with same settings
      let newSubscriptionUrl = '';
      if (node?.panel_id) {
        try {
          const remainingDays = Math.max(1, Math.ceil((new Date(client.expire_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          const provisionResponse = await fetch(`${supabaseUrl}/functions/v1/vpn-provision`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              action: 'create',
              panelId: node.panel_id,
              inboundId: client.inbound_id,
              clientUuid: newUuid,
              email: client.email,
              totalGb: client.total_gb,
              expireDays: remainingDays,
              deviceLimit: client.device_limit || pkg?.device_limit || 1
            })
          });

          const provisionData = await provisionResponse.json();
          if (provisionData.success) {
            newSubscriptionUrl = provisionData.subscriptionUrl || '';
          } else {
            return new Response(
              JSON.stringify({ success: false, error: `Failed to create new client on panel: ${provisionData.error}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (err) {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to provision new subscription on panel' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Update the vpn_clients record with new UUID and URL
      const { data: updatedClient, error: updateError } = await supabase
        .from('vpn_clients')
        .update({
          client_uuid: newUuid,
          subscription_url: newSubscriptionUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)
        .select()
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update client record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'subscription_regenerated', 'vpn_client', clientId, {
        old_uuid: oldUuid,
        new_uuid: newUuid
      });

      return new Response(
        JSON.stringify({ success: true, client: updatedClient }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin VPN clients error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
