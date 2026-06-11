/*
  # Update Payment Methods

  1. Changes
    - Remove WhatsApp payment method
    - Update PayPal to Alipay
    - Keep WeChat Pay active

  2. Security
    - Maintains existing RLS policies
*/

-- Update PayPal to Alipay
UPDATE payment_methods 
SET name = 'Alipay', 
    account_info = 'Scan QR code to pay with Alipay'
WHERE name = 'PayPal';

-- Remove WhatsApp payment method
UPDATE payment_methods 
SET is_active = false 
WHERE name = 'WhatsApp';

-- Insert Alipay if PayPal doesn't exist
INSERT INTO payment_methods (name, qr_code_url, account_info, is_active)
SELECT 'Alipay', 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', 'Scan QR code to pay with Alipay', true
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'Alipay');

-- Ensure WeChat Pay exists and is active
INSERT INTO payment_methods (name, qr_code_url, account_info, is_active)
SELECT 'WeChat Pay', 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', 'Scan QR code to pay with WeChat Pay', true
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'WeChat Pay');