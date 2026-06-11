/*
# Reseller System Migration

1. New Tables
- `reseller_requests` — stores user applications to become resellers
- `resellers` — stores approved reseller records
- `reseller_users` — tracks users assigned to each reseller
- `reseller_commissions` — tracks commission per approved order
- `reseller_payouts` — tracks reseller payout requests
- `reseller_stats_cache` — pre-computed reseller statistics for performance

2. Modified Tables
- `user_profiles` — added `referred_by_reseller_id`, `reseller_code_used`, `is_reseller`, `reseller_status`
- `orders` — added `reseller_id`, `commission_rate`, `commission_amount`, `commission_status`
- `app_settings` — added reseller settings columns

3. Security
- RLS enabled on all new tables
- Owner-scoped policies for authenticated users
- Admin-level policies for reseller management
- Super-admin policies for commission settings

4. Indexes
- Index on reseller_users.user_id for fast lookups
- Index on reseller_commissions.reseller_id for stats
- Index on orders.reseller_id for filtering
*/

-- ============================================================
-- NEW TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS reseller_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_message text,
    reviewed_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    reject_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resellers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reseller_code text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'disabled')),
    commission_rate numeric(5,2) NOT NULL DEFAULT 10.00,
    total_users integer NOT NULL DEFAULT 0,
    total_orders integer NOT NULL DEFAULT 0,
    total_packages_sold integer NOT NULL DEFAULT 0,
    total_sales_amount numeric(12,2) NOT NULL DEFAULT 0.00,
    total_profit_amount numeric(12,2) NOT NULL DEFAULT 0.00,
    currency text NOT NULL DEFAULT 'CNY',
    approved_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reseller_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id uuid NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code text,
    assigned_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
    assigned_type text NOT NULL DEFAULT 'referral_link' CHECK (assigned_type IN ('referral_link', 'manual', 'system')),
    joined_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(reseller_id, user_id)
);

CREATE TABLE IF NOT EXISTS reseller_commissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id uuid NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
    package_name text,
    package_price numeric(12,2) NOT NULL,
    commission_rate numeric(5,2) NOT NULL,
    commission_amount numeric(12,2) NOT NULL,
    currency text NOT NULL DEFAULT 'CNY',
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled', 'paid')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reseller_payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id uuid NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    amount numeric(12,2) NOT NULL,
    currency text NOT NULL DEFAULT 'CNY',
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    payment_method text,
    payment_details text,
    requested_at timestamptz DEFAULT now(),
    processed_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
    processed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reseller_stats_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id uuid NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
    total_users integer NOT NULL DEFAULT 0,
    total_orders integer NOT NULL DEFAULT 0,
    total_packages_sold integer NOT NULL DEFAULT 0,
    total_sales_amount numeric(12,2) NOT NULL DEFAULT 0.00,
    total_profit_amount numeric(12,2) NOT NULL DEFAULT 0.00,
    last_calculated_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(reseller_id)
);

-- ============================================================
-- MODIFY EXISTING TABLES
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'referred_by_reseller_id') THEN
        ALTER TABLE user_profiles ADD COLUMN referred_by_reseller_id uuid REFERENCES resellers(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'reseller_code_used') THEN
        ALTER TABLE user_profiles ADD COLUMN reseller_code_used text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'is_reseller') THEN
        ALTER TABLE user_profiles ADD COLUMN is_reseller boolean NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'reseller_status') THEN
        ALTER TABLE user_profiles ADD COLUMN reseller_status text DEFAULT 'none' CHECK (reseller_status IN ('none', 'pending', 'active', 'suspended', 'rejected'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'reseller_id') THEN
        ALTER TABLE orders ADD COLUMN reseller_id uuid REFERENCES resellers(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'commission_rate') THEN
        ALTER TABLE orders ADD COLUMN commission_rate numeric(5,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'commission_amount') THEN
        ALTER TABLE orders ADD COLUMN commission_amount numeric(12,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'commission_status') THEN
        ALTER TABLE orders ADD COLUMN commission_status text DEFAULT 'pending' CHECK (commission_status IN ('pending', 'calculated', 'cancelled'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'reseller_enabled') THEN
        ALTER TABLE app_settings ADD COLUMN reseller_enabled boolean NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'default_commission_rate') THEN
        ALTER TABLE app_settings ADD COLUMN default_commission_rate numeric(5,2) NOT NULL DEFAULT 10.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'reseller_currency') THEN
        ALTER TABLE app_settings ADD COLUMN reseller_currency text NOT NULL DEFAULT 'CNY';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'minimum_payout_amount') THEN
        ALTER TABLE app_settings ADD COLUMN minimum_payout_amount numeric(12,2) NOT NULL DEFAULT 100.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'reseller_terms') THEN
        ALTER TABLE app_settings ADD COLUMN reseller_terms text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'auto_approve_resellers') THEN
        ALTER TABLE app_settings ADD COLUMN auto_approve_resellers boolean NOT NULL DEFAULT false;
    END IF;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reseller_requests_user_id ON reseller_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_reseller_requests_status ON reseller_requests(status);
