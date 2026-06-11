import React, { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit, Trash2, Package, HardDrive, Calendar, Smartphone, DollarSign, X, Loader2 } from 'lucide-react';
import { getAllPackages, createPackage, updatePackage, deletePackage } from '../lib/adminService';
import type { Package, PackageFormData } from '../types';
import toast from 'react-hot-toast';

export default function AdminPackages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState<PackageFormData>({
    name: '',
    description: '',
    total_gb: 100,
    duration_days: 30,
    device_limit: 1,
    price: 20,
    is_active: true
  });

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setIsLoading(true);
    try {
      const data = await getAllPackages();
      setPackages(data);
    } catch (error) {
      console.error('Failed to load packages:', error);
      toast.error('Failed to load packages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (pkg?: Package) => {
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({
        name: pkg.name,
        description: pkg.description || '',
        total_gb: pkg.total_gb,
        duration_days: pkg.duration_days,
        device_limit: pkg.device_limit,
        price: Number(pkg.price),
        is_active: pkg.is_active
      });
    } else {
      setEditingPackage(null);
      setFormData({
        name: '',
        description: '',
        total_gb: 100,
        duration_days: 30,
        device_limit: 1,
        price: 20,
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.total_gb || !formData.duration_days || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);

    try {
      let result;
      if (editingPackage) {
        result = await updatePackage(editingPackage.id, formData);
      } else {
        result = await createPackage(formData);
      }

      if (result.success) {
        toast.success(editingPackage ? 'Package updated' : 'Package created');
        setShowModal(false);
        loadPackages();
      } else {
        toast.error(result.error || 'Failed to save package');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save package');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (pkg: Package) => {
    if (!confirm(`Are you sure you want to delete "${pkg.name}"?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await deletePackage(pkg.id);
      if (result.success) {
        toast.success('Package deleted');
        loadPackages();
      } else {
        toast.error(result.error || 'Failed to delete package');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete package');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Packages</h1>
          <p className="text-gray-400">Manage VPN subscription plans</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Package
        </button>
      </div>

      {/* Packages Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`bg-gray-800 rounded-xl border-2 p-6 ${
                pkg.is_active ? 'border-gray-700' : 'border-gray-700 opacity-60'
              }`}
            >
              {!pkg.is_active && (
                <div className="mb-4">
                  <span className="text-xs px-2 py-1 bg-gray-700 text-gray-400 rounded">
                    Inactive
                  </span>
                </div>
              )}

              <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>

              {pkg.description && (
                <p className="text-gray-400 text-sm mb-4">{pkg.description}</p>
              )}

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-gray-300">
                  <HardDrive className="w-5 h-5 text-purple-400" />
                  <span>{pkg.total_gb} GB Traffic</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <span>{pkg.duration_days} Days</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Smartphone className="w-5 h-5 text-green-400" />
                  <span>{pkg.device_limit} Device(s)</span>
                </div>
              </div>

              <div className="text-3xl font-bold text-purple-400 mb-4">
                ¥{pkg.price}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(pkg)}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(pkg)}
                  className="py-2 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}

          {packages.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No packages found. Create your first package to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {editingPackage ? 'Edit Package' : 'New Package'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Package Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., Premium Plan"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Brief description of the package"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Traffic (GB) *</label>
                  <input
                    type="number"
                    value={formData.total_gb}
                    onChange={(e) => setFormData({ ...formData, total_gb: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Duration (Days) *</label>
                  <input
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Device Limit *</label>
                  <input
                    type="number"
                    value={formData.device_limit}
                    onChange={(e) => setFormData({ ...formData, device_limit: parseInt(e.target.value) || 1 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Price (¥) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="is_active" className="text-gray-300">
                  Package is active and available for purchase
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  ) : null}
                  {editingPackage ? 'Update Package' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
