import { supabase } from './supabase';
import type {
  AdminUser,
  AdminLoginCredentials,
  AdminSession,
  AdminSessionInfo,
  AdminLog,
  SystemSettings,
  DashboardStats,
  ApiResponse,
  PaginatedResponse,
  OrderFilters,
  ClientFilters,
  LogFilters,
  UserFilters,
  UserWithProfile,
  PaymentMethod,
  PaymentMethodFormData,
  VpnPanel,
  VpnPanelFormData,
  VpnNode,
  VpnNodeFormData,
  EmailSettings,
  EmailSettingsFormData,
  EmailTemplate,
  EmailTemplateFormData,
  TelegramSettings,
  TelegramSettingsFormData,
  AppSettings,
  AppSettingsFormData
} from '../types';
import type { Order } from '../types';
import type { Package, PackageFormData } from '../types';
import type { VpnClient } from '../types';

const ADMIN_SESSION_KEY = 'admin_session';
const ADMIN_TOKEN_KEY = 'admin_token';

// Get Supabase URL for Edge Function calls
const getSupabaseUrl = () => {
  return import.meta.env.VITE_SUPABASE_URL;
};

// Helper function to call Edge Functions with proper error handling
async function callEdgeFunction(functionName: string, body: any): Promise<any> {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }

  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body });
    if (error) {
      console.error(`Edge function ${functionName} error:`, error);
      throw new Error(error.message || 'Request failed');
    }
    return data;
  } catch (sdkError: any) {
    console.error(`SDK invoke failed for ${functionName}:`, sdkError);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`Fetch failed for ${functionName}:`, response.status, text);
        throw new Error(`Request failed: ${response.status}`);
      }

      return await response.json();
    } catch (fetchError: any) {
      console.error(`Direct fetch also failed for ${functionName}:`, fetchError);
      throw fetchError;
    }
  }
}

// System Settings
export const getSystemSettings = async (): Promise<SystemSettings | null> => {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Error fetching system settings:', error);
    return null;
  }

  return data;
};

export const getAdminPanelPath = async (): Promise<string> => {
  try {
    const settings = await getSystemSettings();
    return settings?.admin_panel_path || 'admin';
  } catch {
    return 'admin';
  }
};

// Admin Authentication
export const adminLogin = async (
  credentials: AdminLoginCredentials,
  ipAddress?: string,
  userAgent?: string
): Promise<ApiResponse<AdminSession>> => {
  try {
    const data = await callEdgeFunction('admin-auth', {
      action: 'login',
      username: credentials.username,
      password: credentials.password,
      two_factor_code: credentials.two_factor_code,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    if (!data.success) {
      return { success: false, error: data.error || 'Login failed' };
    }

    if (data.session) {
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(data.session));
    }
    if (data.token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    }

    return { success: true, data: data };
  } catch (error: any) {
    console.error('Admin login error:', error);
    return { success: false, error: error.message || 'Login failed. Please try again.' };
  }
};

export const adminLogout = async (): Promise<ApiResponse<void>> => {
  try {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);

    if (token) {
      await supabase.functions.invoke('admin-auth', {
        body: { action: 'logout', token }
      });
    }

    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);

    return { success: true };
  } catch (error: any) {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    return { success: false, error: error.message };
  }
};

export const getAdminSession = (): AdminSession | null => {
  const sessionStr = localStorage.getItem(ADMIN_SESSION_KEY);
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);

  if (!sessionStr || !token) return null;

  try {
    const session = JSON.parse(sessionStr);
    return { ...session, token };
  } catch {
    return null;
  }
};

export const isAdminLoggedIn = (): boolean => {
  const session = getAdminSession();
  if (!session) return false;
  const expiresAt = new Date(session.expires_at);
  return expiresAt > new Date();
};

export const validateAdminToken = async (): Promise<boolean> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return false;

  try {
    const { data, error } = await supabase.functions.invoke('admin-auth', {
      body: { action: 'validate', token }
    });
    return data?.success === true;
  } catch {
    return false;
  }
};

// Session Management Functions
export const listAdminSessions = async (): Promise<AdminSessionInfo[]> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return [];

  try {
    const data = await callEdgeFunction('admin-auth', {
      action: 'list_sessions',
      token
    });
    return data?.sessions || [];
  } catch {
    return [];
  }
};

export const revokeAdminSession = async (sessionId: string): Promise<ApiResponse<void>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-auth', {
      action: 'revoke_session',
      token,
      session_id: sessionId
    });
    return { success: data?.success, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to revoke session' };
  }
};

