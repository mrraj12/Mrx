/*
# Admin Sessions System

Creates a dedicated table for admin sessions with proper token management,
security features, and session tracking capabilities.

Changes:
1. New `admin_sessions` table with proper schema
2. Indexes for fast token lookups
3. RLS policies for session security
4. Automatic cleanup function for expired sessions
5. Migration of existing sessions from admin_logs (if needed)
*/

-- ============================================================
-- ADMIN SESSIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  ip_address text,
  user_agent text,
  device_info jsonb DEFAULT '{}',
  last_activity_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE admin_sessions IS 'Active admin sessions with secure token storage';

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin_sessions(is_active) WHERE is_active = true;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Admins can view their own sessions
CREATE POLICY "admins_view_own_sessions" ON admin_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = admin_sessions.admin_id
      AND admin_users.username = auth.jwt() ->> 'email'
    )
    OR auth.role() = 'service_role'
  );

-- Service role can manage all sessions (for edge functions)
CREATE POLICY "service_role_all_sessions" ON admin_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- CLEANUP FUNCTION FOR EXPIRED SESSIONS
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_expired_admin_sessions()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM admin_sessions WHERE expires_at < now() AND is_active = false;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- UPDATE ADMIN_LOGS TO REFERENCE SESSIONS (OPTIONAL)
-- ============================================================

-- Add session_id column to admin_logs for linking actions to sessions
ALTER TABLE admin_logs ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES admin_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admin_logs_session_id ON admin_logs(session_id);

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON admin_sessions TO service_role;
GRANT SELECT ON admin_sessions TO authenticated;