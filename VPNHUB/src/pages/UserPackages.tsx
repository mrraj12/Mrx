import React, { useState, useEffect } from 'react';
import { Zap, Clock, Globe, Wifi, ShoppingCart, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAvailablePackages } from '../lib/vpnService';
import { createOrder } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import type { Package } from '../types';

interface UserPackagesProps {
  darkMode: boolean;
  user: any;
  userProfile: any;
}

export default function UserPackages({ darkMode, user, userProfile }: UserPackagesProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const navigate = useNavigate();

  const cardBg = darkMode ? 'bg-gray-800/80 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm';
  const cardBorder = darkMode ? 'border-gray-700' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-800';
  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-600';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const bgSoft = darkMode ? 'bg-gray-700/50' : 'bg-gray-50';

  useEffect(() => {
    loadPackages();
  }, []);

  // Realtime: auto-refresh when packages are added/updated/deleted by admin
  useRealtimeTable({
    table: 'packages',
    onChange: () => {
      loadPackages();
    }
  });

  const loadPackages = async () => {
    setIsLoading(true);
    try {
      const data = await getAvailablePackages();
      setPackages(data);
    } catch (error) {
      toast.error('Failed to load packages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuy = async (pkg: Package) => {
    if (!user?.id) {
      toast.error('Please sign in first');
      navigate('/auth');
      return;
    }
    setSelectedPackage(pkg);
    setIsOrdering(true);
    try {
      const result = await createOrder(user.id, pkg.id);
      if (result.success && result.orderId) {
        toast.success('Order placed! Please complete payment.');
        navigate('/user/orders');
      } else {
        toast.error(result.error || 'Failed to create order');
      }
    } catch (error) {
      toast.error('Failed to place order');
    } finally {
      setIsOrdering(false);
      setSelectedPackage(null);
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
        <h1 className={`text-2xl font-bold ${textPrimary}`}>VPN Packages</h1>
        <p className={`text-sm ${textMuted}`}>Choose the plan that fits your needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`rounded-2xl border shadow-sm p-6 flex flex-col transition-all duration-300 hover:shadow-lg hover:border-purple-300 ${cardBg} ${cardBorder}`}
          >
            <h3 className={`text-lg font-bold ${textPrimary} mb-1`}>{pkg.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className={`text-2xl font-bold text-purple-600`}>¥{pkg.price}</span>
              <span className={`text-sm ${textMuted}`}>/ {pkg.duration_days} days</span>
            </div>

            <div className="space-y-2 mb-6 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-purple-500" />
                <span className={textSecondary}>{pkg.total_gb} GB Bandwidth</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-purple-500" />
                <span className={textSecondary}>{pkg.duration_days} Days Duration</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-purple-500" />
                <span className={textSecondary}>{pkg.device_limit} Device Limit</span>
              </div>
              {(pkg as any).features && (pkg as any).features.map((f: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className={textSecondary}>{f}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleBuy(pkg)}
              disabled={isOrdering && selectedPackage?.id === pkg.id}
              className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isOrdering && selectedPackage?.id === pkg.id ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-white" />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Buy Now
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