export const revokeAllOtherSessions = async (): Promise<ApiResponse<void>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-auth', {
      action: 'revoke_all_sessions',
      token
    });
    return { success: data?.success, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to revoke sessions' };
  }
};

export const updateSessionActivity = async (): Promise<void> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return;

  try {
    await callEdgeFunction('admin-auth', {
      action: 'update_activity',
      token
    });
  } catch {
    // Silently fail - activity update is optional
  }
};

export const getAdminSessionInfo = async (): Promise<{ currentSessionId: string | null; sessions: AdminSessionInfo[] }> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { currentSessionId: null, sessions: [] };

  try {
    const data = await callEdgeFunction('admin-auth', {
      action: 'list_sessions',
      token
    });
    return {
      currentSessionId: data?.current_session_id || null,
      sessions: data?.sessions || []
    };
  } catch {
    return { currentSessionId: null, sessions: [] };
  }
};

// Admin Logs
export const getAdminLogs = async (
  filters?: LogFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<AdminLog>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) {
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  try {
    const data = await callEdgeFunction('admin-action', {
      action: 'get_logs',
      token,
      filters,
      page,
      pageSize
    });

    if (!data?.success) {
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    return data.result;
  } catch {
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }
};

// Dashboard Statistics
export const getDashboardStats = async (): Promise<DashboardStats | null> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return null;

  try {
    const data = await callEdgeFunction('admin-dashboard', { token });
    if (!data?.success) {
      console.error('Error fetching dashboard stats');
      return null;
    }
    return data.stats;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return null;
  }
};

// Orders Management
export const getAllOrders = async (
  filters?: OrderFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<Order>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) {
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  try {
    const data = await callEdgeFunction('admin-orders', {
      action: 'list',
      token,
      filters,
      page,
      pageSize
    });

    if (!data?.success) {
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    return data.result;
  } catch {
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }
};

export const approveOrder = async (
  orderId: string,
  adminNotes?: string
): Promise<ApiResponse<Order>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-orders', {
      action: 'approve',
      token,
      orderId,
      adminNotes
    });
    return { success: data?.success, data: data?.order, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to approve order' };
  }
};

export const rejectOrder = async (
  orderId: string,
  adminNotes: string
): Promise<ApiResponse<Order>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-orders', {
      action: 'reject',
      token,
      orderId,
      adminNotes
    });
    return { success: data?.success, data: data?.order, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reject order' };
  }
};

export const getOrderById = async (orderId: string): Promise<Order | null> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return null;

  try {
    const data = await callEdgeFunction('admin-orders', {
      action: 'get',
      token,
      orderId
    });
    if (!data?.success) return null;
    return data.order;
  } catch {
    return null;
  }
};

// Packages Management
export const getAllPackages = async (): Promise<Package[]> => {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching packages:', error);
    return [];
  }
  return data || [];
};

export const getActivePackages = async (): Promise<Package[]> => {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching active packages:', error);
    return [];
  }
  return data || [];
};

export const createPackage = async (packageData: PackageFormData): Promise<ApiResponse<Package>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-packages', {
      action: 'create',
      token,
      packageData
    });
    return { success: data?.success, data: data?.pkg, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create package' };
  }
};

export const updatePackage = async (
  packageId: string,
  packageData: Partial<PackageFormData>
): Promise<ApiResponse<Package>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-packages', {
      action: 'update',
      token,
      packageId,
      packageData
    });
    return { success: data?.success, data: data?.pkg, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update package' };
  }
};

export const deletePackage = async (packageId: string): Promise<ApiResponse<void>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-packages', {
      action: 'delete',
      token,
      packageId
    });
    return { success: data?.success, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete package' };
  }
};

// VPN Clients Management
export const getAllVpnClients = async (
  filters?: ClientFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<VpnClient>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { data: [], total: 0, page, pageSize, totalPages: 0 };

  try {
    const data = await callEdgeFunction('admin-vpn-clients', {
      action: 'list',
      token,
      filters,
      page,
      pageSize
    });

    if (!data?.success) return { data: [], total: 0, page, pageSize, totalPages: 0 };
    return data.result;
  } catch {
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }
};

export const suspendVpnClient = async (clientId: string): Promise<ApiResponse<VpnClient>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-vpn-clients', {
      action: 'suspend',
      token,
      clientId
    });
    return { success: data?.success, data: data?.client, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to suspend client' };
  }
};

