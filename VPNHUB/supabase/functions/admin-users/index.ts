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

interface UserFilters {
  status?: 'active' | 'suspended';
  search?: string;
  verified?: boolean;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Validate admin token
async function validateToken(token: string): Promise<{ valid: boolean; adminId?: string; adminRole?: string; permissions?: any }> {
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
      .select('id, role, is_active, permissions')
      .eq('id', sessionLog.admin_id)
      .maybeSingle();

    if (!admin || !admin.is_active) {
      return { valid: false };
    }

    return {
      valid: true,
      adminId: admin.id,
      adminRole: admin.role,
      permissions: admin.permissions
    };
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
    const { action, token, userId, filters, page = 1, pageSize = 20, suspensionReason, newPassword } = body;

    const validation = await validateToken(token);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permissions for user management
    const permissions = validation.permissions as any;
    if (!permissions?.users_view && action !== 'get') {
      return new Response(
        JSON.stringify({ success: false, error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LIST USERS
    if (action === 'list') {
      let query = supabase
        .from('user_profiles')
        .select(`
          id,
          user_id,
          full_name,
          phone,
          email_verified,
          phone_verified,
          is_suspended,
          suspended_at,
          suspension_reason,
          last_login_at,
          login_count,
          created_at,
          updated_at
        `, { count: 'exact' });

      // Apply filters
      if (filters?.status === 'suspended') {
        query = query.eq('is_suspended', true);
      } else if (filters?.status === 'active') {
        query = query.eq('is_suspended', false);
      }
      if (filters?.verified === true) {
        query = query.eq('email_verified', true);
      }
      if (filters?.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      // Pagination
      const offset = (page - 1) * pageSize;
      query = query.range(offset, offset + pageSize - 1).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get auth user data for emails
      const userIds = (data || []).map((u: any) => u.user_id);
      const { data: authUsers } = await supabase.auth.admin.listUsers();

      const userMap = new Map((authUsers?.users || []).map(u => [u.id, u]));

      // Get additional stats for each user
      const enrichedData = await Promise.all((data || []).map(async (user: any) => {
        const authUser = userMap.get(user.user_id);
        const { count: ordersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id);

        const { count: activeSubs } = await supabase
          .from('vpn_clients')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id)
          .eq('status', 'active');

        return {
          ...user,
          email: authUser?.email,
          email_confirmed_at: authUser?.email_confirmed_at,
          last_sign_in_at: authUser?.last_sign_in_at,
          orders_count: ordersCount || 0,
          active_subscriptions: activeSubs || 0
        };
      }));

      const result: PaginatedResult<any> = {
        data: enrichedData,
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

    // GET SINGLE USER
    if (action === 'get') {
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'User ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Get auth user data
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);

      // Get user's orders
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          *,
          package:packages(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get user's VPN clients
      const { data: vpnClients } = await supabase
        .from('vpn_clients')
        .select(`
          *,
          package:packages(*),
          node:vpn_nodes(id, country, city, node_name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (profileError) {
        return new Response(
          JSON.stringify({ success: false, error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: userId,
            email: authUser?.user?.email,
            email_confirmed_at: authUser?.user?.email_confirmed_at,
            last_sign_in_at: authUser?.user?.last_sign_in_at,
            created_at: authUser?.user?.created_at,
            profile,
            orders: orders || [],
            vpn_clients: vpnClients || []
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SUSPEND USER
    if (action === 'suspend') {
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'User ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!permissions?.users_manage) {
        return new Response(
          JSON.stringify({ success: false, error: 'Permission denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update user profile
      const { data: updatedProfile, error } = await supabase
        .from('user_profiles')
        .update({
          is_suspended: true,
          suspended_at: new Date().toISOString(),
          suspension_reason: suspensionReason || 'Suspended by admin',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to suspend user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Suspend all VPN clients for this user
      await supabase
        .from('vpn_clients')
        .update({ status: 'suspended', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('status', 'active');

      await logAction(validation.adminId!, 'user_suspended', 'user', userId, { reason: suspensionReason });

      return new Response(
        JSON.stringify({ success: true, user: updatedProfile }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTIVATE USER
    if (action === 'activate') {
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'User ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!permissions?.users_manage) {
        return new Response(
          JSON.stringify({ success: false, error: 'Permission denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: updatedProfile, error } = await supabase
        .from('user_profiles')
        .update({
          is_suspended: false,
          suspended_at: null,
          suspension_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to activate user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Reactivate VPN clients that were suspended due to user suspension
      await supabase
        .from('vpn_clients')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('status', 'suspended')
        .gt('expire_date', new Date().toISOString());

      await logAction(validation.adminId!, 'user_activated', 'user', userId);

      return new Response(
        JSON.stringify({ success: true, user: updatedProfile }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE USER
    if (action === 'delete') {
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'User ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!permissions?.users_manage) {
        return new Response(
          JSON.stringify({ success: false, error: 'Permission denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete VPN clients first
      await supabase
        .from('vpn_clients')
        .delete()
        .eq('user_id', userId);

      // Delete user profile
      await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      // Delete auth user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to delete user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'user_deleted', 'user', userId);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // RESET PASSWORD
    if (action === 'reset_password') {
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'User ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!permissions?.users_manage) {
        return new Response(
          JSON.stringify({ success: false, error: 'Permission denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (newPassword && newPassword.length >= 6) {
        // Set new password directly
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          password: newPassword
        });

        if (updateError) {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to reset password' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await logAction(validation.adminId!, 'password_reset', 'user', userId);
        return new Response(
          JSON.stringify({ success: true, message: 'Password reset successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Send password reset email
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        if (authUser?.user?.email) {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(authUser.user.email);
          if (resetError) {
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to send reset email' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          await logAction(validation.adminId!, 'password_reset', 'user', userId);
          return new Response(
            JSON.stringify({ success: true, message: 'Password reset email sent' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: false, error: 'User email not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin users error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
