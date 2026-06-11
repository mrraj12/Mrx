import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, CreditCard as Edit, Trash2, ToggleLeft, ToggleRight, X, Upload, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  togglePaymentMethod
} from '../lib/adminService';
import type { PaymentMethod, PaymentMethodFormData } from '../types';

export default function AdminPaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState<PaymentMethodFormData>({
    name: '',
    qr_code_url: '',
    account_info: '',
    payment_type: 'qr_code',
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const data = await getAllPaymentMethods();
      setMethods(data);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingMethod(null);
    setFormData({
      name: '',
      qr_code_url: '',
      account_info: '',
      payment_type: 'qr_code',
      is_active: true
    });
    setShowModal(true);
  };

  const openEditModal = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      qr_code_url: method.qr_code_url || '',
      account_info: method.account_info || '',
      payment_type: (method as any).payment_type || 'qr_code',
      is_active: method.is_active
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Payment method name is required');
      return;
    }

    setSaving(true);
    try {
      let result;
      if (editingMethod) {
        result = await updatePaymentMethod(editingMethod.id, formData);
      } else {
        result = await createPaymentMethod(formData);
      }

      if (result.success) {
        toast.success(editingMethod ? 'Payment method updated' : 'Payment method created');
        setShowModal(false);
        fetchMethods();
      } else {
        toast.error(result.error || 'Failed to save payment method');
      }
    } catch (error) {
      toast.error('Failed to save payment method');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (methodId: string) => {
    try {
      const result = await togglePaymentMethod(methodId);
      if (result.success) {
        toast.success('Payment method status updated');
        fetchMethods();
      } else {
        toast.error(result.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      const result = await deletePaymentMethod(methodId);
      if (result.success) {
        toast.success('Payment method deleted');
        fetchMethods();
      } else {
        toast.error(result.error || 'Failed to delete payment method');
      }
    } catch (error) {
      toast.error('Failed to delete payment method');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Methods</h1>
          <p className="text-gray-400 mt-1">Manage payment options for customers</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Payment Method
        </button>
      </div>

      {/* Payment Methods Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-400 mt-4">Loading payment methods...</p>
        </div>
      ) : methods.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No payment methods configured</p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            Add your first payment method
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {methods.map((method) => (
            <div
              key={method.id}
              className={`bg-gray-800 rounded-lg overflow-hidden border-2 transition-all ${
                method.is_active ? 'border-gray-700' : 'border-gray-700 opacity-60'
              }`}
            >
              {/* QR Code Image */}
              <div className="aspect-square bg-gray-700 relative">
                {method.qr_code_url ? (
                  <img
                    src={method.qr_code_url}
                    alt={method.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-16 h-16 text-gray-600" />
                  </div>
                )}
                {!method.is_active && (
                  <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
                    <span className="text-gray-400 font-medium">Disabled</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-white">{method.name}</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    method.is_active
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {method.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {method.account_info && (
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                    {method.account_info}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(method.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        method.is_active
                          ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                      title={method.is_active ? 'Disable' : 'Enable'}
                    >
                      {method.is_active ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(method)}
                      className="p-2 rounded-lg bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600 transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(method.id)}
                      className="p-2 rounded-lg bg-gray-700 text-gray-400 hover:text-red-400 hover:bg-gray-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  placeholder="e.g., Alipay, WeChat Pay, Bank Transfer..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Payment Type</label>
                <select
                  value={formData.payment_type}
                  onChange={(e) => setFormData({ ...formData, payment_type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="qr_code">QR Code</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="crypto">Cryptocurrency</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">QR Code / Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.qr_code_url}
                    onChange={(e) => setFormData({ ...formData, qr_code_url: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    placeholder="https://example.com/qr-code.png"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter the URL of the QR code or payment image
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Account Info</label>
                <textarea
                  value={formData.account_info}
                  onChange={(e) => setFormData({ ...formData, account_info: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="Account number, wallet address, or payment instructions..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-300">
                  Active (visible to customers)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : (editingMethod ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
