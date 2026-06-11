import React, { useState, useEffect } from 'react';
import { X, Upload, Check, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentMethod {
  id: string;
  name: string;
  qr_code_url: string;
  account_info: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  darkMode: boolean;
  paymentMethods: PaymentMethod[];
  onUploadScreenshot: (orderId: string, paymentMethodId: string, file: File) => Promise<void>;
}

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  order, 
  darkMode,
  paymentMethods,
  onUploadScreenshot 
}: PaymentModalProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (paymentMethods.length > 0) {
      setSelectedPaymentMethod(paymentMethods[0]);
    }
  }, [paymentMethods]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      setUploadedFile(file);
      setUploadStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile || !selectedPaymentMethod || !order) {
      toast.error('Please select a payment method and upload a screenshot');
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');

    try {
      await onUploadScreenshot(order.id, selectedPaymentMethod.id, uploadedFile);
      setUploadStatus('success');
      toast.success('Payment screenshot uploaded successfully! We will verify it shortly.');
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setUploadedFile(null);
        setUploadStatus('idle');
      }, 2000);
    } catch (error) {
      setUploadStatus('error');
      toast.error('Failed to upload screenshot. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } transition-all duration-300 max-h-[90vh] overflow-y-auto`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-10 ${
            darkMode 
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <h2 className={`text-2xl font-bold mb-2 ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Complete Payment
          </h2>
          
          <div className={`mb-6 p-4 rounded-lg ${
            darkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <h3 className={`font-semibold ${
              darkMode ? 'text-purple-400' : 'text-purple-600'
            }`}>
              Order Details
            </h3>
            <p className={`text-lg font-bold ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}>
              {order.plan_title} - {order.plan_price}
            </p>
            <p className={`text-sm ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Order ID: {order.id?.slice(0, 8)}...
            </p>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h3 className={`text-lg font-semibold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Select Payment Method
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPaymentMethod(method)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedPaymentMethod?.id === method.id
                      ? (darkMode 
                          ? 'border-purple-400 bg-purple-900/20' 
                          : 'border-purple-500 bg-purple-50')
                      : (darkMode 
                          ? 'border-gray-600 bg-gray-700 hover:border-gray-500' 
                          : 'border-gray-200 bg-white hover:border-gray-300')
                  }`}
                >
                  <div className={`font-semibold ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {method.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* QR Code Display */}
          {selectedPaymentMethod && (
            <div className="mb-6">
              <h3 className={`text-lg font-semibold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Scan QR Code to Pay
              </h3>
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className={`p-4 rounded-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                } text-center`}>
                  <img
                    src={selectedPaymentMethod.qr_code_url}
                    alt={`${selectedPaymentMethod.name} QR Code`}
                    className="w-48 h-48 mx-auto mb-4 rounded-lg"
                  />
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {selectedPaymentMethod.account_info}
                  </p>
                </div>
                
                <div className="flex-1">
                  <div className={`p-4 rounded-lg ${
                    darkMode ? 'bg-blue-900/20 border-blue-400' : 'bg-blue-50 border-blue-200'
                  } border`}>
                    <h4 className={`font-semibold mb-2 ${
                      darkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      Payment Instructions:
                    </h4>
                    <ol className={`text-sm space-y-1 ${
                      darkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      <li>1. Scan the QR code with your {selectedPaymentMethod.name} app</li>
                      <li>2. Pay the exact amount: {order.plan_price}</li>
                      <li>3. Take a screenshot of the payment confirmation</li>
                      <li>4. Upload the screenshot below for verification</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Screenshot Upload */}
          <div className="mb-6">
            <h3 className={`text-lg font-semibold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Upload Payment Screenshot
            </h3>
            
            <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
              darkMode 
                ? 'border-gray-600 bg-gray-700' 
                : 'border-gray-300 bg-gray-50'
            }`}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="screenshot-upload"
              />
              <label
                htmlFor="screenshot-upload"
                className={`cursor-pointer flex flex-col items-center ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                <Upload className="w-12 h-12 mb-4" />
                <p className="text-lg font-semibold mb-2">
                  {uploadedFile ? uploadedFile.name : 'Click to upload screenshot'}
                </p>
                <p className="text-sm">
                  Supported formats: JPG, PNG, GIF (Max 5MB)
                </p>
              </label>
            </div>

            {uploadedFile && (
              <div className={`mt-4 p-4 rounded-lg ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {uploadStatus === 'success' && <Check className="w-5 h-5 text-green-500" />}
                    {uploadStatus === 'uploading' && <Clock className="w-5 h-5 text-blue-500 animate-spin" />}
                    {uploadStatus === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                    <span className={`text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {uploadedFile.name}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setUploadedFile(null);
                      setUploadStatus('idle');
                    }}
                    className={`text-sm ${
                      darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600'
                    }`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!uploadedFile || isUploading || uploadStatus === 'success'}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white transition-all duration-300 ${
                !uploadedFile || isUploading || uploadStatus === 'success'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105'
              }`}
            >
              {uploadStatus === 'uploading' ? 'Uploading...' : 
               uploadStatus === 'success' ? 'Uploaded Successfully!' : 
               'Submit Payment Proof'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}