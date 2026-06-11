import React, { useState, useEffect } from 'react';
import {
  Users, Search, Filter, ChevronLeft, ChevronRight, MoreVertical,
  UserCheck, UserX, Trash2, Key, Eye, Mail, Phone, Calendar,
  ShoppingBag, Server, X, TrendingUp, DollarSign, Percent,
  Award, CheckCircle, XCircle, Clock, UserPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { ResellerRequest, Reseller, ResellerRanked } from '../types';

export default function AdminResellers() {
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'approved'>('overview');
  const [resellers, setResellers] = useState<ResellerRanked[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ResellerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalResellers: 0,
    pendingRequests: 0,
    totalResellerUsers: 0,
    totalSales: 0,
    totalProfit: 0,
    topReseller: null as Reseller | null
  });
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ResellerRequest | null>(null);
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);
  const [commissionRate, setCommissionRate] = useState(10);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch resellers
      const { data: resellersData } = await supabase
        .from('resellers')
        .select(`
          *,
          user:user_profiles(user_id, full_name)
        `)
        .order('total_users', { ascending: false });

      const ranked: ResellerRanked[] = (resellersData || []).map((r, i) => ({ ...r, rank: i + 1 }));
      setResellers(ranked);

      // Fetch pending requests
      const { data: requests } = await supabase
        .from('reseller_requests')
        .select(`
          *,
          user:user_profiles(user_id, full_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setPendingRequests(requests || []);

      // Calculate stats
      const { count: total } = await supabase
        .from('resellers')
        .select('*', { count: 'exact', head: true });

      const { count: pending } = await supabase
        .from('reseller_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: users } = await supabase
        .from('reseller_users')
        .select('*', { count: 'exact', head: true });

      const { data: commissions } = await supabase
        .from('reseller_commissions')
        .select('package_price, commission_amount')
        .eq('status', 'approved');

      const totalSales = (commissions || []).reduce((sum, c) => sum + (c.package_price || 0), 0);
      const totalProfit = (commissions || []).reduce((sum, c) => sum + (c.commission_amount || 0), 0);

      setStats({
        totalResellers: total || 0,
        pendingRequests: pending || 0,
        totalResellerUsers: users || 0,
        totalSales: totalSales,
        totalProfit: totalProfit,
        topReseller: ranked[0] || null
      });
    } catch (error) {
      console.error('Error fetching resellers:', error);
      toast.error('Failed to load reseller data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-reseller`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          resellerRequestId: selectedRequest.id,
          commissionRate
        })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Reseller approved successfully');
        setShowApproveModal(false);
        setSelectedRequest(null);
        fetchData();
      } else {
        toast.error(result.error || 'Failed to approve');
      }
    } catch (error) {
      toast.error('Failed to approve reseller');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reject-reseller`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          resellerRequestId: selectedRequest.id,
          reason: rejectReason
        })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Reseller request rejected');
        setShowRejectModal(false);
        setSelectedRequest(null);
        setRejectReason('');
        fetchData();
      } else {
        toast.error(result.error || 'Failed to reject');
      }
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const handleUpdateCommission = async () => {
    if (!selectedReseller) return;
    try {
      const { error } = await supabase
        .from('resellers')
        .update({ commission_rate: commissionRate, updated_at: new Date().toISOString() })
        .eq('id', selectedReseller.id);
      if (error) throw error;
      toast.success('Commission rate updated');
      setShowCommissionModal(false);
      setSelectedReseller(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update commission');
    }
  };

  const handleSuspend = async (resellerId: string) => {
    if (!confirm('Are you sure you want to suspend this reseller?')) return;
    try {
      const { error } = await supabase
        .from('resellers')
        .update({ status: 'suspended', updated_at: new Date().toISOString() })
        .eq('id', resellerId);
      if (error) throw error;
      toast.success('Reseller suspended');
      fetchData();
    } catch (error) {
      toast.error('Failed to suspend reseller');
    }
  };

  const handleActivate = async (resellerId: string) => {
    try {
      const { error } = await supabase
        .from('resellers')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', resellerId);
      if (error) throw error;
      toast.success('Reseller activated');
      fetchData();
    } catch (error) {
      toast.error('Failed to activate reseller');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reseller Management</h1>
          <p className="text-gray-400 mt-1">Manage reseller requests and track performance</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Resellers</p>
              <p className="text-xl font-bold text-white">{stats.totalResellers}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Pending Requests</p>
              <p className="text-xl font-bold text-white">{stats.pendingRequests}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Reseller Users</p>
              <p className="text-xl font-bold text-white">{stats.totalResellerUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Sales</p>
              <p className="text-xl font-bold text-white">¥{stats.totalSales.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Profit</p>
              <p className="text-xl font-bold text-white">¥{stats.totalProfit.toLocaleString()}</p>
            </div>
          </div>
        </div>
        {stats.topReseller && (
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Top Reseller</p>
                <p className="text-lg font-bold text-white truncate">{(stats.topReseller as any)?.user?.full_name || 'Unknown'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {[
          { id: 'overview', label: 'Overview', count: resellers.length },
          { id: 'pending', label: 'Pending Requests', count: pendingRequests.length },
          { id: 'approved', label: 'Approved Resellers', count: resellers.filter(r => r.status === 'active').length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Pending Requests */}
      {activeTab === 'pending' && (
        <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Message</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Requested</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : pendingRequests.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No pending requests</td></tr>
                ) : (
                  pendingRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
                            {(req.user?.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white font-medium">{req.user?.full_name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{req.user?.email || 'N/A'}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm max-w-xs truncate">{req.requested_message || 'No message'}</td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(req.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded">Pending</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setSelectedRequest(req); setCommissionRate(10); setShowApproveModal(true); }}
                            className="px-3 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg text-sm transition-colors"
                          >
                            <CheckCircle className="w-4 h-4 inline mr-1" />Approve
                          </button>
                          <button
                            onClick={() => { setSelectedRequest(req); setShowRejectModal(true); }}
                            className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm transition-colors"
                          >
                            <XCircle className="w-4 h-4 inline mr-1" />Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approved Resellers / Overview */}
      {(activeTab === 'overview' || activeTab === 'approved') && (
        <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Reseller</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Commission</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Users</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Packages Sold</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Sales</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Profit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : resellers.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No resellers found</td></tr>
                ) : (
                  resellers.map((reseller) => (
                    <tr key={reseller.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          reseller.rank === 1 ? 'bg-yellow-600/20 text-yellow-400' :
                          reseller.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                          reseller.rank === 3 ? 'bg-orange-600/20 text-orange-400' :
                          'bg-gray-700 text-gray-400'
                        }`}>
                          #{reseller.rank}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
                            {(reseller.user?.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-white font-medium">{reseller.user?.full_name || 'Unknown'}</div>
                            <div className="text-xs text-gray-400">{reseller.reseller_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          reseller.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          reseller.status === 'suspended' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-700 text-gray-400'
                        }`}>
                          {reseller.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white">{reseller.commission_rate}%</td>
                      <td className="px-4 py-3 text-white">{reseller.total_users}</td>
                      <td className="px-4 py-3 text-white">{reseller.total_packages_sold}</td>
                      <td className="px-4 py-3 text-green-400 font-medium">¥{reseller.total_sales_amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-purple-400 font-medium">¥{reseller.total_profit_amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setSelectedReseller(reseller); setCommissionRate(reseller.commission_rate); setShowCommissionModal(true); }}
                            className="p-1.5 rounded bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600"
                            title="Edit Commission"
                          >
                            <Percent className="w-4 h-4" />
                          </button>
                          {reseller.status === 'active' ? (
                            <button
                              onClick={() => handleSuspend(reseller.id)}
                              className="p-1.5 rounded bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30"
                              title="Suspend"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(reseller.id)}
                              className="p-1.5 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30"
                              title="Activate"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Approve Reseller</h2>
              <button onClick={() => setShowApproveModal(false)} className="p-1 hover:bg-gray-700 rounded"><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowApproveModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                <button onClick={handleApprove} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">Approve Reseller</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Reject Reseller Request</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Reason (optional)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Enter reason for rejection..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                <button onClick={handleReject} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">Reject</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commission Modal */}
      {showCommissionModal && selectedReseller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Edit Commission Rate</h2>
              <button onClick={() => setShowCommissionModal(false)} className="p-1 hover:bg-gray-700 rounded"><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowCommissionModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                <button onClick={handleUpdateCommission} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
