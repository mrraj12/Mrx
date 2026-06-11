// System Types
export interface SystemSettings {
  id: string;
  admin_panel_path: string;
  site_name: string;
  maintenance_mode: boolean;
  updated_at: string;
}

// Admin Types
export type AdminRole = 'admin' | 'super_admin';

export interface AdminPermissions {
  orders_view: boolean;
  orders_approve: boolean;
  orders_reject: boolean;
  clients_view: boolean;
  clients_manage: boolean;
  packages_manage: boolean;
  users_view: boolean;
  users_manage: boolean;
  nodes_view: boolean;
  nodes_manage: boolean;
  settings_manage: boolean;
  templates_manage: boolean;
  logs_view: boolean;
  payment_methods_manage: boolean;
  email_manage: boolean;
  telegram_manage: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  role: AdminRole;
  permissions: AdminPermissions;
  two_factor_enabled: boolean;
  is_active: boolean;
  last_login_at?: string;
  last_login_ip?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminLoginCredentials {
  username: string;
  password: string;
  two_factor_code?: string;
}

export interface AdminSession {
  id: string;
  admin: AdminUser;
  token?: string;
  expires_at: string;
}

export interface AdminSessionInfo {
  id: string;
  token_prefix: string;
  ip_address?: string;
  user_agent?: string;
  device_info: {
    browser?: string;
    os?: string;
    device?: string;
  };
  last_activity_at: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

export type AdminAction =
  | 'login'
  | 'logout'
  | 'order_approved'
  | 'order_rejected'
  | 'client_suspended'
  | 'client_activated'
  | 'client_deleted'
  | 'package_created'
  | 'package_updated'
  | 'package_deleted'
  | 'user_suspended'
  | 'user_activated'
  | 'user_deleted'
  | 'password_reset'
  | 'settings_updated'
  | 'payment_method_created'
  | 'payment_method_updated'
  | 'payment_method_deleted'
  | 'panel_created'
  | 'panel_updated'
  | 'panel_deleted'
  | 'node_created'
  | 'node_updated'
  | 'node_deleted'
  | 'template_updated'
  | 'email_settings_updated'
  | 'telegram_settings_updated'
  | 'reseller_approved'
  | 'reseller_rejected'
  | 'reseller_suspended'
  | 'reseller_activated'
  | 'commission_rate_changed'
  | 'user_assigned_to_reseller'
  | 'commission_created'
  | 'commission_cancelled'
  | 'payout_requested'
  | 'payout_approved'
  | 'payout_paid'
  | 'payout_rejected';

export interface AdminLog {
  id: string;
  admin_id?: string;
  action: AdminAction;
  target_type?: string;
  target_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  admin?: AdminUser;
}

// Package Types
export interface Package {
  id: string;
  name: string;
  description?: string;
  total_gb: number;
  duration_days: number;
  device_limit: number;
  price: number;
  currency: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PackageFormData {
  name: string;
  description?: string;
  total_gb: number;
  duration_days: number;
  device_limit: number;
  price: number;
  is_active: boolean;
}

// Order Types
export type OrderStatus = 'pending' | 'payment_submitted' | 'approved' | 'rejected' | 'completed';

export interface Order {
  id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  payment_method: string;
  plan_title: string;
  plan_price: string;
  order_status: OrderStatus;
  package_id?: string;
  vpn_client_id?: string;
  payment_screenshot_url?: string;
  admin_notes?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
  package?: Package;
  vpn_client?: VpnClient;
}

export interface OrderFormData {
  user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  payment_method: string;
  plan_title: string;
  plan_price: string;
  package_id?: string;
}

// Payment Types
export interface PaymentMethod {
  id: string;
  name: string;
  qr_code_url: string;
  account_info?: string;
  payment_type?: 'qr_code' | 'bank_transfer' | 'crypto';
  is_active: boolean;
  display_order?: number;
  created_at: string;
}

export interface PaymentMethodFormData {
  name: string;
  qr_code_url?: string;
  account_info?: string;
  payment_type: 'qr_code' | 'bank_transfer' | 'crypto';
  is_active: boolean;
}

export interface PaymentScreenshot {
  id: string;
  order_id: string;
  user_id: string;
  screenshot_url: string;
  payment_method_id: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at?: string;
  verified_by?: string;
  created_at: string;
  payment_method?: PaymentMethod;
}

// VPN Types
export interface VpnPanel {
  id: string;
  name: string;
  country: string;
  panel_url: string;
  username: string;
  password: string;
  version: string;
  subscription_path: string;
  login_session?: string;
  is_active: boolean;
  max_clients?: number;
  current_clients?: number;
  total_traffic_gb?: number;
  created_at: string;
  updated_at: string;
}

export interface VpnPanelFormData {
  name: string;
  country: string;
  panel_url: string;
  username: string;
  password: string;
  subscription_path: string;
  is_active: boolean;
  max_clients?: number;
}

export interface VpnNode {
  id: string;
  panel_id: string;
  inbound_id: number;
  country: string;
  city?: string;
  node_name: string;
  is_active: boolean;
  created_at: string;
  panel?: VpnPanel;
}

export interface VpnNodeFormData {
  panel_id: string;
  inbound_id: number;
  country: string;
  city?: string;
  node_name: string;
  is_active: boolean;
}

export type VpnClientStatus = 'active' | 'suspended' | 'expired' | 'deleted';

export interface VpnClient {
  id: string;
  user_id: string;
  order_id?: string;
  package_id?: string;
  node_id?: string;
  client_uuid: string;
  email: string;
  subscription_url?: string;
  total_gb: number;
  used_gb: number;
  remaining_gb: number;
  device_limit: number;
  expire_date: string;
  status: VpnClientStatus;
  inbound_id?: number;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
  package?: Package;
  node?: VpnNode;
}

// User Profile Type
export interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  phone?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  is_suspended?: boolean;
  suspended_at?: string;
  suspension_reason?: string;
  last_login_at?: string;
  login_count?: number;
  referred_by_reseller_id?: string;
  reseller_code_used?: string;
  is_reseller?: boolean;
  reseller_status?: 'none' | 'pending' | 'active' | 'suspended' | 'rejected';
  created_at: string;
  updated_at: string;
}

// User with extended info
export interface UserWithProfile {
  id: string;
  email: string;
  email_confirmed_at?: string;
  created_at: string;
  last_sign_in_at?: string;
  profile?: UserProfile;
  orders_count?: number;
  active_subscriptions?: number;
}

// Email Settings
export interface EmailSettings {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username?: string;
  smtp_password?: string;
  from_name: string;
  from_email: string;
  encryption: 'none' | 'ssl' | 'tls';
  is_enabled: boolean;
  last_test_at?: string;
  last_test_status?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailSettingsFormData {
  smtp_host: string;
  smtp_port: number;
  smtp_username?: string;
  smtp_password?: string;
  from_name: string;
  from_email: string;
  encryption: 'none' | 'ssl' | 'tls';
  is_enabled: boolean;
}

// Email Templates
export type EmailTemplateType =
  | 'welcome'
  | 'order_received'
  | 'order_approved'
  | 'order_rejected'
  | 'subscription_created'
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'password_reset'
  | 'custom';

export interface EmailTemplate {
  id: string;
  name: string;
  template_type: EmailTemplateType;
  subject: string;
  body_html: string;
  body_text?: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateFormData {
  name: string;
  template_type: EmailTemplateType;
  subject: string;
  body_html: string;
  body_text?: string;
  is_active: boolean;
}

// Telegram Settings
export interface TelegramSettings {
  id: string;
  bot_token?: string;
  chat_id?: string;
  is_enabled: boolean;
  notify_new_orders: boolean;
  notify_order_approved: boolean;
  notify_order_rejected: boolean;
  notify_subscription_expired: boolean;
  notify_daily_stats: boolean;
  last_test_at?: string;
  last_test_status?: string;
  created_at: string;
  updated_at: string;
}

export interface TelegramSettingsFormData {
  bot_token?: string;
  chat_id?: string;
  is_enabled: boolean;
  notify_new_orders: boolean;
  notify_order_approved: boolean;
  notify_order_rejected: boolean;
  notify_subscription_expired: boolean;
  notify_daily_stats: boolean;
}

// App Settings
export type NodeSelectionMode = 'auto' | 'manual' | 'load_balanced';

export interface AppSettings {
  id: string;
  site_description?: string;
  logo_url?: string;
  favicon_url?: string;
  default_currency: string;
  currency_symbol: string;
  timezone: string;
  contact_email?: string;
  support_url?: string;
  tutorial_url?: string;
  subscription_path_format: string;
  node_selection_mode: NodeSelectionMode;
  default_node_id?: string;
  session_timeout_minutes: number;
  require_2fa: boolean;
  ip_whitelist?: string[];
  maintenance_message?: string;
  registration_enabled: boolean;
  max_devices_per_user: number;
  reseller_enabled?: boolean;
  default_commission_rate?: number;
  reseller_currency?: string;
  minimum_payout_amount?: number;
  reseller_terms?: string;
  auto_approve_resellers?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppSettingsFormData {
  site_description?: string;
  logo_url?: string;
  favicon_url?: string;
  default_currency: string;
  currency_symbol: string;
  timezone: string;
  contact_email?: string;
  support_url?: string;
  tutorial_url?: string;
  subscription_path_format: string;
  node_selection_mode: NodeSelectionMode;
  default_node_id?: string;
  session_timeout_minutes: number;
  require_2fa: boolean;
  ip_whitelist?: string[];
  maintenance_message?: string;
  registration_enabled: boolean;
  max_devices_per_user: number;
}

// Notification Queue
export type NotificationType = 'email' | 'telegram';
export type NotificationStatus = 'pending' | 'processing' | 'sent' | 'failed';

export interface NotificationQueue {
  id: string;
  notification_type: NotificationType;
  recipient: string;
  subject?: string;
  content: string;
  template_id?: string;
  template_data?: Record<string, any>;
  status: NotificationStatus;
  error_message?: string;
  scheduled_at: string;
  sent_at?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
}

// Dashboard Statistics (Extended)
export interface DashboardStats {
  total_users: number;
  new_users_today: number;
  new_users_this_week: number;
  total_orders: number;
  pending_orders: number;
  approved_orders: number;
  rejected_orders: number;
  orders_today: number;
  active_vpn_clients: number;
  expired_vpn_clients: number;
  suspended_vpn_clients: number;
  total_revenue: number;
  revenue_today: number;
  revenue_this_week: number;
  total_traffic_used_gb: number;
  total_resellers?: number;
  pending_reseller_requests?: number;
  total_reseller_users?: number;
  total_reseller_sales?: number;
  total_reseller_profit?: number;
}

export interface LatestOrder {
  id: string;
  full_name: string;
  email: string;
  plan_title: string;
  plan_price: string;
  order_status: OrderStatus;
  created_at: string;
}

export interface RecentActivity {
  id: string;
  action: string;
  admin_name?: string;
  target_type?: string;
  details?: Record<string, any>;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter Types
export interface OrderFilters {
  status?: OrderStatus;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface ClientFilters {
  status?: VpnClientStatus;
  search?: string;
}

export interface UserFilters {
  status?: 'active' | 'suspended';
  search?: string;
  verified?: boolean;
}

export interface LogFilters {
  action?: AdminAction;
  admin_id?: string;
  date_from?: string;
  date_to?: string;
}

// Reseller Types
export interface ResellerRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_message?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  reject_reason?: string;
  created_at: string;
  updated_at: string;
  user?: UserWithProfile;
}

export interface Reseller {
  id: string;
  user_id: string;
  reseller_code: string;
  status: 'active' | 'suspended' | 'disabled';
  commission_rate: number;
  total_users: number;
  total_orders: number;
  total_packages_sold: number;
  total_sales_amount: number;
  total_profit_amount: number;
  currency: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  user?: UserWithProfile;
}

export interface ResellerUser {
  id: string;
  reseller_id: string;
  user_id: string;
  referral_code?: string;
  assigned_by?: string;
  assigned_type: 'referral_link' | 'manual' | 'system';
  joined_at: string;
  created_at: string;
  updated_at: string;
  user?: UserWithProfile;
}

export interface ResellerCommission {
  id: string;
  reseller_id: string;
  user_id: string;
  order_id: string;
  package_id?: string;
  package_name?: string;
  package_price: number;
  commission_rate: number;
  commission_amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'cancelled' | 'paid';
  created_at: string;
  updated_at: string;
}

export interface ResellerPayout {
  id: string;
  reseller_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  payment_method?: string;
  payment_details?: string;
  requested_at: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ResellerStats {
  total_users: number;
  total_orders: number;
  total_packages_sold: number;
  total_sales_amount: number;
  total_profit_amount: number;
  last_calculated_at: string;
}

export interface ResellerSettings {
  reseller_enabled: boolean;
  default_commission_rate: number;
  reseller_currency: string;
  minimum_payout_amount: number;
  reseller_terms?: string;
  auto_approve_resellers: boolean;
}

export interface ResellerRanked extends Reseller {
  rank: number;
  user?: UserWithProfile;
}
