/*
  # Fix Analytics RLS Policies

  1. Security Changes
    - Allow anonymous users to insert data into analytics tables
    - Enable proper tracking for visitor sessions, page views, events, and device fingerprints
    - Maintain security while allowing analytics collection

  2. Tables Updated
    - `visitor_sessions` - Allow anon INSERT
    - `page_views` - Allow anon INSERT  
    - `visitor_events` - Allow anon INSERT
    - `device_fingerprints` - Allow anon INSERT
*/

-- Allow anonymous users to insert visitor sessions
CREATE POLICY "Allow anonymous insert for visitor sessions"
  ON visitor_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to insert page views
CREATE POLICY "Allow anonymous insert for page views"
  ON page_views
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to insert visitor events
CREATE POLICY "Allow anonymous insert for visitor events"
  ON visitor_events
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to insert device fingerprints
CREATE POLICY "Allow anonymous insert for device fingerprints"
  ON device_fingerprints
  FOR INSERT
  TO anon
  WITH CHECK (true);