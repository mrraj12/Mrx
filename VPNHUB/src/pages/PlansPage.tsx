import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Header from '../components/Header';
import PlanCard from '../components/PlanCard';
import PaymentOption from '../components/PaymentOption';
import OrderModal from '../components/OrderModal';
import PaymentModal from '../components/PaymentModal';
import DarkModeToggle from '../components/DarkModeToggle';
import { getAvailablePackages } from '../lib/vpnService';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import type { Package } from '../types';

interface PlansPageProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  user: any;
  userProfile: any;
  paymentMethods: any[];
  onSignOut: () => void;
  onSubmitOrder: (orderData: any) => Promise<any>;
  onUploadScreenshot: (orderId: string, paymentMethodId: string, file: File) => Promise<void>;
}

export default function PlansPage({
  darkMode,
  toggleDarkMode,
  user,
  userProfile,
  paymentMethods,
  onSignOut,
  onSubmitOrder,
  onUploadScreenshot
}: PlansPageProps) {
  const navigate = useNavigate();
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    title: string;
    price: string;
    features: string[];
    package?: Package;
  } | null>(null);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [packages, setPackages] = useState<Package[]>([]);

  useEffect(() => {
    loadPackages();
  }, []);

  // Realtime: auto-refresh when packages change
  useRealtimeTable({
    table: 'packages',
    onChange: () => {
      loadPackages();
    }
  });

  // Realtime: auto-refresh when payment methods change
  useRealtimeTable({
    table: 'payment_methods',
    onChange: () => {
      // Payment methods are passed as prop from App.tsx, but we can trigger a re-render
      loadPackages();
    }
  });

  const loadPackages = async () => {
    try {
      const pkgs = await getAvailablePackages();
      setPackages(pkgs);
    } catch (error) {
      console.error('Failed to load packages:', error);
    }
  };

  const plans = packages.map((pkg, index) => ({
    title: pkg.name,
    price: `¥${pkg.price}`,
    features: [
      `Traffic: ${pkg.total_gb} GB`,
      `Duration: ${pkg.duration_days} days`,
      `Device Limit: ${pkg.device_limit}`,
      pkg.description || 'For personal use only, no refunds'
    ],
    isRecommended: index === 2,
    package: pkg
  }));

  const paymentOptionNames = paymentMethods.length > 0
    ? paymentMethods.map(m => m.name)
    : [];

  const handleChoosePlan = (plan: typeof plans[0]) => {
    setSelectedPlan(plan);
    setIsOrderModalOpen(true);
  };

  const handleOpenPayment = (order: any) => {
    setCurrentOrder(order);
    setIsPaymentModalOpen(true);
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900' 
        : 'bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50'
    }`}>
      <Toaster position="top-right" />
      <DarkModeToggle darkMode={darkMode} onToggle={toggleDarkMode} />
      
      {/* User Menu */}
      <div className="fixed top-2.5 left-2 z-30">
        <div className={`group relative`}>
          <div className={`p-2 rounded-full 2x1 shadow-xl transition-all duration-300 hover:shadow-2xl ${
            darkMode 
              ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white border border-gray-600' 
              : 'bg-gradient-to-r from-white to-gray-50 text-gray-800 border border-gray-200'
          }`}>
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-gradient-to-r from-purple-500 to-blue-500'
              } text-white text-sm font-bold shadow-lg`}>
                {userProfile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block">
                <p className={`text-sm font-bold ${
                  darkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  {userProfile?.full_name || 'User'}
                </p>
                <p className={`text-xs ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
          
          {/* Sign Out Button - Appears on hover */}
          <div className={`absolute top-full left-0 mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 flex flex-col gap-2`}>
            <button
              onClick={() => navigate('/dashboard')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl ${
                darkMode
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              } transform hover:scale-105`}
            >
              Dashboard
            </button>
            <button
              onClick={onSignOut}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl ${
                darkMode
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              } transform hover:scale-105`}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
      
      <Header darkMode={darkMode} />
      
      <main className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Payment Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {paymentOptionNames.map((option) => (
              <PaymentOption
                key={option}
                title={option}
                darkMode={darkMode}
              />
            ))}
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan) => (
              <PlanCard
                key={plan.title}
                title={plan.title}
                price={plan.price}
                features={plan.features}
                isRecommended={plan.isRecommended}
                darkMode={darkMode}
                onChoosePlan={() => handleChoosePlan(plan)}
              />
            ))}
          </div>
        </div>
      </main>

      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        selectedPlan={selectedPlan}
        darkMode={darkMode}
        onSubmitOrder={onSubmitOrder}
        onOpenPayment={handleOpenPayment}
      />
      
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        order={currentOrder}
        darkMode={darkMode}
        paymentMethods={paymentMethods}
        onUploadScreenshot={onUploadScreenshot}
      />
      
      {/* Footer */}
      <footer className={`py-12 px-4 mt-16 ${
        darkMode 
          ? 'bg-gray-800 border-t border-gray-700' 
          : 'bg-white border-t border-gray-200'
      }`}>
        <div className="max-w-6xl mx-auto text-center">
          <p className={`text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            © 2025 VPNHUB Service. All rights reserved. Secure your privacy with our trusted VPN solution.
          </p>
        </div>
      </footer>
    </div>
  );
}