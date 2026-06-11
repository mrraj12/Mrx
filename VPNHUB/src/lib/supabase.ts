import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Order {
  id?: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  payment_method: string;
  plan_title: string;
  plan_price: string;
  order_status: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id?: string;
  user_id: string;
  full_name?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  qr_code_url: string;
  account_info: string;
  is_active: boolean;
}

export interface PaymentScreenshot {
  id?: string;
  order_id: string;
  user_id: string;
  screenshot_url: string;
  payment_method_id: string;
  verification_status: string;
  created_at?: string;
}

// Authentication functions
export const signUp = async (email: string, password: string, fullName: string, phone: string) => {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;

  // Create user profile
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([{
        user_id: authData.user.id,
        full_name: fullName,
        phone: phone
      }]);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      throw profileError;
    }
  }

  return authData;
};

export const signIn = async (email: string, password: string) => {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error('Sign in error:', authError);
    throw authError;
  }
  return authData;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};
export const createOrder = async (orderDataOrUserId: Omit<Order, 'id' | 'created_at' | 'updated_at'> | string, packageId?: string) => {
  // Support two call signatures:
  // 1. createOrder(orderData) - full order object
  // 2. createOrder(userId, packageId) - quick order from package
  if (typeof orderDataOrUserId === 'string' && packageId) {
    const userId = orderDataOrUserId;

    // Fetch the package details
    const { data: pkg, error: pkgError } = await supabase
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (pkgError || !pkg) {
      return { success: false, error: 'Package not found' };
    }

    // Get user profile for details
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, phone')
      .eq('user_id', userId)
      .maybeSingle();

    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('orders')
      .insert([{
        user_id: userId,
        full_name: profile?.full_name || '',
        email: user?.email || '',
        phone: profile?.phone || '',
        payment_method: 'pending',
        plan_title: pkg.name,
        plan_price: `¥${pkg.price}`,
        order_status: 'pending',
        package_id: packageId
      }])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, orderId: data.id, data };
  }

  // Original signature: full order object
  const orderData = orderDataOrUserId as Omit<Order, 'id' | 'created_at' | 'updated_at'>;
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

export const getUserOrders = async (userId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
};

// Payment methods
export const getPaymentMethods = async () => {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data;
};

// Payment screenshot upload
export const uploadPaymentScreenshot = async (
  orderId: string, 
  paymentMethodId: string, 
  file: File
) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  // Upload file to storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${orderId}-${Date.now()}.${fileExt}`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('payment-screenshots')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('payment-screenshots')
    .getPublicUrl(fileName);

  // Save screenshot record
  const { data, error } = await supabase
    .from('payment_screenshots')
    .insert([{
      order_id: orderId,
      user_id: user.id,
      screenshot_url: publicUrl,
      payment_method_id: paymentMethodId,
      verification_status: 'pending'
    }])
    .select()
    .single();

  if (error) throw error;

  // Update order status
  await supabase
    .from('orders')
    .update({ order_status: 'payment_submitted' })
    .eq('id', orderId);

  return data;
};

export const getPaymentScreenshots = async (orderId: string) => {
  const { data, error } = await supabase
    .from('payment_screenshots')
    .select(`
      *,
      payment_methods (name)
    `)
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Analytics data is now only accessible via database admin tools
// Regular users cannot access any analytics data through the application