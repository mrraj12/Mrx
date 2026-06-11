import React from 'react';

interface PaymentOptionProps {
  title: string;
  darkMode: boolean;
}

export default function PaymentOption({ title, darkMode }: PaymentOptionProps) {
  return (
    <div className={`hidden ${
      darkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    } rounded-2xl shadow-xl border-2 p-8 transition-all duration-300 hover:shadow-2xl`}>
      <div className="text-center">
        <h3 className={`text-2xl font-bold mb-6 ${
          darkMode ? 'text-white' : 'text-gray-800'
        }`}>
          {title}
        </h3>
        
        <div className={`w-32 h-32 mx-auto mb-6 ${
          darkMode ? 'bg-gray-700' : 'bg-gray-100'
        } rounded-lg flex items-center justify-center border-2 border-dashed ${
          darkMode ? 'border-gray-600' : 'border-gray-300'
        }`}>
          <div className={`w-24 h-24 ${
            darkMode ? 'bg-gray-600' : 'bg-gray-200'
          } rounded flex items-center justify-center`}>
            <span className={`text-xs ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              QR Code
            </span>
          </div>
        </div>
        
        <p className={`text-sm ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Scan to pay with {title}
        </p>
      </div>
    </div>
  );
}