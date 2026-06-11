import React, { useState, useEffect } from 'react';
import { Eye, Clock, CheckCircle, XCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { getUserOrdersWithPackages } from '../lib/vpnService';
import type { Order } from '../types';

interface UserOrdersProps {
  darkMode: boolean;
  user: any;
  userProfile: any;
}

export default function UserOrders({ darkMode, user, userProfile }: UserOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const cardBg = darkMode ? 'bg-gray-800/80 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm';
  const cardBorder = darkMode ? 'border-gray-700' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-800';
  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-600';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await getUserOrdersWithPackages();
      setOrders(data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      active: darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700',
      approved: darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700',
      pending: darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
      rejected: darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700',
      expired: darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-600',
      cancelled: darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-600',
    };
    return statusStyles[status] || (darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-600');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin border-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${textPrimary}`}>My Orders</h1>
        <p className={`text-sm ${textMuted}`}>Track your purchases and subscriptions</p>
      </div>

      {orders.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${cardBg} ${cardBorder}`}>
          <Shield className="w-12 h-12 mx-auto mb-4 text-purple-400" />
          <h3 className={`text-lg font-medium ${textPrimary} mb-2`}>No orders yet</h3>
          <p className={`text-sm ${textMuted} mb-4`}>Browse our packages to get started</p>
          <a
            href="/user/packages"
            className="inline-block px-6 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Browse Packages
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order, idx) => {
            const pkgName = (order as any).package?.name || 'VPN Plan';
            const pkgPrice = (order as any).package?.price || 0;
            return (
              <div
                key={order.id}
                className={`rounded-xl border p-4 flex items-center justify-between transition-all hover:shadow-md ${cardBg} ${cardBorder}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm font-medium ${textPrimary}`}>Order #{order.id.slice(0, 6)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusBadge(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status}
                      </span>
                    </div>
                    <p className={`text-sm ${textMuted}`}>
                      {pkgName} - ${pkgPrice} | {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`rounded-2xl shadow-2xl max-w-md w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-xl font-bold ${textPrimary}`}>Order Details</h2>
                <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className={textMuted}>Order ID</span>
                <span className={`text-sm font-mono ${textPrimary}`}>{selectedOrder.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={textMuted}>Package</span>
                <span className={`text-sm font-medium ${textPrimary}`}>{(selectedOrder as any).package?.name || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={textMuted}>Amount</span>
                <span className={`text-sm font-medium ${textPrimary}`}>${(selectedOrder as any).package?.price || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={textMuted}>Status</span>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={textMuted}>Date</span>
                <span className={`text-sm ${textPrimary}`}>{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
