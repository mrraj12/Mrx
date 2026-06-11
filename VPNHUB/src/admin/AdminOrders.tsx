import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Image,
  FileText,
  Loader2
} from 'lucide-react';
import { getAllOrders, approveOrder, rejectOrder, getOrderById } from '../lib/adminService';
import type { Order, OrderStatus } from '../types';
import toast from 'react-hot-toast';

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  payment_submitted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30'
};

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pending',
  payment_submitted: 'Payment Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed'
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const result = await getAllOrders(
        {
          search: search || undefined,
          status: statusFilter || undefined
        },
        page,
        pageSize
      );
      setOrders(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadOrders();
  };

  const handleViewOrder = async (orderId: string) => {
    setIsLoading(true);
    try {
      const order = await getOrderById(orderId);
      if (order) {
        setSelectedOrder(order);
        setShowModal(true);
      }
    } catch (error) {
      toast.error('Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    setIsProcessing(true);
    try {
      const result = await approveOrder(orderId);
      if (result.success) {
        toast.success('Order approved and VPN subscription created');
        setShowModal(false);
        loadOrders();
      } else {
        toast.error(result.error || 'Failed to approve order');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve order');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder || !rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await rejectOrder(selectedOrder.id, rejectReason);
      if (result.success) {
        toast.success('Order rejected');
        setShowRejectModal(false);
        setShowModal(false);
        setRejectReason('');
        loadOrders();
      } else {
        toast.error(result.error || 'Failed to reject order');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject order');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Orders</h1>
        <p className="text-gray-400">Manage VPN subscription orders</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by email, name, or phone..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pl-10 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as OrderStatus | '');
            setPage(1);
          }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="payment_submitted">Payment Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>

        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Search
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Package
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto" />
                    <p className="text-gray-400 mt-2">Loading orders...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="text-white font-medium">{order.full_name}</div>
                      <div className="text-sm text-gray-400">{order.email}</div>
                      <div className="text-xs text-gray-500">{order.phone}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-white">{order.plan_title}</div>
                      <div className="text-xs text-gray-400">{(order as any).package?.total_gb}GB / {(order as any).package?.duration_days} days</div>
                    </td>
                    <td className="px-4 py-4 text-purple-400 font-medium">
                      ¥{order.plan_price}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${statusColors[order.order_status as OrderStatus]}`}>
                        {statusLabels[order.order_status as OrderStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-400">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.order_status === 'pending' || order.order_status === 'payment_submitted' ? (
                          <>
                            <button
                              onClick={() => handleApprove(order.id)}
                              className="p-2 text-green-400 hover:bg-green-400/20 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowRejectModal(true);
                              }}
                              className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        ) : null}
                        <button
                          onClick={() => handleViewOrder(order.id)}
                          className="p-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} orders
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

      {/* Order Detail Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Order Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Customer Name</label>
                  <div className="text-white">{selectedOrder.full_name}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <div className="text-white">{selectedOrder.email}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Phone</label>
                  <div className="text-white">{selectedOrder.phone}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Payment Method</label>
                  <div className="text-white">{selectedOrder.payment_method}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Package</label>
                  <div className="text-white">{selectedOrder.plan_title}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Price</label>
                  <div className="text-purple-400 font-bold">¥{selectedOrder.plan_price}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Status</label>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${statusColors[selectedOrder.order_status as OrderStatus]}`}>
                    {statusLabels[selectedOrder.order_status as OrderStatus]}
                  </span>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Created</label>
                  <div className="text-white">{formatDate(selectedOrder.created_at)}</div>
                </div>
              </div>

              {selectedOrder.admin_notes && (
                <div>
                  <label className="text-sm text-gray-400">Admin Notes</label>
                  <div className="text-white bg-gray-700 p-3 rounded-lg mt-1">
                    {selectedOrder.admin_notes}
                  </div>
                </div>
              )}

              {(selectedOrder.order_status === 'pending' || selectedOrder.order_status === 'payment_submitted') && (
                <div className="flex gap-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => handleApprove(selectedOrder.id)}
                    disabled={isProcessing}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                    Approve Order
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setShowRejectModal(true);
                    }}
                    disabled={isProcessing}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                  >
                    Reject Order
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Reject Order</h2>
            </div>

            <div className="p-6">
              <label className="block text-sm text-gray-400 mb-2">
                Reason for rejection *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                placeholder="Please provide a reason for rejecting this order..."
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessing || !rejectReason.trim()}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
