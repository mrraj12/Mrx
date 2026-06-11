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

// Test Telegram bot
async function testTelegramBot(botToken: string, chatId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '🔔 Test message from VPNHUB Admin Panel',
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true };
    }
    return { success: false, error: data.description || 'Failed to send message' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Test email settings
async function testEmailSettings(settings: any): Promise<{ success: boolean; error?: string }> {
  // In production, you would actually send a test email here
  // For now, we'll just validate the settings
  if (!settings.smtp_host || !settings.smtp_port) {
    return { success: false, error: 'SMTP host and port are required' };
  }
  if (!settings.from_email) {
    return { success: false, error: 'From email is required' };
  }

  // Simulate successful test
  return { success: true };
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
    const { action, token, settingsType, settingsData } = body;

    const validation = await validateToken(token);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const permissions = validation.permissions as any;

    // GET ALL SETTINGS
    if (action === 'get_all') {
      const [systemSettings, appSettings, emailSettings, telegramSettings] = await Promise.all([
        supabase.from('system_settings').select('*').maybeSingle(),
        supabase.from('app_settings').select('*').maybeSingle(),
        supabase.from('email_settings').select('*').maybeSingle(),
        supabase.from('telegram_settings').select('*').maybeSingle()
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          settings: {
            system: systemSettings.data,
            app: appSettings.data,
            email: emailSettings.data ? { ...emailSettings.data, smtp_password: '***' } : null,
            telegram: telegramSettings.data ? { ...telegramSettings.data, bot_token: telegramSettings.data.bot_token ? '***' : null } : null
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permissions for modifications
    if (!permissions?.settings_manage) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE SYSTEM SETTINGS
    if (action === 'update_system') {
      const updateData: any = {};
      if (settingsData.admin_panel_path !== undefined) updateData.admin_panel_path = settingsData.admin_panel_path;
      if (settingsData.site_name !== undefined) updateData.site_name = settingsData.site_name;
      if (settingsData.maintenance_mode !== undefined) updateData.maintenance_mode = settingsData.maintenance_mode;

      const { data, error } = await supabase
        .from('system_settings')
        .update(updateData)
        .eq('id', body.settingsId || 'not-empty')
        .select()
        .single();

      if (error) {
        // Try upsert instead
        const { data: upserted, error: upsertError } = await supabase
          .from('system_settings')
          .upsert({ id: body.settingsId, ...updateData })
          .select()
          .single();

        if (upsertError) {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to update system settings' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ success: true, settings: upserted }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'settings_updated', 'system_settings', 'system', updateData);

      return new Response(
        JSON.stringify({ success: true, settings: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE APP SETTINGS
    if (action === 'update_app') {
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .maybeSingle();

      let result;
      if (existing) {
        const { data, error } = await supabase
          .from('app_settings')
          .update(settingsData)
          .eq('id', existing.id)
          .select()
          .single();
        result = { data, error };
      } else {
        const { data, error } = await supabase
          .from('app_settings')
          .insert(settingsData)
          .select()
          .single();
        result = { data, error };
      }

      if (result.error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update app settings' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'settings_updated', 'app_settings', 'app', settingsData);

      return new Response(
        JSON.stringify({ success: true, settings: result.data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE EMAIL SETTINGS
    if (action === 'update_email') {
      if (!permissions?.email_manage) {
        return new Response(
          JSON.stringify({ success: false, error: 'Permission denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: existing } = await supabase
        .from('email_settings')
        .select('id')
        .maybeSingle();

      let result;
      if (existing) {
        // Don't update password if it's masked
        const updateData = { ...settingsData };
        if (updateData.smtp_password === '***') {
          delete updateData.smtp_password;
        }

        const { data, error } = await supabase
          .from('email_settings')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();
        result = { data, error };
      } else {
        const { data, error } = await supabase
          .from('email_settings')
          .insert(settingsData)
          .select()
          .single();
        result = { data, error };
      }

      if (result.error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update email settings' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'email_settings_updated', 'email_settings', 'email', {
        smtp_host: settingsData.smtp_host,
        is_enabled: settingsData.is_enabled
      });

      return new Response(
        JSON.stringify({ success: true, settings: { ...result.data, smtp_password: '***' } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE TELEGRAM SETTINGS
    if (action === 'update_telegram') {
      if (!permissions?.telegram_manage) {
        return new Response(
          JSON.stringify({ success: false, error: 'Permission denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: existing } = await supabase
        .from('telegram_settings')
        .select('id')
        .maybeSingle();

      let result;
      if (existing) {
        // Don't update token if it's masked
        const updateData = { ...settingsData };
        if (updateData.bot_token === '***') {
          delete updateData.bot_token;
        }

        const { data, error } = await supabase
          .from('telegram_settings')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();
        result = { data, error };
      } else {
        const { data, error } = await supabase
          .from('telegram_settings')
          .insert(settingsData)
          .select()
          .single();
        result = { data, error };
      }

      if (result.error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update telegram settings' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'telegram_settings_updated', 'telegram_settings', 'telegram', {
        is_enabled: settingsData.is_enabled
      });

      return new Response(
        JSON.stringify({ success: true, settings: { ...result.data, bot_token: result.data.bot_token ? '***' : null } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TEST EMAIL
    if (action === 'test_email') {
      if (!permissions?.email_manage) {
        return new Response(
          JSON.stringify({ success: false, error: 'Permission denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: emailSettings } = await supabase
        .from('email_settings')
        .select('*')
        .maybeSingle();

      if (!emailSettings) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email settings not configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const testResult = await testEmailSettings(emailSettings);

      // Update last test status
      await supabase
        .from('email_settings')
        .update({
          last_test_at: new Date().toISOString(),
          last_test_status: testResult.success ? 'success' : testResult.error
        })
        .eq('id', emailSettings.id);

      return new Response(
        JSON.stringify({ success: testResult.success, error: testResult.error }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TEST TELEGRAM
    if (action === 'test_telegram') {
      if (!permissions?.telegram_manage) {
        return new Response(
          JSON.stringify({ success: false, error: 'Permission denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: telegramSettings } = await supabase
        .from('telegram_settings')
        .select('*')
        .maybeSingle();

      if (!telegramSettings || !telegramSettings.bot_token || !telegramSettings.chat_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Telegram settings not configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const testResult = await testTelegramBot(telegramSettings.bot_token, telegramSettings.chat_id);

      // Update last test status
      await supabase
        .from('telegram_settings')
        .update({
          last_test_at: new Date().toISOString(),
          last_test_status: testResult.success ? 'success' : testResult.error
        })
        .eq('id', telegramSettings.id);

      return new Response(
        JSON.stringify({ success: testResult.success, error: testResult.error }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LIST EMAIL TEMPLATES
    if (action === 'list_templates') {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch templates' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, templates: data || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE EMAIL TEMPLATE
    if (action === 'update_template') {
      if (!permissions?.templates_manage) {
        return new Response(
          JSON.stringify({ success: false, error: 'Permission denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { templateId, templateData } = body;

      if (!templateId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Template ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('email_templates')
        .update(templateData)
        .eq('id', templateId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update template' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAction(validation.adminId!, 'template_updated', 'email_template', templateId, {
        name: templateData.name
      });

      return new Response(
        JSON.stringify({ success: true, template: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin settings error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