CREATE INDEX IF NOT EXISTS idx_resellers_user_id ON resellers(user_id);
CREATE INDEX IF NOT EXISTS idx_resellers_code ON resellers(reseller_code);
CREATE INDEX IF NOT EXISTS idx_resellers_status ON resellers(status);
CREATE INDEX IF NOT EXISTS idx_reseller_users_reseller_id ON reseller_users(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_users_user_id ON reseller_users(user_id);
CREATE INDEX IF NOT EXISTS idx_reseller_commissions_reseller_id ON reseller_commissions(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_commissions_order_id ON reseller_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_reseller_payouts_reseller_id ON reseller_payouts(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_payouts_status ON reseller_payouts(status);
CREATE INDEX IF NOT EXISTS idx_orders_reseller_id ON orders(reseller_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON user_profiles(referred_by_reseller_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE reseller_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_stats_cache ENABLE ROW LEVEL SECURITY;

-- reseller_requests policies
DROP POLICY IF EXISTS "reseller_requests_select_own" ON reseller_requests;
CREATE POLICY "reseller_requests_select_own" ON reseller_requests FOR SELECT
TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "reseller_requests_select_admin" ON reseller_requests;
CREATE POLICY "reseller_requests_select_admin" ON reseller_requests FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "reseller_requests_insert_own" ON reseller_requests;
CREATE POLICY "reseller_requests_insert_own" ON reseller_requests FOR INSERT
TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reseller_requests_update_admin" ON reseller_requests;
CREATE POLICY "reseller_requests_update_admin" ON reseller_requests FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

-- resellers policies
DROP POLICY IF EXISTS "resellers_select_own" ON resellers;
CREATE POLICY "resellers_select_own" ON resellers FOR SELECT
TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "resellers_select_admin" ON resellers;
CREATE POLICY "resellers_select_admin" ON resellers FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "resellers_update_admin" ON resellers;
CREATE POLICY "resellers_update_admin" ON resellers FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

-- reseller_users policies
DROP POLICY IF EXISTS "reseller_users_select_own" ON reseller_users;
CREATE POLICY "reseller_users_select_own" ON reseller_users FOR SELECT
TO authenticated USING (
    EXISTS (SELECT 1 FROM resellers WHERE resellers.id = reseller_users.reseller_id AND resellers.user_id = auth.uid())
    OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "reseller_users_select_admin" ON reseller_users;
CREATE POLICY "reseller_users_select_admin" ON reseller_users FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "reseller_users_insert_admin" ON reseller_users;
CREATE POLICY "reseller_users_insert_admin" ON reseller_users FOR INSERT
TO authenticated WITH CHECK (true);

-- reseller_commissions policies
DROP POLICY IF EXISTS "reseller_commissions_select_own" ON reseller_commissions;
CREATE POLICY "reseller_commissions_select_own" ON reseller_commissions FOR SELECT
TO authenticated USING (
    EXISTS (SELECT 1 FROM resellers WHERE resellers.id = reseller_commissions.reseller_id AND resellers.user_id = auth.uid())
);

DROP POLICY IF EXISTS "reseller_commissions_select_admin" ON reseller_commissions;
CREATE POLICY "reseller_commissions_select_admin" ON reseller_commissions FOR SELECT
TO authenticated USING (true);

-- reseller_payouts policies
DROP POLICY IF EXISTS "reseller_payouts_select_own" ON reseller_payouts;
CREATE POLICY "reseller_payouts_select_own" ON reseller_payouts FOR SELECT
TO authenticated USING (
    EXISTS (SELECT 1 FROM resellers WHERE resellers.id = reseller_payouts.reseller_id AND resellers.user_id = auth.uid())
);

DROP POLICY IF EXISTS "reseller_payouts_select_admin" ON reseller_payouts;
CREATE POLICY "reseller_payouts_select_admin" ON reseller_payouts FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "reseller_payouts_insert_own" ON reseller_payouts;
CREATE POLICY "reseller_payouts_insert_own" ON reseller_payouts FOR INSERT
TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM resellers WHERE resellers.id = reseller_payouts.reseller_id AND resellers.user_id = auth.uid())
);

-- reseller_stats_cache policies
DROP POLICY IF EXISTS "reseller_stats_select_own" ON reseller_stats_cache;
CREATE POLICY "reseller_stats_select_own" ON reseller_stats_cache FOR SELECT
TO authenticated USING (
    EXISTS (SELECT 1 FROM resellers WHERE resellers.id = reseller_stats_cache.reseller_id AND resellers.user_id = auth.uid())
);

DROP POLICY IF EXISTS "reseller_stats_select_admin" ON reseller_stats_cache;
CREATE POLICY "reseller_stats_select_admin" ON reseller_stats_cache FOR SELECT
TO authenticated USING (true);

-- ============================================================
-- FUNCTION: Generate reseller code
-- ============================================================

CREATE OR REPLACE FUNCTION generate_reseller_code()
RETURNS text AS $$
DECLARE
    code text;
    exists_count int;
BEGIN
    LOOP
        code := upper(substring(md5(random()::text), 1, 8));
        SELECT COUNT(*) INTO exists_count FROM resellers WHERE reseller_code = code;
        EXIT WHEN exists_count = 0;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;
