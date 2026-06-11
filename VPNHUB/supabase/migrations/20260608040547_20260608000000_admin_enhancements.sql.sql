/*
  # Admin System Enhancements
  
  New Tables:
  - email_settings: SMTP configuration for sending emails
  - email_templates: Customizable email templates
  - telegram_settings: Telegram bot configuration
  - app_settings: Extended application settings
  - notification_queue: Scheduled email/telegram notifications
  
  Extended Columns:
  - admin_users: permissions JSON field for granular access control
  - user_profiles: email_verified, phone_verified, is_suspended, last_login_at, login_count
*/

-- Create email_settings table
CREATE TABLE IF NOT EXISTS email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host text NOT NULL DEFAULT 'smtp.gmail.com',
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_username text,
  smtp_password text,
  from_name text NOT NULL DEFAULT 'VPNHUB',
  from_email text NOT NULL DEFAULT 'noreply@vpnhub.com',
  encryption text DEFAULT 'tls' CHECK (encryption IN ('none', 'ssl', 'tls')),
  is_enabled boolean DEFAULT false,
  last_test_at timestamptz,
  last_test_status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  template_type text NOT NULL CHECK (template_type IN (
    'welcome', 
    'order_received', 
    'order_approved', 
    'order_rejected', 
    'subscription_created',
    'subscription_expiring',
    'subscription_expired',
    'password_reset',
    'custom'
  )),
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  variables text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create telegram_settings table
CREATE TABLE IF NOT EXISTS telegram_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_token text,
  chat_id text,
  is_enabled boolean DEFAULT false,
  notify_new_orders boolean DEFAULT true,
  notify_order_approved boolean DEFAULT true,
  notify_order_rejected boolean DEFAULT true,
  notify_subscription_expired boolean DEFAULT true,
  notify_daily_stats boolean DEFAULT false,
  last_test_at timestamptz,
  last_test_status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create app_settings table (extends system_settings)
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_description text,
  logo_url text,
  favicon_url text,
  default_currency text DEFAULT 'CNY',
  currency_symbol text DEFAULT '¥',
  timezone text DEFAULT 'Asia/Shanghai',
  contact_email text,
  support_url text,
  tutorial_url text,
  subscription_path_format text DEFAULT 'sub/{client_uuid}',
  node_selection_mode text DEFAULT 'auto' CHECK (node_selection_mode IN ('auto', 'manual', 'load_balanced')),
  default_node_id uuid,
  session_timeout_minutes integer DEFAULT 60,
  require_2fa boolean DEFAULT false,
  ip_whitelist text[],
  maintenance_message text,
  registration_enabled boolean DEFAULT true,
  max_devices_per_user integer DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notification_queue table
CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL CHECK (notification_type IN ('email', 'telegram')),
  recipient text NOT NULL,
  subject text,
  content text NOT NULL,
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  template_data jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  error_message text,
  scheduled_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  created_at timestamptz DEFAULT now()
);

-- Add permissions column to admin_users
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{
  "orders_view": true,
  "orders_approve": true,
  "orders_reject": true,
  "clients_view": true,
  "clients_manage": true,
  "packages_manage": true,
  "users_view": true,
  "users_manage": true,
  "nodes_view": true,
  "nodes_manage": true,
  "settings_manage": true,
  "templates_manage": true,
  "logs_view": true,
  "payment_methods_manage": true,
  "email_manage": true,
  "telegram_manage": true
}'::jsonb;

-- Add new columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS suspension_reason text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS login_count integer DEFAULT 0;

-- Add review columns to vpn_panels
ALTER TABLE vpn_panels ADD COLUMN IF NOT EXISTS max_clients integer DEFAULT 100;
ALTER TABLE vpn_panels ADD COLUMN IF NOT EXISTS current_clients integer DEFAULT 0;
ALTER TABLE vpn_panels ADD COLUMN IF NOT EXISTS total_traffic_gb decimal(12,3) DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_settings (admin only)
CREATE POLICY "Only service role can manage email settings"
  ON email_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for email_templates (admin only)
CREATE POLICY "Only service role can manage email templates"
  ON email_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for telegram_settings (admin only)
CREATE POLICY "Only service role can manage telegram settings"
  ON telegram_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for app_settings (admin only)
CREATE POLICY "Only service role can manage app settings"
  ON app_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for notification_queue (admin only)
CREATE POLICY "Only service role can manage notification queue"
  ON notification_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_suspended ON user_profiles(is_suspended);

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_email_settings_updated_at
  BEFORE UPDATE ON email_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_telegram_settings_updated_at
  BEFORE UPDATE ON telegram_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default email templates
INSERT INTO email_templates (name, template_type, subject, body_html, body_text, variables) VALUES
('Welcome Email', 'welcome', 'Welcome to {{site_name}}!', 
 '<h2>Welcome to {{site_name}}!</h2><p>Dear {{customer_name}},</p><p>Thank you for registering with us. Your account has been created successfully.</p><p>Best regards,<br>{{site_name}} Team</p>',
 'Welcome to {{site_name}}! Dear {{customer_name}}, Thank you for registering with us. Your account has been created successfully. Best regards, {{site_name}} Team',
 ARRAY['site_name', 'customer_name']),

