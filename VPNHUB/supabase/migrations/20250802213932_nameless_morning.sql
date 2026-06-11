/*
  # Remove all analytics and tracking tables

  1. Tables to Remove
    - `visitor_sessions` - Session tracking data
    - `page_views` - Page view analytics
    - `visitor_events` - User event tracking
    - `device_fingerprints` - Device fingerprinting data

  2. Functions to Remove
    - `update_session_activity()` - Session update trigger function

  3. Security
    - Remove all RLS policies for analytics tables
    - Clean up any remaining references
*/

-- Drop all analytics tables and their dependencies
DROP TABLE IF EXISTS page_views CASCADE;
DROP TABLE IF EXISTS visitor_events CASCADE;
DROP TABLE IF EXISTS device_fingerprints CASCADE;
DROP TABLE IF EXISTS visitor_sessions CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_session_activity() CASCADE;