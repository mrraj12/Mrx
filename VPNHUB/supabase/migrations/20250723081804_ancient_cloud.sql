/*
  # Authentication and Payment System Setup

  1. New Tables
    - `user_profiles` - Extended user information
    - `payment_methods` - Available payment methods with QR codes
    - `payment_screenshots` - User uploaded payment proofs
    - Updated `orders` table with user authentication

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access only their own data
    - Service role policies for payment verification

  3. Storage
    - Create bucket for payment screenshots
    - Set up proper access policies
*/

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  qr_code_url text NOT NULL,
  account_info text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create payment screenshots table
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

-- Update orders table to include user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_screenshots ENABLE ROW LEVEL SECURITY;

-- Update orders RLS (already enabled)
DROP POLICY IF EXISTS "Enable insert access for service role" ON orders;
DROP POLICY IF EXISTS "Enable read access for service role" ON orders;
DROP POLICY IF EXISTS "Enable update access for service role" ON orders;

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
  USING (auth.uid() = user_id);

-- Payment methods policies (public read)
CREATE POLICY "Anyone can read active payment methods"
  ON payment_methods
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Service role can manage payment methods"
  ON payment_methods
  FOR ALL
  TO service_role
  USING (true);

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
  USING (true);

-- Orders policies (user-specific)
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

CREATE POLICY "Service role can manage all orders"
  ON orders
  FOR ALL
  TO service_role
  USING (true);

-- Insert default payment methods
INSERT INTO payment_methods (name, qr_code_url, account_info) VALUES
('PayPal', 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=400', 'PayPal: vpnservice@example.com'),
('WeChat Pay', 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=400', 'WeChat ID: VPNService2025'),
('WhatsApp Pay', 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=400', 'WhatsApp: +1-555-VPN-SERV')
ON CONFLICT DO NOTHING;

-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT DO NOTHING;

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

-- Create trigger for updating user_profiles updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();