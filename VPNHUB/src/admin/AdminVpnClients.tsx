import React, { useState, useEffect } from 'react';
import {
  Search,
  Server,
  Play,
  Pause,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Copy,
  QrCode,
  Loader2,
  Wifi,
  RefreshCw
} from 'lucide-react';
import { getAllVpnClients, suspendVpnClient, activateVpnClient, deleteVpnClient, regenerateSubscription } from '../lib/adminService';
import type { VpnClient, VpnClientStatus } from '../types';
import toast from 'react-hot-toast';

const statusColors: Record<VpnClientStatus, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  suspended: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  expired: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  deleted: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const statusLabels: Record<VpnClientStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  expired: 'Expired',
  deleted: 'Deleted'
};

export default function AdminVpnClients() {
  const [clients, setClients] = useState<VpnClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VpnClientStatus | ''>('');
  const [selectedClient, setSelectedClient] = useState<VpnClient | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadClients();
  }, [page, statusFilter]);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const result = await getAllVpnClients(
        {
          search: search || undefined,
          status: statusFilter || undefined
        },
        page,
        pageSize
      );
      setClients(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load clients:', error);
      toast.error('Failed to load VPN clients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadClients();
  };

  const handleSuspend = async (clientId: string) => {
    setIsProcessing(true);
    try {
      const result = await suspendVpnClient(clientId);
      if (result.success) {
        toast.success('Client suspended');
        loadClients();
      } else {
        toast.error(result.error || 'Failed to suspend client');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to suspend client');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActivate = async (clientId: string) => {
    setIsProcessing(true);
    try {
      const result = await activateVpnClient(clientId);
      if (result.success) {
        toast.success('Client activated');
        loadClients();
      } else {
        toast.error(result.error || 'Failed to activate client');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to activate client');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this VPN client? This action cannot be undone.')) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await deleteVpnClient(clientId);
      if (result.success) {
        toast.success('Client deleted');
        setShowModal(false);
        loadClients();
      } else {
        toast.error(result.error || 'Failed to delete client');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete client');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const getTrafficPercentage = (used: number, total: number) => {
    if (total <= 0) return 0;
    return Math.min(100, (used / total) * 100);
  };

  const getDaysRemaining = (expireDate: string) => {
    const now = new Date();
    const expire = new Date(expireDate);
    const diff = expire.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">VPN Clients</h1>
        <p className="text-gray-400">Manage active and suspended VPN subscriptions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by email or UUID..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pl-10 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as VpnClientStatus | '');
            setPage(1);
          }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
          <option value="deleted">Deleted</option>
        </select>

        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Search
        </button>
      </div>

      {/* Clients Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Package
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Traffic
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Node
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto" />
                    <p className="text-gray-400 mt-2">Loading clients...</p>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    No VPN clients found
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const trafficPercent = getTrafficPercentage(Number(client.used_gb), client.total_gb);
                  const daysRemaining = getDaysRemaining(client.expire_date);

                  return (
                    <tr key={client.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="text-white font-medium">{client.email}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <span className="font-mono">{client.client_uuid.substring(0, 8)}...</span>
                          <button
                            onClick={() => copyToClipboard(client.client_uuid)}
                            className="hover:text-purple-400"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-white">{(client as any).package?.name || client.total_gb + 'GB'}</div>
                        <div className="text-xs text-gray-400">{client.device_limit} device(s)</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden w-24">
                            <div
                              className={`h-full ${trafficPercent > 80 ? 'bg-red-500' : trafficPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${trafficPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {client.used_gb?.toFixed(1)}/{client.total_gb}GB
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Wifi className="w-4 h-4 text-gray-400" />
                          <div className="text-white">
                            {(client as any).node?.city || (client as any).node?.country || 'Unknown'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-white">{formatDate(client.expire_date)}</div>
                        <div className={`text-xs ${daysRemaining <= 7 ? 'text-red-400' : 'text-gray-400'}`}>
                          {daysRemaining} days left
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${statusColors[client.status as VpnClientStatus]}`}>
                          {statusLabels[client.status as VpnClientStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {client.status === 'active' && (
                            <button
                              onClick={() => handleSuspend(client.id)}
                              className="p-2 text-yellow-400 hover:bg-yellow-400/20 rounded-lg transition-colors"
                              title="Suspend"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          )}
                          {client.status === 'suspended' && (
                            <button
                              onClick={() => handleActivate(client.id)}
                              className="p-2 text-green-400 hover:bg-green-400/20 rounded-lg transition-colors"
                              title="Activate"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          {client.status !== 'deleted' && (
                            <button
                              onClick={() => handleDelete(client.id)}
                              className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedClient(client);
                              setShowModal(true);
                            }}
                            className="p-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} clients
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-white px-3 py-1 bg-gray-800 rounded-lg">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Client Detail Modal */}
      {showModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 rounded-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">VPN Client Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircle className="w-6 h-6" style={{ fill: 'none', stroke: 'currentColor' }} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <div className="text-white">{selectedClient.email}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">UUID</label>
                  <div className="text-white text-sm font-mono flex items-center gap-1">
                    {selectedClient.client_uuid.substring(0, 16)}...
                    <button onClick={() => copyToClipboard(selectedClient.client_uuid)}>
                      <Copy className="w-4 h-4 text-gray-400 hover:text-purple-400" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Status</label>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${statusColors[selectedClient.status as VpnClientStatus]}`}>
                    {statusLabels[selectedClient.status as VpnClientStatus]}
                  </span>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Device Limit</label>
                  <div className="text-white">{selectedClient.device_limit}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Total Traffic</label>
                  <div className="text-white">{selectedClient.total_gb} GB</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Used Traffic</label>
                  <div className="text-white">{selectedClient.used_gb?.toFixed(2) || 0} GB</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Remaining</label>
                  <div className="text-purple-400">{selectedClient.remaining_gb?.toFixed(2) || selectedClient.total_gb} GB</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Expire Date</label>
                  <div className="text-white">{formatDate(selectedClient.expire_date)}</div>
                </div>
              </div>

              {selectedClient.subscription_url && (
                <div className="pt-4 border-t border-gray-700">
                  <label className="text-sm text-gray-400 block mb-2">Subscription URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={selectedClient.subscription_url}
                      readOnly
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white truncate"
                    />
                    <button
                      onClick={() => copyToClipboard(selectedClient.subscription_url!)}
                      className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedClient.subscription_url)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                    >
                      <QrCode className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {selectedClient.status !== 'deleted' && (
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={async () => {
                      if (!confirm('Regenerate subscription? This will create a new subscription URL and invalidate the old one.')) return;
                      setIsProcessing(true);
                      const result = await regenerateSubscription(selectedClient.id);
                      setIsProcessing(false);
                      if (result.success) {
                        toast.success('Subscription regenerated');
                        setShowModal(false);
                        loadClients();
                      } else {
                        toast.error(result.error || 'Failed to regenerate');
                      }
                    }}
                    disabled={isProcessing}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 inline mr-2" />
                    Regenerate Sub
                  </button>
                  {selectedClient.status === 'active' ? (
                    <button
                      onClick={() => handleSuspend(selectedClient.id)}
                      disabled={isProcessing}
                      className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                    >
                      <Pause className="w-4 h-4 inline mr-2" />
                      Suspend
                    </button>
                  ) : selectedClient.status === 'suspended' ? (
                    <button
                      onClick={() => handleActivate(selectedClient.id)}
                      disabled={isProcessing}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                    >
                      <Play className="w-4 h-4 inline mr-2" />
                      Activate
                    </button>
                  ) : null}
                  <button
                    onClick={() => handleDelete(selectedClient.id)}
                    disabled={isProcessing}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 inline mr-2" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
