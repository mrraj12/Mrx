/*
  # Admin Analytics Access System

  1. Security Changes
    - Remove public access to analytics tables
    - Create admin-only access policies
    - Add admin role management

  2. Admin Role System
    - `admin_users` table for managing admin access
    - Only admins can view analytics data
    - Service role maintains full access for system operations

  3. Analytics Tables Security
    - All analytics tables restricted to admin users only
    - Regular users cannot access any analytics data
    - Analytics data collection continues in background
*/

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users policies
CREATE POLICY "Only service role can manage admin users"
  ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update visitor_sessions policies - remove authenticated access
DROP POLICY IF EXISTS "Authenticated users can read visitor sessions" ON visitor_sessions;

CREATE POLICY "Only service role can access visitor sessions"
  ON visitor_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update page_views policies - remove authenticated access  
DROP POLICY IF EXISTS "Authenticated users can read page views" ON page_views;

CREATE POLICY "Only service role can access page views"
  ON page_views
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update visitor_events policies - remove authenticated access
DROP POLICY IF EXISTS "Authenticated users can read visitor events" ON visitor_events;

CREATE POLICY "Only service role can access visitor events"
  ON visitor_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update device_fingerprints policies - remove authenticated access
DROP POLICY IF EXISTS "Authenticated users can read device fingerprints" ON device_fingerprints;

CREATE POLICY "Only service role can access device fingerprints"
  ON device_fingerprints
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create analytics access function for admin verification
CREATE OR REPLACE FUNCTION is_admin_user(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM admin_users au
    JOIN auth.users u ON au.user_id = u.id
    WHERE u.email = user_email 
    AND au.is_active = true
  );
END;
$$;

-- Create secure analytics view function (only accessible via service role)
CREATE OR REPLACE FUNCTION get_analytics_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- This function can only be called by service role
  -- It returns aggregated analytics data without exposing individual records
  
  SELECT json_build_object(
    'total_visitors', (SELECT COUNT(*) FROM visitor_sessions),
    'total_page_views', (SELECT COUNT(*) FROM page_views),
    'total_events', (SELECT COUNT(*) FROM visitor_events),
    'unique_countries', (SELECT COUNT(DISTINCT country) FROM visitor_sessions WHERE country IS NOT NULL),
    'mobile_percentage', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE is_mobile = true) * 100.0) / NULLIF(COUNT(*), 0), 
        2
      ) 
      FROM visitor_sessions
    ),
    'top_countries', (
      SELECT json_agg(
        json_build_object('country', country, 'count', count)
      )
      FROM (
        SELECT country, COUNT(*) as count
        FROM visitor_sessions 
        WHERE country IS NOT NULL
        GROUP BY country
        ORDER BY count DESC
        LIMIT 10
      ) t
    ),
    'device_breakdown', (
      SELECT json_agg(
        json_build_object('device_type', device_type, 'count', count)
      )
      FROM (
        SELECT device_type, COUNT(*) as count
        FROM visitor_sessions
        GROUP BY device_type
        ORDER BY count DESC
      ) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission only to service role
REVOKE ALL ON FUNCTION get_analytics_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_analytics_summary() TO service_role;

-- Create indexes for better performance on analytics queries
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_created_at ON visitor_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_country ON visitor_sessions(country);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_device_type ON visitor_sessions(device_type);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_events_created_at ON visitor_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_events_event_type ON visitor_events(event_type);

-- Add comment explaining the security model
COMMENT ON TABLE visitor_sessions IS 'Visitor analytics data - accessible only via service role for admin dashboard';
COMMENT ON TABLE page_views IS 'Page view analytics - accessible only via service role for admin dashboard';
COMMENT ON TABLE visitor_events IS 'User event analytics - accessible only via service role for admin dashboard';
COMMENT ON TABLE device_fingerprints IS 'Device fingerprint data - accessible only via service role for admin dashboard';
COMMENT ON TABLE admin_users IS 'Admin user management - controls who can access analytics via external admin panel';