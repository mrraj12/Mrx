import React, { useState, useEffect } from 'react';
import {
  Copy, CheckCircle, Zap, Clock, Globe, AlertCircle,
  RefreshCw, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getUserVpnClient, calculateDaysRemaining, generateQrCodeUrl,
  copySubscriptionUrl, refreshVpnClient
} from '../lib/vpnService';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import type { VpnClient } from '../types';

interface UserSubscriptionProps {
  darkMode: boolean;
  user: any;
  userProfile: any;
}

export default function UserSubscription({ darkMode, user, userProfile }: UserSubscriptionProps) {
  const [vpnClient, setVpnClient] = useState<VpnClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  // Realtime: auto-update when subscription changes (e.g. after regeneration)
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
      const client = await getUserVpnClient();
      setVpnClient(client);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!vpnClient) return;
    setIsRefreshing(true);
    try {
      const updated = await refreshVpnClient(vpnClient.id);
      if (updated) setVpnClient(updated);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopy = async () => {
    if (!vpnClient?.subscription_url) return;
    const success = await copySubscriptionUrl(vpnClient.subscription_url);
    if (success) {
      setCopied(true);
      toast.success('Subscription URL copied');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy');
    }
  };

  const cardBg = darkMode ? 'bg-gray-800/80 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm';
  const cardBorder = darkMode ? 'border-gray-700' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-800';
  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-600';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin border-purple-600" />
      </div>
    );
  }

  if (!vpnClient) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className={`text-2xl font-bold mb-1 ${textPrimary}`}>My Subscription</h1>
          <p className={textSecondary}>Your VPN subscription details</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-12 text-center ${cardBg} ${cardBorder}`}>
          <Shield className="w-12 h-12 mx-auto mb-4 text-purple-400" />
          <h3 className={`text-lg font-medium ${textPrimary} mb-2`}>No Active Subscription</h3>
          <p className={`text-sm ${textMuted} mb-4`}>You don't have an active VPN subscription yet.</p>
          <a
            href="/user/packages"
            className="inline-block px-6 py-2.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors"
          >
            Browse Packages
          </a>
        </div>
      </div>
    );
  }

  const daysRemaining = calculateDaysRemaining(vpnClient.expire_date);
  const isExpiringSoon = daysRemaining <= 7;
  const trafficPercent = vpnClient.total_gb > 0 ? (vpnClient.used_gb / vpnClient.total_gb) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold mb-1 ${textPrimary}`}>My Subscription</h1>
        <p className={textSecondary}>Your VPN subscription details</p>
      </div>

      {/* Status Cards Row */}
      <div className={`rounded-2xl border shadow-sm p-6 ${cardBg} ${cardBorder}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Package */}
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              darkMode ? 'bg-purple-600/20' : 'bg-purple-100'
            }`}>
              <Zap className={`w-6 h-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div>
              <p className={`text-sm ${textMuted}`}>Package</p>
              <p className={`text-lg font-bold ${textPrimary}`}>
                {(vpnClient as any).package?.name || 'VPN Plan'}
              </p>
            </div>
          </div>

          {/* Expiry */}
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              darkMode ? 'bg-orange-600/20' : 'bg-orange-100'
            }`}>
              <Clock className={`w-6 h-6 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
            <div>
              <p className={`text-sm ${textMuted}`}>Expiry</p>
              <p className={`text-lg font-bold ${isExpiringSoon ? 'text-red-400' : textPrimary}`}>
                {new Date(vpnClient.expire_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              darkMode ? 'bg-green-600/20' : 'bg-green-100'
            }`}>
              <Globe className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div>
              <p className={`text-sm ${textMuted}`}>Status</p>
              <p className={`text-lg font-bold capitalize ${
                vpnClient.status === 'active' ? 'text-green-400' : textPrimary
              }`}>
                {vpnClient.status}
              </p>
            </div>
          </div>
        </div>

        {/* Subscription URL */}
        {vpnClient.subscription_url && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${textMuted}`}>Subscription URL</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <RefreshCw className={`w-4 h-4 ${textMuted} ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex-1 px-4 py-3 rounded-lg font-mono text-xs truncate border ${
                darkMode ? 'bg-gray-700/50 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}>
                {vpnClient.subscription_url}
              </div>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-300 ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Traffic Usage */}
      <div className={`rounded-2xl border shadow-sm p-6 ${cardBg} ${cardBorder}`}>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-sm font-medium ${textMuted}`}>Traffic Usage</span>
          <span className={`text-sm font-medium ${textPrimary}`}>
            {vpnClient.used_gb?.toFixed(1)} GB / {vpnClient.total_gb} GB
          </span>
        </div>
        <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              trafficPercent > 80
                ? 'bg-red-500'
                : trafficPercent > 50
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, trafficPercent)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className={`text-xs ${textMuted}`}>{vpnClient.used_gb?.toFixed(1)} GB used</span>
          <span className={`text-xs ${textMuted}`}>
            {(vpnClient.total_gb - (vpnClient.used_gb || 0)).toFixed(1)} GB remaining
          </span>
        </div>
      </div>

      {/* Warning Banner */}
      {isExpiringSoon && (
        <div className={`rounded-xl p-4 border ${
          darkMode ? 'bg-yellow-900/30 border-yellow-600/40' : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className="flex items-center gap-3">
            <AlertCircle className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <span className={`text-sm font-medium ${darkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
              Your subscription expires in {daysRemaining} days.{' '}
              <a href="/user/packages" className="underline">Renew now</a> to avoid interruption.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