('Order Received', 'order_received', 'Your order #{{order_id}} has been received',
 '<h2>Order Received</h2><p>Dear {{customer_name}},</p><p>We have received your order for <strong>{{package_name}}</strong>.</p><p>Order ID: {{order_id}}<br>Amount: {{order_amount}}</p><p>We will review your payment and approve your subscription shortly.</p><p>Best regards,<br>{{site_name}} Team</p>',
 'Order Received. Dear {{customer_name}}, We have received your order for {{package_name}}. Order ID: {{order_id}}, Amount: {{order_amount}}. We will review your payment and approve your subscription shortly.',
 ARRAY['site_name', 'customer_name', 'order_id', 'package_name', 'order_amount']),

('Order Approved', 'order_approved', 'Your order #{{order_id}} has been approved!',
 '<h2>Order Approved!</h2><p>Dear {{customer_name}},</p><p>Great news! Your order has been approved and your VPN subscription is now active.</p><p><strong>Package:</strong> {{package_name}}<br><strong>Data Limit:</strong> {{total_gb}} GB<br><strong>Valid Until:</strong> {{expire_date}}<br><strong>Devices:</strong> {{device_limit}}</p><p><a href="{{subscription_url}}">Download Your Subscription</a></p><p>Best regards,<br>{{site_name}} Team</p>',
 'Order Approved! Dear {{customer_name}}, Great news! Your order has been approved. Package: {{package_name}}, Data: {{total_gb}} GB, Valid Until: {{expire_date}}, Devices: {{device_limit}}. Subscription URL: {{subscription_url}}',
 ARRAY['site_name', 'customer_name', 'order_id', 'package_name', 'total_gb', 'expire_date', 'device_limit', 'subscription_url']),

('Order Rejected', 'order_rejected', 'Your order #{{order_id}} - Action Required',
 '<h2>Order Update</h2><p>Dear {{customer_name}},</p><p>We regret to inform you that your order could not be approved.</p><p><strong>Reason:</strong> {{rejection_reason}}</p><p>If you believe this was an error, please contact our support team.</p><p>Best regards,<br>{{site_name}} Team</p>',
 'Order Update. Dear {{customer_name}}, We regret to inform you that your order could not be approved. Reason: {{rejection_reason}}. If you believe this was an error, please contact our support team.',
 ARRAY['site_name', 'customer_name', 'order_id', 'rejection_reason']),

('Subscription Expiring', 'subscription_expiring', 'Your subscription expires in {{days_remaining}} days',
 '<h2>Subscription Expiring Soon</h2><p>Dear {{customer_name}},</p><p>Your VPN subscription will expire in <strong>{{days_remaining}} days</strong>.</p><p><strong>Current Package:</strong> {{package_name}}<br><strong>Expiry Date:</strong> {{expire_date}}</p><p>Renew now to continue enjoying uninterrupted service.</p><p>Best regards,<br>{{site_name}} Team</p>',
 'Subscription Expiring Soon. Dear {{customer_name}}, Your VPN subscription will expire in {{days_remaining}} days. Current Package: {{package_name}}, Expiry Date: {{expire_date}}. Renew now to continue enjoying uninterrupted service.',
 ARRAY['site_name', 'customer_name', 'days_remaining', 'package_name', 'expire_date']),

('Subscription Expired', 'subscription_expired', 'Your subscription has expired',
 '<h2>Subscription Expired</h2><p>Dear {{customer_name}},</p><p>Your VPN subscription has expired.</p><p><strong>Package:</strong> {{package_name}}<br><strong>Expired On:</strong> {{expire_date}}</p><p>Purchase a new package to continue using our VPN service.</p><p>Best regards,<br>{{site_name}} Team</p>',
 'Subscription Expired. Dear {{customer_name}}, Your VPN subscription has expired. Package: {{package_name}}, Expired On: {{expire_date}}. Purchase a new package to continue using our VPN service.',
 ARRAY['site_name', 'customer_name', 'package_name', 'expire_date'])
ON CONFLICT (name) DO NOTHING;

-- Insert default email settings
INSERT INTO email_settings (smtp_host, smtp_port, from_name, from_email, encryption) VALUES
('smtp.gmail.com', 587, 'VPNHUB', 'noreply@vpnhub.com', 'tls')
ON CONFLICT DO NOTHING;

-- Insert default telegram settings
INSERT INTO telegram_settings (is_enabled) VALUES (false)
ON CONFLICT DO NOTHING;

-- Insert default app settings
INSERT INTO app_settings (
  site_description, 
  default_currency, 
  currency_symbol, 
  timezone,
  registration_enabled,
  max_devices_per_user
) VALUES (
  'Premium VPN service with global coverage',
  'CNY',
  '¥',
  'Asia/Shanghai',
  true,
  5
)
ON CONFLICT DO NOTHING;

-- Create storage bucket for QR codes and logos
INSERT INTO storage.buckets (id, name, public) VALUES ('admin-assets', 'admin-assets', true) ON CONFLICT DO NOTHING;

-- Storage policies for admin assets
CREATE POLICY "Public can read admin assets"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'admin-assets');

CREATE POLICY "Service role can manage admin assets"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'admin-assets');

COMMENT ON TABLE email_settings IS 'SMTP configuration for sending emails';
COMMENT ON TABLE email_templates IS 'Customizable email notification templates';
COMMENT ON TABLE telegram_settings IS 'Telegram bot configuration for notifications';
COMMENT ON TABLE app_settings IS 'Extended application settings';
COMMENT ON TABLE notification_queue IS 'Queue for scheduled email/telegram notifications';