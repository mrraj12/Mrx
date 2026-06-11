/*
  # Complete VPN Subscription Management System

  1. Base Tables (from original migrations)
    - `orders` - Customer orders
    - `user_profiles` - Extended user info
    - `payment_methods` - Payment options
    - `payment_screenshots` - Payment proof uploads

  2. New Tables
    - `system_settings` - Dynamic configuration
    - `admin_users` - Admin authentication and roles
    - `admin_logs` - Audit trail
    - `packages` - VPN subscription plans
    - `vpn_panels` - 3X-UI panel configuration (server-side only)
    - `vpn_nodes` - VPN server nodes
    - `vpn_clients` - User VPN subscriptions

  3. Security
    - Enable RLS on all tables
    - Create policies for proper access control
*/

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_panel_path text NOT NULL DEFAULT 'admin',
  site_name text DEFAULT 'VPNHUB',
  maintenance_mode boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  two_factor_enabled boolean DEFAULT false,
  two_factor_secret text,
  is_active boolean DEFAULT true,
  last_login_at timestamptz,
  last_login_ip text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create packages table
CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  total_gb integer NOT NULL,
  duration_days integer NOT NULL,
  device_limit integer NOT NULL DEFAULT 1,
  price decimal(10,2) NOT NULL,
  currency text DEFAULT 'CNY',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  payment_method text NOT NULL DEFAULT 'alipay',
  plan_title text NOT NULL,
  plan_price text NOT NULL,
  order_status text NOT NULL DEFAULT 'pending',
  package_id uuid REFERENCES packages(id),
  vpn_client_id uuid,
  payment_screenshot_url text,
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES admin_users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  qr_code_url text NOT NULL,
  account_info text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create payment_screenshots table
CREATE TABLE IF NOT EXISTS payment_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  screenshot_url text NOT NULL,
  payment_method_id uuid REFERENCES payment_methods(id),
  verification_status text DEFAULT 'pending',
  verified_at timestamptz,
  verified_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Create vpn_panels table (credentials stored here - NEVER exposed to frontend)
CREATE TABLE IF NOT EXISTS vpn_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  panel_url text NOT NULL,
  username text NOT NULL,
  password text NOT NULL,
  version text DEFAULT '3X-UI',
  subscription_path text DEFAULT 'sub',
  login_session text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vpn_nodes table
CREATE TABLE IF NOT EXISTS vpn_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id uuid REFERENCES vpn_panels(id) ON DELETE CASCADE,
  inbound_id integer NOT NULL,
  country text NOT NULL,
  city text,
  node_name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create vpn_clients table
CREATE TABLE IF NOT EXISTS vpn_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  node_id uuid REFERENCES vpn_nodes(id) ON DELETE SET NULL,
  client_uuid text UNIQUE NOT NULL,
  email text NOT NULL,
  subscription_url text,
  total_gb integer NOT NULL,
  used_gb decimal(10,3) DEFAULT 0,
  remaining_gb decimal(10,3),
  device_limit integer NOT NULL DEFAULT 1,
  expire_date timestamptz NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'deleted')),
  inbound_id integer,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE vpn_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE vpn_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vpn_clients ENABLE ROW LEVEL SECURITY;

-- System settings policies
CREATE POLICY "Public can read system settings"
  ON system_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can manage system settings"
  ON system_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin users policies (server-side only)
CREATE POLICY "Only service role can manage admin users"
  ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin logs policies (server-side only)
CREATE POLICY "Only service role can manage admin logs"
  ON admin_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Packages policies
CREATE POLICY "Public can read active packages"
  ON packages
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Service role can manage packages"
  ON packages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Orders policies
CREATE POLICY "Users can read own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all orders"
  ON orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- User profiles policies
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage profiles"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Payment methods policies
CREATE POLICY "Public can read active payment methods"
  ON payment_methods
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Service role can manage payment methods"
  ON payment_methods
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Payment screenshots policies
CREATE POLICY "Users can read own screenshots"
  ON payment_screenshots
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own screenshots"
  ON payment_screenshots
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage screenshots"
  ON payment_screenshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- VPN panels policies (NEVER accessible from frontend)
CREATE POLICY "Only service role can access vpn panels"
  ON vpn_panels
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- VPN nodes policies
CREATE POLICY "Public can read active vpn nodes"
  ON vpn_nodes
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Service role can manage vpn nodes"
  ON vpn_nodes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- VPN clients policies
CREATE POLICY "Users can read own vpn clients"
  ON vpn_clients
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage vpn clients"
  ON vpn_clients
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);

CREATE INDEX IF NOT EXISTS idx_packages_active ON packages(is_active);
CREATE INDEX IF NOT EXISTS idx_packages_display_order ON packages(display_order);

CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_package_id ON orders(package_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vpn_clients_user_id ON vpn_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_vpn_clients_status ON vpn_clients(status);
CREATE INDEX IF NOT EXISTS idx_vpn_clients_expire_date ON vpn_clients(expire_date);

CREATE INDEX IF NOT EXISTS idx_vpn_nodes_panel_id ON vpn_nodes(panel_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Insert default system settings
INSERT INTO system_settings (admin_panel_path, site_name) VALUES ('admin', 'VPNHUB') ON CONFLICT DO NOTHING;

-- Insert default packages
INSERT INTO packages (name, description, total_gb, duration_days, device_limit, price, display_order) VALUES
('Starter Plan', 'Perfect for casual browsing and basic privacy protection', 100, 30, 1, 20.00, 1),
('Basic Plan', 'Great balance of data and duration for regular users', 300, 90, 3, 50.00, 2),
('Premium Plan', 'Ideal for heavy users and streaming enthusiasts', 500, 180, 5, 90.00, 3),
('Ultimate Plan', 'Maximum data for power users and businesses', 1000, 365, 10, 160.00, 4);

-- Insert default payment methods
INSERT INTO payment_methods (name, qr_code_url, account_info) VALUES
('Alipay', 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', 'Scan QR code to pay with Alipay'),
('WeChat Pay', 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', 'Scan QR code to pay with WeChat Pay');

-- Create default admin user (password: admin123 - should be changed immediately)
INSERT INTO admin_users (username, password_hash, role) VALUES
('admin', '$2a$10$YourHashedPasswordHere', 'super_admin') ON CONFLICT DO NOTHING;

-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', false) ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload payment screenshots"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own payment screenshots"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Service role can manage all payment screenshots"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'payment-screenshots');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vpn_panels_updated_at
  BEFORE UPDATE ON vpn_panels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vpn_clients_updated_at
  BEFORE UPDATE ON vpn_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to get admin path
CREATE OR REPLACE FUNCTION get_admin_panel_path()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  path text;
BEGIN
  SELECT admin_panel_path INTO path FROM system_settings LIMIT 1;
  RETURN COALESCE(path, 'admin');
END;
$$;

COMMENT ON TABLE vpn_panels IS 'VPN panel credentials - NEVER expose to frontend';
COMMENT ON TABLE admin_users IS 'Admin authentication - accessed only via service role';
COMMENT ON TABLE admin_logs IS 'Audit log for admin actions';