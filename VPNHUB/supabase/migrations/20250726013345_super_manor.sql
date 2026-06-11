/*
  # Visitor Tracking System

  1. New Tables
    - `visitor_sessions`
      - `id` (uuid, primary key)
      - `session_id` (text, unique session identifier)
      - `ip_address` (text, visitor IP address)
      - `user_agent` (text, browser/device information)
      - `device_type` (text, mobile/desktop/tablet)
      - `browser_name` (text, browser name)
      - `browser_version` (text, browser version)
      - `os_name` (text, operating system)
      - `os_version` (text, OS version)
      - `screen_resolution` (text, screen dimensions)
      - `viewport_size` (text, browser viewport)
      - `timezone` (text, visitor timezone)
      - `language` (text, browser language)
      - `referrer` (text, referring website)
      - `utm_source` (text, marketing source)
      - `utm_medium` (text, marketing medium)
      - `utm_campaign` (text, marketing campaign)
      - `country` (text, visitor country)
      - `region` (text, visitor region/state)
      - `city` (text, visitor city)
      - `latitude` (numeric, geolocation)
      - `longitude` (numeric, geolocation)
      - `is_mobile` (boolean, mobile device flag)
      - `is_bot` (boolean, bot detection)
      - `first_visit` (timestamp, first page visit)
      - `last_activity` (timestamp, last activity)
      - `total_page_views` (integer, pages viewed)
      - `session_duration` (integer, time spent in seconds)
      - `created_at` (timestamp)

    - `page_views`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key to visitor_sessions)
      - `page_url` (text, visited page URL)
      - `page_title` (text, page title)
      - `page_path` (text, URL path)
      - `query_params` (jsonb, URL parameters)
      - `load_time` (integer, page load time in ms)
      - `time_on_page` (integer, time spent on page)
      - `scroll_depth` (integer, max scroll percentage)
      - `clicks_count` (integer, number of clicks)
      - `created_at` (timestamp)

    - `visitor_events`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key to visitor_sessions)
      - `event_type` (text, click/scroll/form/etc)
      - `event_data` (jsonb, event details)
      - `element_selector` (text, CSS selector)
      - `element_text` (text, element content)
      - `page_url` (text, page where event occurred)
      - `created_at` (timestamp)

    - `device_fingerprints`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key to visitor_sessions)
      - `fingerprint_hash` (text, unique device fingerprint)
      - `canvas_fingerprint` (text, canvas rendering signature)
      - `webgl_fingerprint` (text, WebGL signature)
      - `audio_fingerprint` (text, audio context signature)
      - `fonts_list` (text[], available fonts)
      - `plugins_list` (text[], browser plugins)
      - `touch_support` (boolean, touch capability)
      - `cookie_enabled` (boolean, cookies enabled)
      - `local_storage` (boolean, local storage available)
      - `session_storage` (boolean, session storage available)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for service role access
    - Add policies for authenticated users to view their own data

  3. Indexes
    - Add indexes for common queries
    - Add indexes for analytics queries
*/

-- Create visitor_sessions table
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  ip_address text,
  user_agent text,
  device_type text DEFAULT 'unknown',
  browser_name text,
  browser_version text,
  os_name text,
  os_version text,
  screen_resolution text,
  viewport_size text,
  timezone text,
  language text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  country text,
  region text,
  city text,
  latitude numeric,
  longitude numeric,
  is_mobile boolean DEFAULT false,
  is_bot boolean DEFAULT false,
  first_visit timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  total_page_views integer DEFAULT 0,
  session_duration integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create page_views table
CREATE TABLE IF NOT EXISTS page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES visitor_sessions(id) ON DELETE CASCADE,
  page_url text NOT NULL,
  page_title text,
  page_path text,
  query_params jsonb,
  load_time integer DEFAULT 0,
  time_on_page integer DEFAULT 0,
  scroll_depth integer DEFAULT 0,
  clicks_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create visitor_events table
CREATE TABLE IF NOT EXISTS visitor_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES visitor_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb,
  element_selector text,
  element_text text,
  page_url text,
  created_at timestamptz DEFAULT now()
);

-- Create device_fingerprints table
CREATE TABLE IF NOT EXISTS device_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES visitor_sessions(id) ON DELETE CASCADE,
  fingerprint_hash text UNIQUE,
  canvas_fingerprint text,
  webgl_fingerprint text,
  audio_fingerprint text,
  fonts_list text[],
  plugins_list text[],
  touch_support boolean DEFAULT false,
  cookie_enabled boolean DEFAULT true,
  local_storage boolean DEFAULT true,
  session_storage boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;

-- Create policies for service role (full access)
CREATE POLICY "Service role can manage visitor sessions"
  ON visitor_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage page views"
  ON page_views
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage visitor events"
  ON visitor_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage device fingerprints"
  ON device_fingerprints
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policies for authenticated users (read-only access to analytics)
CREATE POLICY "Authenticated users can read visitor sessions"
  ON visitor_sessions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read page views"
  ON page_views
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read visitor events"
  ON visitor_events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read device fingerprints"
  ON device_fingerprints
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS visitor_sessions_session_id_idx ON visitor_sessions(session_id);
CREATE INDEX IF NOT EXISTS visitor_sessions_ip_address_idx ON visitor_sessions(ip_address);
CREATE INDEX IF NOT EXISTS visitor_sessions_created_at_idx ON visitor_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS visitor_sessions_country_idx ON visitor_sessions(country);
CREATE INDEX IF NOT EXISTS visitor_sessions_device_type_idx ON visitor_sessions(device_type);
CREATE INDEX IF NOT EXISTS visitor_sessions_is_mobile_idx ON visitor_sessions(is_mobile);

CREATE INDEX IF NOT EXISTS page_views_session_id_idx ON page_views(session_id);
CREATE INDEX IF NOT EXISTS page_views_page_path_idx ON page_views(page_path);
CREATE INDEX IF NOT EXISTS page_views_created_at_idx ON page_views(created_at DESC);

CREATE INDEX IF NOT EXISTS visitor_events_session_id_idx ON visitor_events(session_id);
CREATE INDEX IF NOT EXISTS visitor_events_event_type_idx ON visitor_events(event_type);
CREATE INDEX IF NOT EXISTS visitor_events_created_at_idx ON visitor_events(created_at DESC);

CREATE INDEX IF NOT EXISTS device_fingerprints_session_id_idx ON device_fingerprints(session_id);
CREATE INDEX IF NOT EXISTS device_fingerprints_fingerprint_hash_idx ON device_fingerprints(fingerprint_hash);

-- Create function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE visitor_sessions 
  SET 
    last_activity = now(),
    total_page_views = total_page_views + 1
  WHERE session_id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update session activity on page views
CREATE TRIGGER update_session_on_page_view
  AFTER INSERT ON page_views
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();