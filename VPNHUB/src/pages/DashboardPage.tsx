import React, { useState, useEffect } from 'react';
import { Shield, Clock, CheckCircle, AlertCircle, Download, Eye } from 'lucide-react';
import { getUserOrders } from '../lib/supabase';
import toast from 'react-hot-toast';

interface DashboardPageProps {
  darkMode: boolean;
  user: any;
  userProfile: any;
}

export default function DashboardPage({ darkMode, user, userProfile }: DashboardPageProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserOrders();
  }, [user]);

  const loadUserOrders = async () => {
    if (!user) return;
    
    try {
      const userOrders = await getUserOrders(user.id);
      setOrders(userOrders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return darkMode ? 'text-green-400' : 'text-green-600';
      case 'payment_submitted':
        return darkMode ? 'text-yellow-400' : 'text-yellow-600';
      case 'pending':
        return darkMode ? 'text-blue-400' : 'text-blue-600';
      default:
        return darkMode ? 'text-gray-400' : 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5" />;
      case 'payment_submitted':
        return <Clock className="w-5 h-5" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900' 
          : 'bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50'
      }`}>
        <div className="text-center">
          <div className={`w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4 ${
            darkMode ? 'border-purple-400' : 'border-purple-600'
          }`}></div>
          <p className={`text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900' 
        : 'bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50'
    }`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className={`rounded-2xl p-8 mb-8 ${
          darkMode ? 'bg-gray-800/50' : 'bg-white/70'
        } backdrop-blur-sm shadow-xl`}>
          <div className="flex items-center space-x-4 mb-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              darkMode ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-gradient-to-r from-purple-500 to-blue-500'
            } text-white text-2xl font-bold shadow-lg`}>
              {userProfile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${
                darkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Welcome back, {userProfile?.full_name || 'User'}!
              </h1>
              <p className={`text-lg ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Manage your VPN subscriptions and orders
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`p-6 rounded-2xl ${
            darkMode ? 'bg-gray-800/50' : 'bg-white/70'
          } backdrop-blur-sm shadow-xl`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Total Orders
                </p>
                <p className={`text-3xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  {orders.length}
                </p>
              </div>
              <Shield className={`w-12 h-12 ${
                darkMode ? 'text-purple-400' : 'text-purple-600'
              }`} />
            </div>
          </div>

          <div className={`p-6 rounded-2xl ${
            darkMode ? 'bg-gray-800/50' : 'bg-white/70'
          } backdrop-blur-sm shadow-xl`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Active Plans
                </p>
                <p className={`text-3xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  {orders.filter(order => order.order_status === 'completed').length}
                </p>
              </div>
              <CheckCircle className={`w-12 h-12 ${
                darkMode ? 'text-green-400' : 'text-green-600'
              }`} />
            </div>
          </div>

          <div className={`p-6 rounded-2xl ${
            darkMode ? 'bg-gray-800/50' : 'bg-white/70'
          } backdrop-blur-sm shadow-xl`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Pending Orders
                </p>
                <p className={`text-3xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  {orders.filter(order => order.order_status !== 'completed').length}
                </p>
              </div>
              <Clock className={`w-12 h-12 ${
                darkMode ? 'text-yellow-400' : 'text-yellow-600'
              }`} />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className={`rounded-2xl overflow-hidden ${
          darkMode ? 'bg-gray-800/50' : 'bg-white/70'
        } backdrop-blur-sm shadow-xl`}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className={`text-2xl font-bold ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Your Orders
            </h2>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className={`w-16 h-16 mx-auto mb-4 ${
                darkMode ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <h3 className={`text-xl font-semibold mb-2 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                No orders yet
              </h3>
              <p className={`${
                darkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Start by choosing a VPN plan that fits your needs
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${
                  darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Plan
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Price
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Status
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Date
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => (
                    <tr key={order.id} className={`border-t ${
                      darkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                      <td className={`px-6 py-4 ${
                        darkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                        <div>
                          <div className="font-semibold">{order.plan_title}</div>
                          <div className={`text-sm ${
                            darkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            Order #{order.id.slice(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className={`px-6 py-4 font-semibold ${
                        darkMode ? 'text-purple-400' : 'text-purple-600'
                      }`}>
                        {order.plan_price}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center space-x-2 ${getStatusColor(order.order_status)}`}>
                          {getStatusIcon(order.order_status)}
                          <span className="capitalize font-medium">
                            {order.order_status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button className={`p-2 rounded-lg transition-colors ${
                            darkMode 
                              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                          }`}>
                            <Eye className="w-4 h-4" />
                          </button>
                          {order.order_status === 'completed' && (
                            <button className={`p-2 rounded-lg transition-colors ${
                              darkMode 
                                ? 'text-green-400 hover:text-green-300 hover:bg-gray-700' 
                                : 'text-green-600 hover:text-green-700 hover:bg-gray-100'
                            }`}>
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}