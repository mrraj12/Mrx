import React, { useState } from 'react';
import { X, User, Mail, Phone, CreditCard, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: {
    title: string;
    price: string;
    features: string[];
  } | null;
  darkMode: boolean;
  onSubmitOrder: (orderData: any) => void;
  onOpenPayment: (order: any) => void;
}

export default function OrderModal({ 
  isOpen, 
  onClose, 
  selectedPlan, 
  darkMode,
  onSubmitOrder,
  onOpenPayment
}: OrderModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    paymentMethod: 'alipay'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCreated, setOrderCreated] = useState<any>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const orderData = {
        ...formData,
        plan_title: selectedPlan?.title,
        plan_price: selectedPlan?.price,
        order_status: 'pending',
        created_at: new Date().toISOString()
      };

      const createdOrder = await onSubmitOrder(orderData);
      setOrderCreated(createdOrder);
      
      toast.success('Order submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedToPayment = () => {
    if (orderCreated) {
      onOpenPayment(orderCreated);
      onClose();
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        paymentMethod: 'paypal'
      });
      setOrderCreated(null);
    }
  };

  const handleClose = () => {
    onClose();
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      paymentMethod: 'alipay'
    });
    setOrderCreated(null);
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } transition-all duration-300`}>
        <button
          onClick={handleClose}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
            darkMode 
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {!orderCreated ? (
            <>
              <h2 className={`text-2xl font-bold mb-2 ${
                darkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Complete Your Order
              </h2>
          
              {selectedPlan && (
                <div className={`mb-6 p-4 rounded-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h3 className={`font-semibold ${
                    darkMode ? 'text-purple-400' : 'text-purple-600'
                  }`}>
                    {selectedPlan.title}
                  </h3>
                  <p className={`text-lg font-bold ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {selectedPlan.price}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <User className="w-4 h-4 inline mr-2" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-400' 
                        : 'bg-white border-gray-300 text-gray-800 focus:border-purple-500'
                    } focus:outline-none focus:ring-2 focus:ring-purple-200`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-400' 
                        : 'bg-white border-gray-300 text-gray-800 focus:border-purple-500'
                    } focus:outline-none focus:ring-2 focus:ring-purple-200`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-400' 
                        : 'bg-white border-gray-300 text-gray-800 focus:border-purple-500'
                    } focus:outline-none focus:ring-2 focus:ring-purple-200`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <CreditCard className="w-4 h-4 inline mr-2" />
                    Payment Method
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-400' 
                        : 'bg-white border-gray-300 text-gray-800 focus:border-purple-500'
                    } focus:outline-none focus:ring-2 focus:ring-purple-200`}
                  >
                    <option value="alipay">Alipay</option>
                    <option value="wechat">WeChat Pay</option>
                  </select>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                      darkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white transition-all duration-300 ${
                      isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                    }`}
                  >
                    {isSubmitting ? 'Processing...' : 'Create Order'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-600'
                }`}>
                  <Receipt className="w-8 h-8" />
                </div>
                <h2 className={`text-2xl font-bold mb-2 ${
                  darkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  Order Created Successfully!
                </h2>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Your order has been created. Proceed to payment to complete your purchase.
                </p>
              </div>

              <div className={`mb-6 p-4 rounded-lg ${
                darkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <h3 className={`font-semibold mb-2 ${
                  darkMode ? 'text-purple-400' : 'text-purple-600'
                }`}>
                  Order Details
                </h3>
                <p className={`text-lg font-bold ${
                  darkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  {selectedPlan?.title} - {selectedPlan?.price}
                </p>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Order ID: {orderCreated?.id?.slice(0, 8)}...
                </p>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleClose}
                  className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Close
                </button>
                <button
                  onClick={handleProceedToPayment}
                  className="flex-1 py-3 px-6 rounded-lg font-semibold text-white bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  Proceed to Payment
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}