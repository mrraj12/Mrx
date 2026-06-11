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

// 3X-UI API Client
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
        // Extract session from cookies or response
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
          this.session = setCookie.split(';')[0];
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
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

  async addClient(inboundId: number, clientData: {
    uuid: string;
    email: string;
    totalGb: number;
    expireDays: number;
    deviceLimit: number;
  }): Promise<{ success: boolean; subscriptionUrl?: string; inboundId?: number; error?: string }> {
    try {
      const expireTimestamp = Math.floor(Date.now() / 1000) + (clientData.expireDays * 24 * 60 * 60);
      const totalBytes = clientData.totalGb * 1024 * 1024 * 1024;

      const settings = {
        clients: [{
          id: clientData.uuid,
          email: clientData.email,
          enable: true,
          expiryTime: expireTimestamp * 1000,
          totalGB: clientData.totalGb,
          subId: clientData.uuid.substring(0, 8),
          limitIp: clientData.deviceLimit,
          flow: ''
        }]
      };

      const response = await fetch(`${this.panelUrl}/panel/api/inbounds/addClient/${inboundId}`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify(settings)
      });

      const data = await response.json();

      if (data.success) {
        // Get inbound info for subscription URL
        const { data: inboundData } = await this.getInbound(inboundId);
        const subscriptionUrl = inboundData ?
          `${this.panelUrl}/sub/${clientData.uuid.substring(0, 8)}` :
          undefined;

        return {
          success: true,
          subscriptionUrl,
          inboundId
        };
      }

      return { success: false, error: data.msg || 'Failed to add client' };
    } catch (error: any) {
      console.error('Add client failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getInbound(inboundId: number): Promise<{ success: boolean; data?: any }> {
    try {
      const response = await fetch(`${this.panelUrl}/panel/api/inbounds/get/${inboundId}`, {
        method: 'GET',
        headers: await this.getHeaders()
      });

      const data = await response.json();
      return { success: data.success, data: data.obj };
    } catch {
      return { success: false };
    }
  }

  async updateClient(inboundId: number, clientUuid: string, updates: {
    enable?: boolean;
    totalGb?: number;
    expireTimestamp?: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.panelUrl}/panel/api/inbounds/updateClient/${inboundId}/${clientUuid}`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      return { success: data.success, error: data.msg };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteClient(inboundId: number, clientUuid: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.panelUrl}/panel/api/inbounds/delClient/${inboundId}/${clientUuid}`, {
        method: 'POST',
        headers: await this.getHeaders()
      });

      const data = await response.json();
      return { success: data.success };
    } catch {
      return { success: false };
    }
  }

  async getClientTraffic(inboundId: number, clientUuid: string): Promise<{
    up: number;
    down: number;
    total: number;
  } | null> {
    try {
      const response = await fetch(`${this.panelUrl}/panel/api/inbounds/getClientTraffics/${inboundId}/${clientUuid}`, {
        method: 'GET',
        headers: await this.getHeaders()
      });

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
    // Verify this is called by service role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.includes(supabaseServiceKey)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      action = 'create',
      panelId,
      inboundId,
      clientUuid,
      email,
      totalGb,
      expireDays,
      deviceLimit
    } = body;

    // Get panel credentials
    const { data: panel, error: panelError } = await supabase
      .from('vpn_panels')
      .select('*')
      .eq('id', panelId)
      .maybeSingle();

    if (panelError || !panel) {
      return new Response(
        JSON.stringify({ success: false, error: 'Panel not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const xuiClient = new XUIApiClient(panel.panel_url, panel.username, panel.password);

    // Login to panel
    const loggedIn = await xuiClient.login();
    if (!loggedIn) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to login to panel' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREATE CLIENT
    if (action === 'create') {
      const result = await xuiClient.addClient(inboundId, {
        uuid: clientUuid,
        email,
        totalGb,
        expireDays,
        deviceLimit
      });

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ENABLE CLIENT
    if (action === 'enable') {
      const result = await xuiClient.updateClient(inboundId, clientUuid, { enable: true });
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DISABLE CLIENT
    if (action === 'disable') {
      const result = await xuiClient.updateClient(inboundId, clientUuid, { enable: false });
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE CLIENT
    if (action === 'delete') {
      const result = await xuiClient.deleteClient(inboundId, clientUuid);
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET TRAFFIC
    if (action === 'getTraffic') {
      const traffic = await xuiClient.getClientTraffic(inboundId, clientUuid);
      return new Response(
        JSON.stringify({ success: true, traffic }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('VPN provision error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