export const activateVpnClient = async (clientId: string): Promise<ApiResponse<VpnClient>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-vpn-clients', {
      action: 'activate',
      token,
      clientId
    });
    return { success: data?.success, data: data?.client, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to activate client' };
  }
};

export const deleteVpnClient = async (clientId: string): Promise<ApiResponse<void>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-vpn-clients', {
      action: 'delete',
      token,
      clientId
    });
    return { success: data?.success, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete client' };
  }
};

export const regenerateSubscription = async (clientId: string): Promise<ApiResponse<VpnClient>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-vpn-clients', {
      action: 'regenerate_subscription',
      token,
      clientId
    });
    return { success: data?.success, data: data?.client, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to regenerate subscription' };
  }
};

// User Management
export const getAllUsers = async (
  filters?: UserFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<UserWithProfile>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { data: [], total: 0, page, pageSize, totalPages: 0 };

  try {
    const data = await callEdgeFunction('admin-users', {
      action: 'list',
      token,
      filters,
      page,
      pageSize
    });

    if (!data?.success) return { data: [], total: 0, page, pageSize, totalPages: 0 };
    return data.result;
  } catch {
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }
};

export const getUserById = async (userId: string): Promise<any | null> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return null;

  try {
    const data = await callEdgeFunction('admin-users', {
      action: 'get',
      token,
      userId
    });
    if (!data?.success) return null;
    return data.user;
  } catch {
    return null;
  }
};

export const suspendUser = async (userId: string, reason: string): Promise<ApiResponse<any>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-users', {
      action: 'suspend',
      token,
      userId,
      suspensionReason: reason
    });
    return { success: data?.success, data: data?.user, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to suspend user' };
  }
};

export const activateUser = async (userId: string): Promise<ApiResponse<any>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-users', {
      action: 'activate',
      token,
      userId
    });
    return { success: data?.success, data: data?.user, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to activate user' };
  }
};

export const deleteUser = async (userId: string): Promise<ApiResponse<void>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-users', {
      action: 'delete',
      token,
      userId
    });
    return { success: data?.success, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete user' };
  }
};

export const resetUserPassword = async (userId: string, newPassword?: string): Promise<ApiResponse<void>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-users', {
      action: 'reset_password',
      token,
      userId,
      newPassword
    });
    return { success: data?.success, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reset password' };
  }
};

// Payment Methods Management
export const getAllPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return [];

  try {
    const data = await callEdgeFunction('admin-payment-methods', {
      action: 'list',
      token
    });
    if (!data?.success) return [];
    return data.methods || [];
  } catch {
    return [];
  }
};

export const createPaymentMethod = async (methodData: PaymentMethodFormData): Promise<ApiResponse<PaymentMethod>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-payment-methods', {
      action: 'create',
      token,
      methodData
    });
    return { success: data?.success, data: data?.method, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create payment method' };
  }
};

export const updatePaymentMethod = async (
  methodId: string,
  methodData: Partial<PaymentMethodFormData>
): Promise<ApiResponse<PaymentMethod>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-payment-methods', {
      action: 'update',
      token,
      methodId,
      methodData
    });
    return { success: data?.success, data: data?.method, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update payment method' };
  }
};

export const deletePaymentMethod = async (methodId: string): Promise<ApiResponse<void>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-payment-methods', {
      action: 'delete',
      token,
      methodId
    });
    return { success: data?.success, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete payment method' };
  }
};

export const togglePaymentMethod = async (methodId: string): Promise<ApiResponse<PaymentMethod>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-payment-methods', {
      action: 'toggle',
      token,
      methodId
    });
    return { success: data?.success, data: data?.method, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to toggle payment method' };
  }
};

// VPN Panels & Nodes Management
export const getAllVpnPanels = async (): Promise<any[]> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return [];

  try {
    const data = await callEdgeFunction('admin-nodes', {
      action: 'list_panels',
      token
    });
    if (!data?.success) return [];
    return data.panels || [];
  } catch {
    return [];
  }
};

export const getAllVpnNodes = async (panelId?: string): Promise<any[]> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return [];

  try {
    const data = await callEdgeFunction('admin-nodes', {
      action: 'list_nodes',
      token,
      panelId
    });
    if (!data?.success) return [];
    return data.nodes || [];
  } catch {
    return [];
  }
};

