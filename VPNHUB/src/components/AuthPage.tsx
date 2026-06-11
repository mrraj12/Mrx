import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuthPageProps {
  darkMode: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
}

export default function AuthPage({ darkMode, onLogin, onSignUp }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!isLogin && (!formData.fullName || !formData.phone)) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    
    try {
      if (isLogin) {
        await onLogin(formData.email, formData.password);
      } else {
        await onSignUp(formData.email, formData.password, formData.fullName, formData.phone);
        // Show email verification message
        toast.success('Account created successfully! Please open your email and verify your email account.', {
          duration: 6000,
          style: {
            background: '#10B981',
            color: 'white',
            fontSize: '16px',
            padding: '16px',
            borderRadius: '8px'
          }
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 transition-all duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900' 
        : 'bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50'
    }`}>
      <div className={`w-full max-w-sm md:max-w-md p-6 md:p-7 rounded-2xl shadow-2xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } transition-all duration-300`}>
        <div className="text-center mb-6">
          <h1 className={`text-2xl font-bold mb-1 ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className={`text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {isLogin 
              ? 'Sign in to access your VPN dashboard' 
              : 'Join us for secure browsing experience'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <User className="w-4 h-4 inline mr-1" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-400' 
                      : 'bg-white border-gray-300 text-gray-800 focus:border-purple-500'
                  } focus:outline-none focus:ring-2 focus:ring-purple-200`}
                  required={!isLogin}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-400' 
                      : 'bg-white border-gray-300 text-gray-800 focus:border-purple-500'
                  } focus:outline-none focus:ring-2 focus:ring-purple-200`}
                  required={!isLogin}
                />
              </div>
            </>
          )}

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <Mail className="w-4 h-4 inline mr-1" />
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-400' 
                  : 'bg-white border-gray-300 text-gray-800 focus:border-purple-500'
              } focus:outline-none focus:ring-2 focus:ring-purple-200`}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <Lock className="w-4 h-4 inline mr-1" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-3 py-2.5 pr-10 rounded-lg border text-sm transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-400' 
                    : 'bg-white border-gray-300 text-gray-800 focus:border-purple-500'
                } focus:outline-none focus:ring-2 focus:ring-purple-200`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                  darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm sm:text-base text-white transition-all duration-300 ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-[1.03]'
            }`}
          >
            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className={`text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className={`ml-2 font-semibold ${
                darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'
              } transition-colors`}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}