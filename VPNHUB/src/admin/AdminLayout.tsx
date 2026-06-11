import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  Server,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  CreditCard
} from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { path: '', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/users', icon: Users, label: 'Users' },
  { path: '/packages', icon: Package, label: 'Packages' },
  { path: '/orders', icon: FileText, label: 'Orders' },
  { path: '/payments', icon: CreditCard, label: 'Payments' },
  { path: '/resellers', icon: Users, label: 'Resellers' },
  { path: '/clients', icon: Server, label: 'Node Servers' },
  { path: '/settings', icon: Settings, label: 'Settings' },
  { path: '/logs', icon: FileText, label: 'Audit Logs' }
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { admin, logout, adminPath } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const currentPath = location.pathname.replace(`/${adminPath}`, '') || '';

  const handleLogout = async () => {
    await logout();
    navigate(`/${adminPath}/login`);
  };

  const handleNavigate = (path: string) => {
    navigate(`/${adminPath}${path}`);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-purple-400" />
            <span className="text-xl font-bold text-white">VPNHUB</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = currentPath === item.path ||
              (item.path !== '' && currentPath.startsWith(item.path));

            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <div className="text-xs text-gray-500 text-center">
            Admin Panel v1.0
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 lg:hidden" />

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {admin?.username?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-white">{admin?.username}</div>
                <div className="text-xs text-gray-400">{admin?.role}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-lg border border-gray-600 z-50">
                  <div className="p-3 border-b border-gray-600">
                    <div className="text-sm font-medium text-white">{admin?.username}</div>
                    <div className="text-xs text-gray-400">{admin?.role}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-gray-600 rounded-b-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
