import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Activity,
  User,
  Calendar,
  Loader2
} from 'lucide-react';
import { getAdminLogs } from '../lib/adminService';
import type { AdminLog, AdminAction } from '../types';

const actionColors: Record<AdminAction, string> = {
  login: 'bg-blue-500/20 text-blue-400',
  logout: 'bg-gray-500/20 text-gray-400',
  order_approved: 'bg-green-500/20 text-green-400',
  order_rejected: 'bg-red-500/20 text-red-400',
  client_suspended: 'bg-yellow-500/20 text-yellow-400',
  client_activated: 'bg-green-500/20 text-green-400',
  client_deleted: 'bg-red-500/20 text-red-400',
  package_created: 'bg-purple-500/20 text-purple-400',
  package_updated: 'bg-purple-500/20 text-purple-400',
  package_deleted: 'bg-red-500/20 text-red-400',
  user_suspended: 'bg-yellow-500/20 text-yellow-400',
  user_activated: 'bg-green-500/20 text-green-400',
  settings_updated: 'bg-gray-500/20 text-gray-400'
};

const actionLabels: Record<AdminAction, string> = {
  login: 'Login',
  logout: 'Logout',
  order_approved: 'Order Approved',
  order_rejected: 'Order Rejected',
  client_suspended: 'Client Suspended',
  client_activated: 'Client Activated',
  client_deleted: 'Client Deleted',
  package_created: 'Package Created',
  package_updated: 'Package Updated',
  package_deleted: 'Package Deleted',
  user_suspended: 'User Suspended',
  user_activated: 'User Activated',
  settings_updated: 'Settings Updated'
};

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [actionFilter, setActionFilter] = useState<AdminAction | ''>('');

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const result = await getAdminLogs(
        {
          action: actionFilter || undefined
        },
        page,
        pageSize
      );
      setLogs(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const formatDetails = (log: AdminLog) => {
    const details = log.details;
    if (!details) return '-';

    if (log.action.includes('order') && details.package_name) {
      return `Package: ${details.package_name}`;
    }

    if (log.action === 'login' || log.action === 'logout') {
      return `Session: ${details.session_id?.substring(0, 8) || '-'}...`;
    }

    return JSON.stringify(details);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Audit Logs</h1>
        <p className="text-gray-400">Admin activity and security logs</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value as AdminAction | '');
            setPage(1);
          }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
        >
          <option value="">All Actions</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="order_approved">Order Approved</option>
          <option value="order_rejected">Order Rejected</option>
          <option value="client_suspended">Client Suspended</option>
          <option value="client_activated">Client Activated</option>
          <option value="client_deleted">Client Deleted</option>
          <option value="package_created">Package Created</option>
          <option value="package_updated">Package Updated</option>
          <option value="package_deleted">Package Deleted</option>
        </select>

        <button
          onClick={loadLogs}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Action
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Admin
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Time
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto" />
                    <p className="text-gray-400 mt-2">Loading logs...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${actionColors[log.action as AdminAction] || 'bg-gray-500/20 text-gray-400'}`}>
                        {actionLabels[log.action as AdminAction] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-white">{(log as any).admin?.username || 'System'}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-400">
                      {formatDetails(log)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-400 font-mono">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-400">
                      {formatDate(log.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} logs
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
    </div>
  );
}
