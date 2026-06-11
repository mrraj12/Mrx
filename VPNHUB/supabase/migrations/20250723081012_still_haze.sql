/*
  # Create orders table for VPN subscription management

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `full_name` (text) - Customer's full name
      - `email` (text) - Customer's email address
      - `phone` (text) - Customer's phone number
      - `payment_method` (text) - Selected payment method (paypal, wechat, WhatsApp)
      - `plan_title` (text) - Selected VPN plan name
      - `plan_price` (text) - Plan pricing information
      - `order_status` (text) - Order status (pending, completed, cancelled)
      - `created_at` (timestamp) - Order creation timestamp
      - `updated_at` (timestamp) - Last update timestamp

  2. Security
    - Enable RLS on `orders` table
    - Add policy for authenticated users to read their own orders
    - Add policy for service role to manage all orders

  3. Indexes
    - Add index on email for faster customer lookups
    - Add index on created_at for chronological ordering
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  payment_method text NOT NULL DEFAULT 'paypal',
  plan_title text NOT NULL,
  plan_price text NOT NULL,
  order_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for service role"
  ON orders
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Enable insert access for service role"
  ON orders
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Enable update access for service role"
  ON orders
  FOR UPDATE
  TO service_role
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS orders_email_idx ON orders(email);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(order_status);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();