export const createVpnPanel = async (panelData: VpnPanelFormData): Promise<ApiResponse<any>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-nodes', {
      action: 'create_panel',
      token,
      panelData
    });
    return { success: data?.success, data: data?.panel, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create panel' };
  }
};

export const updateVpnPanel = async (
  panelId: string,
  panelData: Partial<VpnPanelFormData>
): Promise<ApiResponse<any>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-nodes', {
      action: 'update_panel',
      token,
      panelId,
      panelData
    });
    return { success: data?.success, data: data?.panel, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update panel' };
  }
};

export const deleteVpnPanel = async (panelId: string): Promise<ApiResponse<void>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-nodes', {
      action: 'delete_panel',
      token,
      panelId
    });
    return { success: data?.success, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete panel' };
  }
};

export const createVpnNode = async (nodeData: VpnNodeFormData): Promise<ApiResponse<any>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-nodes', {
      action: 'create_node',
      token,
      nodeData
    });
    return { success: data?.success, data: data?.node, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create node' };
  }
};

export const updateVpnNode = async (
  nodeId: string,
  nodeData: Partial<VpnNodeFormData>
): Promise<ApiResponse<any>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-nodes', {
      action: 'update_node',
      token,
      nodeId,
      nodeData
    });
    return { success: data?.success, data: data?.node, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update node' };
  }
};

export const deleteVpnNode = async (nodeId: string): Promise<ApiResponse<void>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-nodes', {
      action: 'delete_node',
      token,
      nodeId
    });
    return { success: data?.success, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete node' };
  }
};

export const testPanelConnection = async (panelId: string): Promise<ApiResponse<any>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-nodes', {
      action: 'test_connection',
      token,
      panelId
    });
    return { success: data?.success, data: data?.connection, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to test connection' };
  }
};

export const getPanelStats = async (panelId: string): Promise<ApiResponse<any>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-nodes', {
      action: 'get_stats',
      token,
      panelId
    });
    return { success: data?.success, data: data?.stats, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get stats' };
  }
};

// Settings Management
export const getAllSettings = async (): Promise<any | null> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return null;

  try {
    const data = await callEdgeFunction('admin-settings', {
      action: 'get_all',
      token
    });
    if (!data?.success) return null;
    return data.settings;
  } catch {
    return null;
  }
};

export const updateSystemSettings = async (settingsData: any, settingsId?: string): Promise<ApiResponse<any>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-settings', {
      action: 'update_system',
      token,
      settingsData,
      settingsId
    });
    return { success: data?.success, data: data?.settings, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update settings' };
  }
};

export const updateAppSettings = async (settingsData: Partial<AppSettingsFormData>): Promise<ApiResponse<any>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-settings', {
      action: 'update_app',
      token,
      settingsData
    });
    return { success: data?.success, data: data?.settings, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update app settings' };
  }
};

export const updateEmailSettings = async (settingsData: Partial<EmailSettingsFormData>): Promise<ApiResponse<any>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-settings', {
      action: 'update_email',
      token,
      settingsData
    });
    return { success: data?.success, data: data?.settings, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update email settings' };
  }
};

export const updateTelegramSettings = async (settingsData: Partial<TelegramSettingsFormData>): Promise<ApiResponse<any>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-settings', {
      action: 'update_telegram',
      token,
      settingsData
    });
    return { success: data?.success, data: data?.settings, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update telegram settings' };
  }
};

export const testEmailSettings = async (): Promise<ApiResponse<void>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-settings', {
      action: 'test_email',
      token
    });
    return { success: data?.success, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to test email' };
  }
};

export const testTelegramSettings = async (): Promise<ApiResponse<void>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-settings', {
      action: 'test_telegram',
      token
    });
    return { success: data?.success, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to test telegram' };
  }
};

// Email Templates
export const getEmailTemplates = async (): Promise<EmailTemplate[]> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return [];

  try {
    const data = await callEdgeFunction('admin-settings', {
      action: 'list_templates',
      token
    });
    if (!data?.success) return [];
    return data.templates || [];
  } catch {
    return [];
  }
};

export const updateEmailTemplate = async (
  templateId: string,
  templateData: Partial<EmailTemplateFormData>
): Promise<ApiResponse<EmailTemplate>> => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const data = await callEdgeFunction('admin-settings', {
      action: 'update_template',
      token,
      templateId,
      templateData
    });
    return { success: data?.success, data: data?.template, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update template' };
  }
};
