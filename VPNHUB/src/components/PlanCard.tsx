import React from 'react';
import { Check } from 'lucide-react';

interface PlanCardProps {
  title: string;
  price: string;
  features: string[];
  isRecommended?: boolean;
  darkMode: boolean;
  onChoosePlan: () => void;
}

export default function PlanCard({ 
  title, 
  price, 
  features, 
  isRecommended = false, 
  darkMode,
  onChoosePlan 
}: PlanCardProps) {
  return (
    <div className={`${
      darkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    } rounded-2xl shadow-xl border-2 p-8 transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
      isRecommended 
        ? (darkMode ? 'ring-2 ring-purple-400' : 'ring-2 ring-purple-500') 
        : ''
    } relative overflow-hidden`}>
      {isRecommended && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 text-sm font-semibold rounded-bl-lg">
          Recommended
        </div>
      )}
      
      <div className="text-center mb-8">
        <h3 className={`text-2xl font-bold mb-4 ${
          darkMode ? 'text-white' : 'text-gray-800'
        }`}>
          {title}
        </h3>
        <div className={`text-4xl font-bold mb-2 ${
          darkMode ? 'text-purple-400' : 'text-purple-600'
        }`}>
          {price}
        </div>
      </div>

      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start space-x-3">
            <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              darkMode ? 'text-green-400' : 'text-green-500'
            }`} />
            <span className={`text-sm ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={onChoosePlan}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 ${
          isRecommended
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
            : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-lg'
        } transform hover:scale-105`}
      >
        Choose Plan
      </button>
    </div>
  );
}