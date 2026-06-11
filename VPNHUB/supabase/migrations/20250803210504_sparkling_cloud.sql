/*
  # Remove WeChat Groups and Admin Users Tables

  1. Tables to Remove
    - `wechat_groups` - WeChat group management
    - `admin_users` - Admin user management

  2. Functions to Remove
    - `is_admin_user()` - Admin verification function
    - `get_analytics_summary()` - Analytics summary function

  3. Security
    - Remove all RLS policies for these tables
    - Clean up any remaining references
*/

-- Drop admin and WeChat related tables
DROP TABLE IF EXISTS wechat_groups CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Drop admin-related functions
DROP FUNCTION IF EXISTS is_admin_user(text) CASCADE;
DROP FUNCTION IF EXISTS get_analytics_summary() CASCADE;