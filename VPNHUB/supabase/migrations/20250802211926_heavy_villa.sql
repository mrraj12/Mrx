/*
  # Fix Analytics Data Saving Issues

  1. Security Updates
    - Update RLS policies for all analytics tables to allow anonymous inserts
    - Ensure proper permissions for data collection
    - Fix any policy conflicts

  2. Table Updates
    - Ensure all analytics tables have correct RLS settings
    - Add missing policies for anonymous data collection
    - Update existing policies to be more permissive for analytics

  3. Data Collection
    - Enable real-time visitor tracking for anonymous users
    - Allow insertion of session, event, and fingerprint data
    - Maintain security while enabling analytics
*/

-- Drop existing restrictive policies and recreate with proper permissions
DROP POLICY IF EXISTS "Allow anonymous insert for visitor sessions" ON visitor_sessions;
DROP POLICY IF EXISTS "Allow anonymous insert for page views" ON page_views;
DROP POLICY IF EXISTS "Allow anonymous insert for visitor events" ON visitor_events;
DROP POLICY IF EXISTS "Allow anonymous insert for device fingerprints" ON device_fingerprints;

-- Visitor Sessions - Allow anonymous inserts
CREATE POLICY "Enable anonymous insert for visitor sessions"
  ON visitor_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Enable authenticated insert for visitor sessions"
  ON visitor_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Page Views - Allow anonymous inserts
CREATE POLICY "Enable anonymous insert for page views"
  ON page_views
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Enable authenticated insert for page views"
  ON page_views
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Visitor Events - Allow anonymous inserts
CREATE POLICY "Enable anonymous insert for visitor events"
  ON visitor_events
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Enable authenticated insert for visitor events"
  ON visitor_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Device Fingerprints - Allow anonymous inserts
CREATE POLICY "Enable anonymous insert for device fingerprints"
  ON device_fingerprints
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Enable authenticated insert for device fingerprints"
  ON device_fingerprints
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ensure all analytics tables have RLS enabled
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to anon role
GRANT INSERT ON visitor_sessions TO anon;
GRANT INSERT ON page_views TO anon;
GRANT INSERT ON visitor_events TO anon;
GRANT INSERT ON device_fingerprints TO anon;

-- Grant necessary permissions to authenticated role
GRANT INSERT ON visitor_sessions TO authenticated;
GRANT INSERT ON page_views TO authenticated;
GRANT INSERT ON visitor_events TO authenticated;
GRANT INSERT ON device_fingerprints TO authenticated;