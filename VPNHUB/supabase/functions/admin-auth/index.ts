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

const SESSION_DURATION_HOURS = 8;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const MAX_SESSIONS_PER_ADMIN = 5;

interface LoginRequest {
  action: 'login' | 'logout' | 'validate' | 'list_sessions' | 'revoke_session' | 'revoke_all_sessions' | 'update_activity';
  username?: string;
  password?: string;
  two_factor_code?: string;
  token?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  device_info?: Record<string, any>;
}

interface AdminSessionData {
  id: string;
  admin_id: string;
  admin: {
    id: string;
    username: string;
    role: string;
    two_factor_enabled: boolean;
    permissions: Record<string, boolean>;
    is_active: boolean;
  };
  expires_at: string;
  token?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Hash function using Web Crypto API
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hash password with salt
async function hashPassword(password: string, salt?: string): Promise<string> {
  const saltBytes = salt ? new TextEncoder().encode(salt) : crypto.getRandomValues(new Uint8Array(16));
  const passwordBytes = new TextEncoder().encode(password);
  const combined = new Uint8Array(saltBytes.length + passwordBytes.length);
  combined.set(saltBytes);
  combined.set(passwordBytes, saltBytes.length);

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = Array.from(new Uint8Array(saltBytes)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

// Verify password
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.includes(':')) {
    const [saltHex, hashHex] = storedHash.split(':');
    const saltBytes = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const passwordBytes = new TextEncoder().encode(password);
    const combined = new Uint8Array(saltBytes.length + passwordBytes.length);
    combined.set(saltBytes);
    combined.set(passwordBytes, saltBytes.length);

    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const verifyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex === verifyHash;
  } else {
    return storedHash === password;
  }
}

// Generate secure token
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Parse user agent for device info
function parseUserAgent(userAgent: string | undefined): Record<string, any> {
  if (!userAgent) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };

  const deviceInfo: Record<string, any> = {};

  // Detect browser
  if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox';
  else if (userAgent.includes('Edg')) deviceInfo.browser = 'Edge';
  else if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome';
  else if (userAgent.includes('Safari')) deviceInfo.browser = 'Safari';
  else deviceInfo.browser = 'Other';

  // Detect OS
  if (userAgent.includes('Windows')) deviceInfo.os = 'Windows';
  else if (userAgent.includes('Mac OS')) deviceInfo.os = 'macOS';
  else if (userAgent.includes('Linux')) deviceInfo.os = 'Linux';
  else if (userAgent.includes('Android')) deviceInfo.os = 'Android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) deviceInfo.os = 'iOS';
  else deviceInfo.os = 'Other';

  // Detect device type
  if (userAgent.includes('Mobile')) deviceInfo.device = 'Mobile';
  else if (userAgent.includes('Tablet')) deviceInfo.device = 'Tablet';
  else deviceInfo.device = 'Desktop';

  return deviceInfo;
}

