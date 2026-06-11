import React, { useState, useEffect } from 'react';
import {
  Shield, Wifi, Clock, HardDrive, Copy, QrCode, AlertCircle,
  CheckCircle, Loader2, Calendar, Smartphone, MapPin, RefreshCw,
  ArrowRight, Package, User, ShoppingBag, ExternalLink, Users,
  TrendingUp, DollarSign, Percent, Award
} from 'lucide-react';
import {
  getUserVpnClient, getUserVpnHistory, getUserOrdersWithPackages,
  calculateTrafficPercentage, calculateDaysRemaining, formatTraffic,
  generateQrCodeUrl, copySubscriptionUrl, refreshVpnClient
} from '../lib/vpnService';
import { supabase } from '../lib/supabase';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import type { VpnClient, Order, Reseller, ResellerRequest } from '../types';
import toast from 'react-hot-toast';

interface UserVpnDashboardProps {
  darkMode: boolean;
  user: any;
  userProfile: any;
}

export default function UserVpnDashboard({ darkMode, user, userProfile }: UserVpnDashboardProps) {
  const [vpnClient, setVpnClient] = useState<VpnClient | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [reseller, setReseller] = useState<Reseller | null>(null);
  const [resellerRequest, setResellerRequest] = useState<ResellerRequest | null>(null);
  const [isApplyingReseller, setIsApplyingReseller] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (vpnClient) refreshData();
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Realtime: auto-update when vpn_clients row changes for this user
  useRealtimeTable({
    table: 'vpn_clients',
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    enabled: !!user?.id,
    onChange: () => {
      loadData();
    }
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [client, ordersData] = await Promise.all([
        getUserVpnClient(),
        getUserOrdersWithPackages()
      ]);
      setVpnClient(client);
      setOrders(ordersData);

      // Load reseller data
      if (user?.id) {
        const { data: resData } = await supabase
          .from('resellers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (resData) setReseller(resData);

        const { data: reqData } = await supabase
          .from('reseller_requests')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();
        if (reqData) setResellerRequest(reqData);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    if (!vpnClient) return;
    setIsRefreshing(true);
    try {
      const updated = await refreshVpnClient(vpnClient.id);
      if (updated) setVpnClient(updated);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApplyReseller = async () => {
    if (!user?.id) return;
    setIsApplyingReseller(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/apply-reseller`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ userId: user.id, message: applyMessage })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Reseller request submitted!');
        setShowApplyModal(false);
        setApplyMessage('');
        setResellerRequest(result.request);
      } else {
        toast.error(result.error || 'Failed to apply');
      }
    } catch (error) {
      toast.error('Failed to submit reseller request');
    } finally {
      setIsApplyingReseller(false);
    }
  };

  const handleCopyReferral = async () => {
    if (!reseller?.reseller_code) return;
    const link = `https://vpnhub.uk/auth?ref=${reseller.reseller_code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleCopyUrl = async () => {
    if (!vpnClient?.subscription_url) return;
    const success = await copySubscriptionUrl(vpnClient.subscription_url);
    if (success) {
      toast.success('Subscription URL copied');
    } else {
      toast.error('Failed to copy');
    }
  };

  const bgGradient = darkMode
    ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900'
    : 'bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50';
  const cardBg = darkMode ? 'bg-gray-800/80 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm';
  const cardBorder = darkMode ? 'border-gray-700' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-800';
  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-600';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgGradient}`}>
        <div className="text-center">
          <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4 ${
            darkMode ? 'border-purple-400' : 'border-purple-600'
          }`} />
          <p className={textPrimary}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const daysRemaining = vpnClient ? calculateDaysRemaining(vpnClient.expire_date) : 0;
  const isExpiringSoon = vpnClient && daysRemaining <= 7;
  const trafficPercent = vpnClient ? calculateTrafficPercentage(Number(vpnClient.used_gb), vpnClient.total_gb) : 0;
  const isTrafficLow = vpnClient && trafficPercent >= 80;

  const resellerStatus = userProfile?.reseller_status || 'none';
  const isReseller = resellerStatus === 'active';
  const isPending = resellerStatus === 'pending';
  const isRejected = resellerStatus === 'rejected';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold mb-1 ${textPrimary}`}>
            Welcome back, {userProfile?.full_name || 'User'}!
          </h1>
          <p className={`text-sm ${textSecondary}`}>Your VPN subscription overview</p>
        </div>
        <a
          href="/user/profile"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            darkMode ? 'text-purple-400 hover:text-purple-300 hover:bg-gray-800' : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
          }`}
        >
          <User className="w-4 h-4" />
          Edit Profile
        </a>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-2xl border shadow-sm p-6 ${cardBg} ${cardBorder}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              darkMode ? 'bg-purple-600/20' : 'bg-purple-100'
            }`}>
              <Shield className={`w-6 h-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div>
              <p className={`text-sm ${textMuted}`}>Active Plan</p>
              <p className={`text-xl font-bold ${textPrimary}`}>
                {vpnClient ? ((vpnClient as any).package?.name || 'VPN') : 'No Plan'}
              </p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border shadow-sm p-6 ${cardBg} ${cardBorder}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              darkMode ? 'bg-orange-600/20' : 'bg-orange-100'
            }`}>
              <Clock className={`w-6 h-6 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
            <div>
              <p className={`text-sm ${textMuted}`}>Expiry</p>
              <p className={`text-xl font-bold ${vpnClient ? (isExpiringSoon ? 'text-red-400' : textPrimary) : textMuted}`}>
                {vpnClient ? new Date(vpnClient.expire_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border shadow-sm p-6 ${cardBg} ${cardBorder}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              darkMode ? 'bg-green-600/20' : 'bg-green-100'
            }`}>
              <Wifi className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div>
              <p className={`text-sm ${textMuted}`}>Status</p>
              <p className={`text-xl font-bold capitalize ${
                vpnClient?.status === 'active' ? 'text-green-400' : textPrimary
              }`}>
                {vpnClient?.status || 'Inactive'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banners */}
      {isExpiringSoon && (
        <div className={`p-4 rounded-xl border ${
          darkMode ? 'bg-yellow-900/30 border-yellow-600/40' : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className="flex items-center gap-3">
            <AlertCircle className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <span className={`text-sm ${darkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
              Your subscription expires in {daysRemaining} days.
              <a href="/user/packages" className="underline ml-1 font-semibold">Renew now</a>
            </span>
          </div>
        </div>
      )}

      {isTrafficLow && (
        <div className={`p-4 rounded-xl border ${
          darkMode ? 'bg-red-900/30 border-red-600/40' : 'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-center gap-3">
            <AlertCircle className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
            <span className={`text-sm ${darkMode ? 'text-red-200' : 'text-red-800'}`}>
              You've used {trafficPercent}% of your traffic.{' '}
              <a href="/user/packages" className="underline ml-1 font-semibold">Upgrade</a>
            </span>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className={`lg:col-span-2 rounded-2xl border shadow-sm p-6 ${cardBg} ${cardBorder}`}>
          <h2 className={`text-lg font-semibold mb-4 ${textPrimary}`}>Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href="/user/packages" className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 hover:shadow-lg group ${
              darkMode ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-white'
            }`}>
              <div>
                <p className={`font-semibold text-sm mb-1 ${textPrimary}`}>Browse Packages</p>
                <p className={`text-xs ${textMuted}`}>Choose a VPN plan</p>
              </div>
              <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </a>

            <a href="/user/subscription" className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 hover:shadow-lg group ${
              darkMode ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-white'
            }`}>
              <div>
                <p className={`font-semibold text-sm mb-1 ${textPrimary}`}>Subscription</p>
                <p className={`text-xs ${textMuted}`}>Manage active plan</p>
              </div>
              <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </a>

            <a href="/user/orders" className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 hover:shadow-lg group ${
              darkMode ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-white'
            }`}>
              <div>
                <p className={`font-semibold text-sm mb-1 ${textPrimary}`}>Orders</p>
                <p className={`text-xs ${textMuted}`}>Track purchases</p>
              </div>
              <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </a>

            <a href="/user/profile" className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 hover:shadow-lg group ${
              darkMode ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-white'
            }`}>
              <div>
                <p className={`font-semibold text-sm mb-1 ${textPrimary}`}>Profile</p>
                <p className={`text-xs ${textMuted}`}>Update your details</p>
              </div>
              <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </a>
          </div>
        </div>

        {/* Subscription Details */}
        <div className={`rounded-2xl border shadow-sm p-6 ${cardBg} ${cardBorder}`}>
          <h2 className={`text-lg font-semibold mb-4 ${textPrimary}`}>Subscription Details</h2>
          {vpnClient ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${textMuted}`}>Package</span>
                <span className={`text-sm font-semibold ${textPrimary}`}>
                  {(vpnClient as any).package?.name || 'VPN Plan'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${textMuted}`}>Expires</span>
                <span className={`text-sm font-semibold ${textPrimary}`}>
                  {new Date(vpnClient.expire_date).toLocaleDateString()}
                </span>
              </div>

              {/* Subscription URL */}
              {vpnClient.subscription_url && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className={`text-xs font-medium mb-2 ${textMuted}`}>Subscription URL</p>
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 px-3 py-2 rounded-lg font-mono text-xs truncate border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'
                    }`}>
                      {vpnClient.subscription_url}
                    </div>
                    <button
                      onClick={handleCopyUrl}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'
                      }`}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className={`text-sm ${textMuted}`}>No active subscription</p>
              <a href="/user/packages" className="inline-block mt-3 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-all">
                Browse Packages
              </a>
            </div>
          )}
        </div>
      </div>

      {/* VPN Setup Guide */}
      {vpnClient && (
        <div className={`rounded-2xl border shadow-sm p-6 ${cardBg} ${cardBorder}`}>
          <h2 className={`text-lg font-semibold mb-4 ${textPrimary}`}>VPN Setup Guide</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Android', 'Windows', 'iPhone', 'Hiddify'].map((platform) => (
              <button
                key={platform}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  darkMode
                    ? 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30'
                    : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <ol className={`list-decimal list-inside space-y-2 text-sm ${textSecondary}`}>
              <li>Download a VPN client app (v2ray, Clash, Hiddify, etc.)</li>
              <li>Copy your subscription URL from above</li>
              <li>Open the app and import from clipboard</li>
              <li>Connect and start browsing securely</li>
            </ol>
          </div>
        </div>
      )}

      {/* Reseller Section */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${cardBg} ${cardBorder}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                darkMode ? 'bg-purple-600/20' : 'bg-purple-100'
              }`}>
                <Users className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${textPrimary}`}>Reseller Program</h2>
                <p className={`text-xs ${textMuted}`}>Earn commission by referring users</p>
              </div>
            </div>
          </div>

          {/* Not Applied */}
          {!isReseller && !isPending && !isRejected && (
            <div className="space-y-4">
              <p className={`text-sm ${textSecondary}`}>
                Join our reseller program and earn commissions on every package sold through your referrals.
              </p>
              <button
                onClick={() => setShowApplyModal(true)}
                className="px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-all duration-300"
              >
                Apply for Reseller
              </button>
            </div>
          )}

          {/* Pending */}
          {isPending && (
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-yellow-900/20 border border-yellow-600/30' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className="flex items-center gap-3">
                <Clock className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
                    Reseller request pending approval
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
                    We'll notify you once your request is reviewed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rejected */}
          {isRejected && (
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-red-900/20 border border-red-600/30' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-3">
                <AlertCircle className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-red-200' : 'text-red-800'}`}>
                    Your reseller request was rejected
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                    You may reapply at any time.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowApplyModal(true)}
                className="mt-3 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-all"
              >
                Reapply
              </button>
            </div>
          )}

          {/* Active Reseller */}
          {isReseller && reseller && (
            <div className="space-y-4">
              {/* Reseller Code */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${textMuted}`}>Your Referral Link</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    darkMode ? 'bg-purple-600/20 text-purple-300' : 'bg-purple-100 text-purple-600'
                  }`}>
                    Commission: {reseller.commission_rate}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`flex-1 px-3 py-2 rounded-lg font-mono text-sm border ${
                    darkMode ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
                  }`}>
                    https://vpnhub.uk/auth?ref={reseller.reseller_code}
                  </div>
                  <button
                    onClick={handleCopyReferral}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Reseller Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3 rounded-xl text-center ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <Users className={`w-5 h-5 mx-auto mb-1 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                  <p className={`text-lg font-bold ${textPrimary}`}>{reseller.total_users}</p>
                  <p className={`text-xs ${textMuted}`}>Users</p>
                </div>
                <div className={`p-3 rounded-xl text-center ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <ShoppingBag className={`w-5 h-5 mx-auto mb-1 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />
                  <p className={`text-lg font-bold ${textPrimary}`}>{reseller.total_packages_sold}</p>
                  <p className={`text-xs ${textMuted}`}>Packages Sold</p>
                </div>
                <div className={`p-3 rounded-xl text-center ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <TrendingUp className={`w-5 h-5 mx-auto mb-1 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
                  <p className={`text-lg font-bold text-green-400`}>¥{reseller.total_sales_amount.toLocaleString()}</p>
                  <p className={`text-xs ${textMuted}`}>Sales</p>
                </div>
                <div className={`p-3 rounded-xl text-center ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <DollarSign className={`w-5 h-5 mx-auto mb-1 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />
                  <p className={`text-lg font-bold text-purple-400`}>¥{reseller.total_profit_amount.toLocaleString()}</p>
                  <p className={`text-xs ${textMuted}`}>Profit</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Apply Reseller Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`rounded-2xl shadow-2xl max-w-md w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-6 border-b border-gray-700 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className={`text-xl font-bold ${textPrimary}`}>Apply for Reseller</h2>
                <button onClick={() => setShowApplyModal(false)} className="p-1 hover:bg-gray-700 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${textMuted}`}>Message (optional)</label>
                <textarea
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                  }`}
                  placeholder="Tell us why you want to become a reseller..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowApplyModal(false)}
                  className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyReseller}
                  disabled={isApplyingReseller}
                  className={`flex-1 py-2.5 rounded-lg font-medium text-sm text-white transition-all duration-300 ${
                    isApplyingReseller
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isApplyingReseller ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && vpnClient?.subscription_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className={`rounded-2xl p-6 max-w-sm w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="text-center mb-4">
              <h3 className={`text-xl font-bold ${textPrimary}`}>Scan to Import</h3>
              <p className={`text-sm ${textMuted}`}>Scan with your VPN client app</p>
            </div>
            <img src={generateQrCodeUrl(vpnClient.subscription_url)} alt="QR Code" className="w-64 h-64 mx-auto rounded-lg" />
            <button
              onClick={() => setShowQrModal(false)}
              className={`w-full mt-4 py-2.5 rounded-lg font-medium ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              } transition-colors`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
