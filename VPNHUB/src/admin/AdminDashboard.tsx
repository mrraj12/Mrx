import React, { useState, useEffect } from 'react';
import {
  Users,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Server,
  AlertCircle,
  DollarSign,
  Activity,
  TrendingUp,
  HardDrive,
  Percent
} from 'lucide-react';
import { getDashboardStats } from '../lib/adminService';
import type { DashboardStats } from '../types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'purple' | 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  change?: string;
}

const colorClasses = {
  purple: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  blue: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  green: 'bg-green-600/20 text-green-400 border-green-600/30',
  yellow: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  red: 'bg-red-600/20 text-red-400 border-red-600/30',
  gray: 'bg-gray-600/20 text-gray-400 border-gray-600/30'
};

function StatCard({ title, value, icon: Icon, color, change }: StatCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {change && (
          <div className={`flex items-center text-sm ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
            <TrendingUp className="w-4 h-4 mr-1" />
            {change}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-400">{title}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
    // Refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const orderStats = {
    pending: stats?.pending_orders || 0,
    approved: stats?.approved_orders || 0,
    rejected: stats?.rejected_orders || 0,
    total: stats?.total_orders || 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-gray-400">VPN subscription management overview</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats?.total_users || 0}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Total Orders"
          value={stats?.total_orders || 0}
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="Active VPN Clients"
          value={stats?.active_vpn_clients || 0}
          icon={Server}
          color="green"
        />
        <StatCard
          title="Total Revenue"
          value={`¥${stats?.total_revenue?.toLocaleString() || 0}`}
          icon={DollarSign}
          color="yellow"
        />
      </div>

      {/* Reseller Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Resellers"
          value={stats?.total_resellers || 0}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Pending Reseller Requests"
          value={stats?.pending_reseller_requests || 0}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Reseller Users"
          value={stats?.total_reseller_users || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Reseller Profit"
          value={`¥${stats?.total_reseller_profit?.toLocaleString() || 0}`}
          icon={DollarSign}
          color="green"
        />
      </div>

      {/* Order Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-purple-400" />
            Order Status
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-400" />
                <span className="text-gray-300">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-white">{orderStats.pending}</span>
                {orderStats.pending > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full">
                    Action Required
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">Approved</span>
              </div>
              <span className="text-xl font-bold text-white">{orderStats.approved}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="text-gray-300">Rejected</span>
              </div>
              <span className="text-xl font-bold text-white">{orderStats.rejected}</span>
            </div>
          </div>

          {/* Order Progress */}
          {orderStats.total > 0 && (
            <div className="mt-4">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
                <div
                  className="bg-green-500"
                  style={{ width: `${(orderStats.approved / orderStats.total) * 100}%` }}
                />
                <div
                  className="bg-yellow-500"
                  style={{ width: `${(orderStats.pending / orderStats.total) * 100}%` }}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${(orderStats.rejected / orderStats.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* VPN Client Status */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-400" />
            VPN Client Status
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">Active</span>
              </div>
              <span className="text-xl font-bold text-white">{stats?.active_vpn_clients || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <span className="text-gray-300">Suspended</span>
              </div>
              <span className="text-xl font-bold text-white">{stats?.suspended_vpn_clients || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">Expired</span>
              </div>
              <span className="text-xl font-bold text-white">{stats?.expired_vpn_clients || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic Stats */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-purple-400" />
          Traffic Statistics
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-700/50 rounded-lg text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {stats?.total_traffic_used_gb?.toFixed(1) || '0'}
            </div>
            <div className="text-sm text-gray-400">GB Used</div>
          </div>

          <div className="p-4 bg-gray-700/50 rounded-lg text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {((stats?.total_traffic_used_gb || 0) / 1000).toFixed(2)}
            </div>
            <div className="text-sm text-gray-400">TB Total</div>
          </div>

          <div className="p-4 bg-gray-700/50 rounded-lg text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {stats?.total_users || 0}
            </div>
            <div className="text-sm text-gray-400">Active Users</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {orderStats.pending > 0 && (
        <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-400" />
            <div>
              <div className="font-medium text-white">Pending Orders Require Attention</div>
              <div className="text-sm text-yellow-200">
                {orderStats.pending} order(s) waiting for review and approval
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
