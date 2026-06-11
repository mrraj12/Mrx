import React, { useState } from 'react';
import { Shield, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { adminLogin } from '../lib/adminService';
import { useAdmin } from '../contexts/AdminContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const { login, adminPath } = useAdmin();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[AdminLogin] Attempting login for:', username);
      const result = await adminLogin({
        username,
        password,
        two_factor_code: requires2FA ? twoFactorCode : undefined
      });

      console.log('[AdminLogin] Login result:', result);

      if (result.success && result.data) {
        toast.success('Login successful!');

        // result.data structure is { session, token }
        // session contains { id, admin_id, admin, expires_at }
        const session = result.data.session || result.data;
        const adminUser = session.admin;
        const token = result.data.token;

        console.log('[AdminLogin] Session:', session);
        console.log('[AdminLogin] Admin:', adminUser);
        console.log('[AdminLogin] Token:', token ? 'present' : 'missing');

        if (adminUser && token) {
          login(adminUser, token);
          console.log('[AdminLogin] Redirecting to:', `/${adminPath}`);
          // Use window.location for a full page reload to ensure state is fresh
          window.location.href = `/${adminPath}`;
        } else {
          console.error('[AdminLogin] Missing admin or token in response');
          toast.error('Login response incomplete');
        }
      } else if ((result as any).requires2FA) {
        setRequires2FA(true);
        toast('Two-factor authentication required', { icon: '🔐' });
      } else {
        toast.error(result.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('[AdminLogin] Error:', error);
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-600/20 flex items-center justify-center">
            <Shield className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Login</h1>
          <p className="text-gray-400">VPNHUB Administration Panel</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Enter username"
                disabled={isLoading || requires2FA}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Enter password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {requires2FA && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Two-Factor Code
                </label>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white text-center text-2xl tracking-widest placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="000000"
                  maxLength={6}
                  disabled={isLoading}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center">
              This area is restricted to authorized administrators only.
              All login attempts are logged for security purposes.
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-sm text-gray-400 hover:text-purple-400 transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
}
