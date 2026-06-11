import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  UserCheck,
  UserX,
  Trash2,
  Key,
  Eye,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  Server,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllUsers, getUserById, suspendUser, activateUser, deleteUser, resetUserPassword } from '../lib/adminService';
import type { UserWithProfile, UserFilters } from '../types';

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const pageSize = 15;

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const filters: UserFilters = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      if (search) {
        filters.search = search;
      }

      const result = await getAllUsers(filters, page, pageSize);
      setUsers(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleViewUser = async (userId: string) => {
    try {
      const user = await getUserById(userId);
      if (user) {
        setSelectedUser(user);
        setShowUserModal(true);
      }
    } catch (error) {
      toast.error('Failed to load user details');
    }
    setShowActionMenu(null);
  };

  const handleSuspendUser = async () => {
    if (!actionUserId || !suspendReason.trim()) {
      toast.error('Please provide a reason for suspension');
      return;
    }

    try {
      const result = await suspendUser(actionUserId, suspendReason);
      if (result.success) {
        toast.success('User suspended successfully');
        fetchUsers();
      } else {
        toast.error(result.error || 'Failed to suspend user');
      }
    } catch (error) {
      toast.error('Failed to suspend user');
    } finally {
      setShowSuspendModal(false);
      setSuspendReason('');
      setActionUserId(null);
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      const result = await activateUser(userId);
      if (result.success) {
        toast.success('User activated successfully');
        fetchUsers();
      } else {
        toast.error(result.error || 'Failed to activate user');
      }
    } catch (error) {
      toast.error('Failed to activate user');
    }
    setShowActionMenu(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteUser(userId);
      if (result.success) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        toast.error(result.error || 'Failed to delete user');
      }
    } catch (error) {
      toast.error('Failed to delete user');
    }
    setShowActionMenu(null);
  };

  const handleResetPassword = async () => {
    if (!actionUserId || !newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      const result = await resetUserPassword(actionUserId, newPassword);
      if (result.success) {
        toast.success('Password reset successfully');
      } else {
        toast.error(result.error || 'Failed to reset password');
      }
    } catch (error) {
      toast.error('Failed to reset password');
    } finally {
      setShowResetModal(false);
      setNewPassword('');
      setActionUserId(null);
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
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-1">Manage registered users</p>
        </div>
        <div className="text-sm text-gray-400">
          Total Users: <span className="text-white font-medium">{total}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </form>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Users</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Contact</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Orders</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Subscriptions</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Joined</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
                          {(user.profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {user.profile?.full_name || 'No name'}
                          </div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-gray-300">
                          <Mail className="w-4 h-4" />
                          {user.profile?.email_verified ? (
                            <span className="text-green-400">Verified</span>
                          ) : (
                            <span className="text-yellow-400">Unverified</span>
                          )}
                        </div>
                        {user.profile?.phone && (
                          <div className="flex items-center gap-1 text-gray-400 mt-1">
                            <Phone className="w-4 h-4" />
                            {user.profile.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.profile?.is_suspended ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400">
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-300">
                        <ShoppingBag className="w-4 h-4 text-gray-400" />
                        {user.orders_count || 0}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-300">
                        <Server className="w-4 h-4 text-gray-400" />
                        {user.active_subscriptions || 0} active
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-300 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(user.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          onClick={() => setShowActionMenu(showActionMenu === user.id ? null : user.id)}
                          className="p-1 hover:bg-gray-600 rounded"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>
                        {showActionMenu === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowActionMenu(null)}
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-gray-700 rounded-lg shadow-lg border border-gray-600 z-50">
                              <button
                                onClick={() => handleViewUser(user.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-gray-600 rounded-t-lg"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                              {user.profile?.is_suspended ? (
                                <button
                                  onClick={() => handleActivateUser(user.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-green-400 hover:bg-gray-600"
                                >
                                  <UserCheck className="w-4 h-4" />
                                  Activate
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setActionUserId(user.id);
                                    setShowSuspendModal(true);
                                    setShowActionMenu(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-yellow-400 hover:bg-gray-600"
                                >
                                  <UserX className="w-4 h-4" />
                                  Suspend
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setActionUserId(user.id);
                                  setShowResetModal(true);
                                  setShowActionMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-blue-400 hover:bg-gray-600"
                              >
                                <Key className="w-4 h-4" />
                                Reset Password
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-gray-600 rounded-b-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-700">
            <div className="text-sm text-gray-400">
              Showing page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-gray-700 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-gray-700 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">User Details</h2>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <div className="text-white">{selectedUser.email}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Full Name</label>
                  <div className="text-white">{selectedUser.profile?.full_name || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Phone</label>
                  <div className="text-white">{selectedUser.profile?.phone || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Status</label>
                  <div className="text-white">
                    {selectedUser.profile?.is_suspended ? 'Suspended' : 'Active'}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Joined</label>
                  <div className="text-white">{formatDate(selectedUser.created_at)}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Last Login</label>
                  <div className="text-white">
                    {selectedUser.profile?.last_login_at
                      ? formatDate(selectedUser.profile.last_login_at)
                      : 'Never'}
                  </div>
                </div>
              </div>

              {selectedUser.orders && selectedUser.orders.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Recent Orders</h3>
                  <div className="space-y-2">
                    {selectedUser.orders.slice(0, 5).map((order: any) => (
                      <div key={order.id} className="bg-gray-700 rounded p-3">
                        <div className="flex justify-between">
                          <span className="text-gray-300">{order.plan_title}</span>
                          <span className={`text-sm ${
                            order.order_status === 'approved' ? 'text-green-400' :
                            order.order_status === 'rejected' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {order.order_status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {formatDate(order.created_at)} - {order.plan_price}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedUser.vpn_clients && selectedUser.vpn_clients.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">VPN Subscriptions</h3>
                  <div className="space-y-2">
                    {selectedUser.vpn_clients.map((client: any) => (
                      <div key={client.id} className="bg-gray-700 rounded p-3">
                        <div className="flex justify-between">
                          <span className="text-gray-300">
                            {client.package?.name || 'Unknown Package'}
                          </span>
                          <span className={`text-sm ${
                            client.status === 'active' ? 'text-green-400' :
                            client.status === 'expired' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {client.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {client.remaining_gb} GB remaining - Expires {formatDate(client.expire_date)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Suspend User</h2>
            </div>
            <div className="p-4">
              <label className="block text-sm text-gray-400 mb-2">Reason for suspension</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                placeholder="Enter reason..."
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowSuspendModal(false);
                    setSuspendReason('');
                    setActionUserId(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSuspendUser}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
                >
                  Suspend
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Reset Password</h2>
            </div>
            <div className="p-4">
              <label className="block text-sm text-gray-400 mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                placeholder="Enter new password (min 6 characters)..."
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setNewPassword('');
                    setActionUserId(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
