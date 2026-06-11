import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutGrid, Package, ShoppingCart, Layers, User, Moon, Sun,
  LogOut, Shield, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { signOut } from '../lib/supabase';

interface UserLayoutProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  user: any;
  userProfile: any;
  children: React.ReactNode;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, path: '/user/dashboard' },
  { id: 'packages', label: 'Packages', icon: Package, path: '/user/packages' },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/user/orders' },
  { id: 'subscription', label: 'Subscription', icon: Layers, path: '/user/subscription' },
  { id: 'profile', label: 'Profile', icon: User, path: '/user/profile' },
];

export default function UserLayout({ darkMode, onToggleDarkMode, user, userProfile, children }: UserLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast.success('Successfully signed out');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col fixed inset-y-0 left-0 z-40">
        {/* Logo */}
        <div className="px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" />
            <span className="text-xl font-bold text-purple-600">ProxyHub</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
          <button
            onClick={onToggleDarkMode}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-all"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>Dark mode</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
          <div className="px-3 py-1">
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {user?.email || userProfile?.email || ''}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-60 min-h-screen">
        {/* Top Header Bar */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {user?.email || userProfile?.email || ''}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              User
            </span>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
