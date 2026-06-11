import { supabase, getCurrentUser } from './supabase';
import type { VpnClient, Package, Order } from '../types';

// Get user's active VPN subscription
export const getUserVpnClient = async (): Promise<VpnClient | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('vpn_clients')
    .select(`
      *,
      package:packages(*),
      node:vpn_nodes(country, city, node_name)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error) {
    console.error('Error fetching VPN client:', error);
    return null;
  }

  return data;
};

// Get all user's VPN subscriptions (including expired/suspended)
export const getUserVpnHistory = async (): Promise<VpnClient[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('vpn_clients')
    .select(`
      *,
      package:packages(*),
      node:vpn_nodes(country, city, node_name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching VPN history:', error);
    return [];
  }

  return data || [];
};

// Get available packages for purchase
export const getAvailablePackages = async (): Promise<Package[]> => {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching packages:', error);
    return [];
  }

  return data || [];
};

// Create order with package
export const createOrderWithPackage = async (
  packageData: Package,
  paymentMethod: string,
  fullName: string,
  email: string,
  phone: string
): Promise<Order | null> => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const orderData = {
    user_id: user.id,
    package_id: packageData.id,
    full_name: fullName,
    email,
    phone,
    payment_method: paymentMethod,
    plan_title: packageData.name,
    plan_price: `${packageData.price}`,
    order_status: 'pending'
  };

  const { data, error } = await supabase
    .from('orders')
    .insert([orderData])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// Get user's orders with package info
export const getUserOrdersWithPackages = async (): Promise<Order[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      package:packages(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }

  return data || [];
};

// Check if user has active subscription
export const hasActiveSubscription = async (): Promise<boolean> => {
  const client = await getUserVpnClient();
  return client !== null;
};

// Calculate traffic percentage
export const calculateTrafficPercentage = (usedGb: number, totalGb: number): number => {
  if (totalGb <= 0) return 0;
  return Math.min(100, Math.round((usedGb / totalGb) * 100));
};

// Calculate days until expiration
export const calculateDaysRemaining = (expireDate: string): number => {
  const now = new Date();
  const expire = new Date(expireDate);
  const diff = expire.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

// Format traffic display
export const formatTraffic = (gb: number): string => {
  if (gb >= 1000) {
    return `${(gb / 1000).toFixed(1)} TB`;
  }
  return `${gb.toFixed(1)} GB`;
};

// Generate QR code URL for subscription
export const generateQrCodeUrl = (subscriptionUrl: string): string => {
  // Using QR code API
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(subscriptionUrl)}`;
};

// Copy subscription URL to clipboard
export const copySubscriptionUrl = async (url: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
};

// Refresh VPN client data (for real-time updates)
export const refreshVpnClient = async (clientId: string): Promise<VpnClient | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('vpn_clients')
    .select(`
      *,
      package:packages(*),
      node:vpn_nodes(country, city, node_name)
    `)
    .eq('id', clientId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error refreshing VPN client:', error);
    return null;
  }

  return data;
};