// Log admin action
async function logAdminAction(
  adminId: string | null,
  action: string,
  ipAddress: string | undefined,
  userAgent: string | undefined,
  details?: Record<string, any>,
  sessionId?: string
): Promise<void> {
  try {
    await supabase.from('admin_logs').insert({
      admin_id: adminId,
      action,
      ip_address: ipAddress,
      user_agent: userAgent,
      details,
      target_type: 'admin_auth',
      session_id: sessionId
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

// Check login attempts (rate limiting)
async function checkLoginAttempts(username: string): Promise<{ allowed: boolean; attempts: number }> {
  try {
    const { data, error } = await supabase
      .from('admin_logs')
      .select('created_at')
      .eq('action', 'login_failed')
      .eq('details->username', username)
      .gte('created_at', new Date(Date.now() - LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(MAX_LOGIN_ATTEMPTS);

    if (error) return { allowed: true, attempts: 0 };

    const attempts = data?.length || 0;
    return {
      allowed: attempts < MAX_LOGIN_ATTEMPTS,
      attempts
    };
  } catch {
    return { allowed: true, attempts: 0 };
  }
}

// Record failed login
async function recordFailedLogin(username: string, ipAddress: string | undefined, userAgent: string | undefined): Promise<void> {
  await logAdminAction(null, 'login_failed', ipAddress, userAgent, { username });
}

// Cleanup old sessions for an admin
async function cleanupOldSessions(adminId: string, keepSessionId?: string): Promise<void> {
  try {
    // Deactivate sessions beyond the limit
    const { data: sessions } = await supabase
      .from('admin_sessions')
      .select('id')
      .eq('admin_id', adminId)
      .eq('is_active', true)
      .order('last_activity_at', { ascending: false });

    if (sessions && sessions.length >= MAX_SESSIONS_PER_ADMIN) {
      const sessionsToRevoke = sessions
        .filter(s => s.id !== keepSessionId)
        .slice(MAX_SESSIONS_PER_ADMIN - 1);

      if (sessionsToRevoke.length > 0) {
        await supabase
          .from('admin_sessions')
          .update({ is_active: false })
          .in('id', sessionsToRevoke.map(s => s.id));
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old sessions:', error);
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
    const body: LoginRequest = await req.json();
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;
    const deviceInfo = { ...parseUserAgent(userAgent), ...body.device_info };

    if (!body.action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Action required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LOGIN
    if (body.action === 'login') {
      if (!body.username || !body.password) {
        return new Response(
          JSON.stringify({ success: false, error: 'Username and password required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { allowed, attempts } = await checkLoginAttempts(body.username);
      if (!allowed) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Too many login attempts. Please try again in ${LOCKOUT_DURATION_MINUTES} minutes.`
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', body.username)
        .eq('is_active', true)
        .maybeSingle();

      if (adminError || !adminUser) {
        await recordFailedLogin(body.username, clientIP, userAgent);
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const passwordValid = await verifyPassword(body.password, adminUser.password_hash);

      if (!passwordValid) {
        await recordFailedLogin(body.username, clientIP, userAgent);
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (adminUser.two_factor_enabled) {
        if (!body.two_factor_code) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Two-factor authentication code required',
              requires2FA: true
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Upgrade password hash if needed
      if (!adminUser.password_hash.includes(':')) {
        const newHash = await hashPassword(body.password);
        await supabase
          .from('admin_users')
          .update({ password_hash: newHash })
          .eq('id', adminUser.id);
      }

      // Generate token and hash
      const token = generateToken();
      const tokenHash = await hashToken(token);
      const tokenPrefix = token.substring(0, 8);
      const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000).toISOString();

      // Create session in admin_sessions table
      const { data: sessionData, error: sessionError } = await supabase
        .from('admin_sessions')
        .insert({
          admin_id: adminUser.id,
          token_hash: tokenHash,
          token_prefix: tokenPrefix,
          ip_address: clientIP,
          user_agent: userAgent,
          device_info: deviceInfo,
          expires_at: expiresAt,
          is_active: true
        })
        .select('id')
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Cleanup old sessions
      await cleanupOldSessions(adminUser.id, sessionData.id);

      // Log successful login
      await logAdminAction(
        adminUser.id,
        'login',
        clientIP,
        userAgent,
        { session_id: sessionData.id, token_prefix: tokenPrefix },
        sessionData.id
      );

      // Update last login
      await supabase
        .from('admin_users')
        .update({
          last_login_at: new Date().toISOString(),
          last_login_ip: clientIP
        })
        .eq('id', adminUser.id);

      const session: AdminSessionData = {
        id: sessionData.id,
        admin_id: adminUser.id,
        admin: {
          id: adminUser.id,
          username: adminUser.username,
          role: adminUser.role,
          two_factor_enabled: adminUser.two_factor_enabled,
          permissions: adminUser.permissions || {},
          is_active: adminUser.is_active
        },
        expires_at: expiresAt,
        token
      };

      return new Response(
        JSON.stringify({
          success: true,
          session,
          token
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // VALIDATE
    if (body.action === 'validate') {
      if (!body.token) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenHash = await hashToken(body.token);

      // Find active session by token hash
      const { data: session, error } = await supabase
        .from('admin_sessions')
        .select('id, admin_id, expires_at, is_active')
        .eq('token_hash', tokenHash)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !session) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check expiration
      if (new Date(session.expires_at) < new Date()) {
        // Mark as inactive
        await supabase
          .from('admin_sessions')
          .update({ is_active: false })
          .eq('id', session.id);

        return new Response(
          JSON.stringify({ success: false, error: 'Session expired' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get admin data
      const { data: admin } = await supabase
        .from('admin_users')
        .select('id, username, role, two_factor_enabled, is_active, permissions')
        .eq('id', session.admin_id)
        .single();

      if (!admin || !admin.is_active) {
        return new Response(
          JSON.stringify({ success: false, error: 'Admin not active' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update last activity
      await supabase
        .from('admin_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', session.id);

      return new Response(
        JSON.stringify({ success: true, admin, session_id: session.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LOGOUT
    if (body.action === 'logout') {
      if (body.token) {
        const tokenHash = await hashToken(body.token);

        const { data: session } = await supabase
          .from('admin_sessions')
          .select('id, admin_id')
          .eq('token_hash', tokenHash)
          .maybeSingle();

        if (session) {
          // Mark session as inactive
          await supabase
            .from('admin_sessions')
            .update({ is_active: false })
            .eq('id', session.id);

          await logAdminAction(
            session.admin_id,
            'logout',
            clientIP,
            userAgent,
            { session_id: session.id },
            session.id
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LIST SESSIONS
    if (body.action === 'list_sessions') {
      if (!body.token) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenHash = await hashToken(body.token);

      // Get current session to find admin_id
      const { data: currentSession } = await supabase
        .from('admin_sessions')
        .select('admin_id, id')
        .eq('token_hash', tokenHash)
        .eq('is_active', true)
        .maybeSingle();

      if (!currentSession) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get all active sessions for this admin
      const { data: sessions } = await supabase
        .from('admin_sessions')
        .select('id, token_prefix, ip_address, user_agent, device_info, last_activity_at, created_at, expires_at, is_active')
        .eq('admin_id', currentSession.admin_id)
        .order('last_activity_at', { ascending: false });

      return new Response(
        JSON.stringify({
          success: true,
          sessions: sessions || [],
          current_session_id: currentSession.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // REVOKE SESSION
    if (body.action === 'revoke_session') {
      if (!body.token || !body.session_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token and session_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenHash = await hashToken(body.token);

      // Verify current session
      const { data: currentSession } = await supabase
        .from('admin_sessions')
        .select('admin_id, id')
        .eq('token_hash', tokenHash)
        .eq('is_active', true)
        .maybeSingle();

      if (!currentSession) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Cannot revoke own current session
      if (body.session_id === currentSession.id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Cannot revoke current session. Use logout instead.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Revoke the session
      const { error } = await supabase
        .from('admin_sessions')
        .update({ is_active: false })
        .eq('id', body.session_id)
        .eq('admin_id', currentSession.admin_id);

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to revoke session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAdminAction(
        currentSession.admin_id,
        'session_revoked',
        clientIP,
        userAgent,
        { revoked_session_id: body.session_id },
        currentSession.id
      );

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // REVOKE ALL OTHER SESSIONS
    if (body.action === 'revoke_all_sessions') {
      if (!body.token) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenHash = await hashToken(body.token);

      const { data: currentSession } = await supabase
        .from('admin_sessions')
        .select('admin_id, id')
        .eq('token_hash', tokenHash)
        .eq('is_active', true)
        .maybeSingle();

      if (!currentSession) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Revoke all other sessions
      const { error } = await supabase
        .from('admin_sessions')
        .update({ is_active: false })
        .eq('admin_id', currentSession.admin_id)
        .neq('id', currentSession.id);

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to revoke sessions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAdminAction(
        currentSession.admin_id,
        'all_sessions_revoked',
        clientIP,
        userAgent,
        {},
        currentSession.id
      );

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE_ACTIVITY
    if (body.action === 'update_activity') {
      if (!body.token) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenHash = await hashToken(body.token);

      const { error } = await supabase
        .from('admin_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('token_hash', tokenHash)
        .eq('is_active', true);

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
    console.error('Admin auth error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
