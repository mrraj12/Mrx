import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AdminProvider, useAdmin } from './contexts/AdminContext';
import { getAdminPanelPath } from './lib/adminService';
import {
  createOrder,
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  getUserProfile,
  getPaymentMethods,
  uploadPaymentScreenshot
} from './lib/supabase';
import { getAvailablePackages } from './lib/vpnService';
import toast from 'react-hot-toast';

// Lazy load components
const HomePage = lazy(() => import('./pages/HomePage'));
const PlansPage = lazy(() => import('./pages/PlansPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const UserVpnDashboard = lazy(() => import('./pages/UserVpnDashboard'));

// User Layout
const UserLayout = lazy(() => import('./layouts/UserLayout'));

// Admin components
const AdminLogin = lazy(() => import('./admin/AdminLogin'));
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const AdminOrders = lazy(() => import('./admin/AdminOrders'));
const AdminVpnClients = lazy(() => import('./admin/AdminVpnClients'));
const AdminPackages = lazy(() => import('./admin/AdminPackages'));
const AdminAuditLogs = lazy(() => import('./admin/AdminAuditLogs'));
const AdminUsers = lazy(() => import('./admin/AdminUsers'));
const AdminPaymentMethods = lazy(() => import('./admin/AdminPaymentMethods'));
const AdminNodes = lazy(() => import('./admin/AdminNodes'));
const AdminSettings = lazy(() => import('./admin/AdminSettings'));
const AdminResellers = lazy(() => import('./admin/AdminResellers'));

// User account pages
const UserProfile = lazy(() => import('./pages/UserProfile'));
const UserSubscription = lazy(() => import('./pages/UserSubscription'));
const UserPackages = lazy(() => import('./pages/UserPackages'));
const UserOrders = lazy(() => import('./pages/UserOrders'));

// Loading spinner component
function LoadingSpinner({ darkMode = true }: { darkMode?: boolean }) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${
      darkMode
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900'
        : 'bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50'
    }`}>
      <div className="text-center">
        <div className={`w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4 ${
          darkMode ? 'border-purple-400' : 'border-purple-600'
        }`} />
      </div>
    </div>
  );
}

// Admin route handler with dynamic path
function AdminRouteHandler() {
  const params = useParams<keyof { ['*']: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, isAuthenticated, isLoading, adminPath } = useAdmin();

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Get the path segments
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const adminSegment = pathSegments[0];
  const subPath = '/' + pathSegments.slice(1).join('/');

  // Check if this is the login page
  const isLoginPage = location.pathname.endsWith('/login');

  if (isLoginPage) {
    // If already authenticated, redirect to admin dashboard
    if (isAuthenticated) {
      return <Navigate to={`/${adminPath}`} replace />;
    }
    return <AdminLogin />;
  }

  // Protected admin routes
  if (!isAuthenticated) {
    return <Navigate to={`/${adminPath}/login`} replace />;
  }

  const renderAdminPage = () => {
    if (subPath === '/' || subPath === '') {
      return <AdminDashboard />;
    }
    if (subPath === '/orders') {
      return <AdminOrders />;
    }
    if (subPath === '/clients') {
      return <AdminVpnClients />;
    }
    if (subPath === '/packages') {
      return <AdminPackages />;
    }
    if (subPath === '/users') {
      return <AdminUsers />;
    }
    if (subPath === '/payments') {
      return <AdminPaymentMethods />;
    }
    if (subPath === '/nodes') {
      return <AdminNodes />;
    }
    if (subPath === '/settings') {
      return <AdminSettings />;
    }
    if (subPath === '/logs') {
      return <AdminAuditLogs />;
    }
    if (subPath === '/resellers') {
      return <AdminResellers />;
    }

    return <Navigate to={`/${adminPath}`} replace />;
  };

  return (
    <AdminLayout>
      {renderAdminPage()}
    </AdminLayout>
  );
}

// Auth Page Component with navigation
function AuthPageWrapper({ darkMode }: { darkMode: boolean }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const handleLogin = async (email: string, password: string) => {
    const { user: loggedInUser } = await signIn(email, password);
    setUser(loggedInUser);
    if (loggedInUser) {
      const profile = await getUserProfile(loggedInUser.id);
      setUserProfile(profile);
      toast.success('Successfully signed in!');
      navigate('/dashboard');
    }
  };

  const handleSignUp = async (email: string, password: string, fullName: string, phone: string) => {
    const { user: newUser } = await signUp(email, password, fullName, phone);
    setUser(newUser);
    if (newUser) {
      const profile = await getUserProfile(newUser.id);
      setUserProfile(profile);
      toast.success('Account created successfully! Please check your email to verify your account.', {
        duration: 6000
      });
      navigate('/plans');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 transition-all duration-300 ${
      darkMode
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900'
        : 'bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50'
    }`}>
      <AuthForm darkMode={darkMode} onLogin={handleLogin} onSignUp={handleSignUp} />
    </div>
  );
}

// Auth Form Component
function AuthForm({
  darkMode,
  onLogin,
  onSignUp
}: {
  darkMode: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
}) {
  const navigate = useNavigate();
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
        setIsLogin(true);
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-sm md:max-w-md p-6 md:p-7 rounded-2xl shadow-2xl ${
      darkMode ? 'bg-gray-800' : 'bg-white'
    } transition-all duration-300`}>
      <button
        onClick={() => navigate('/')}
        className={`mb-4 text-sm ${
          darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        ← Back to Home
      </button>

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
              {showPassword ? '🙈' : '👁️'}
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
  );
}

// User App component
function UserApp() {
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [adminPath, setAdminPath] = useState('admin');

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved) {
      setDarkMode(JSON.parse(saved));
    }
    checkUser();
    loadAdminPath();
  }, []);

  const loadAdminPath = async () => {
    try {
      const path = await getAdminPanelPath();
      setAdminPath(path);
    } catch (error) {
      console.error('Failed to load admin path:', error);
    }
  };

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const profile = await getUserProfile(currentUser.id);
        setUserProfile(profile);
        const methods = await getPaymentMethods();
        setPaymentMethods(methods);
      }
    } catch (error) {
      // User treated as logged out
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setUserProfile(null);
    setPaymentMethods([]);
    toast.success('Successfully signed out!');
  };

  const handleSubmitOrder = async (orderData: any) => {
    try {
      const createdOrder = await createOrder({
        user_id: user?.id,
        full_name: orderData.fullName,
        email: orderData.email,
        phone: orderData.phone,
        payment_method: orderData.paymentMethod,
        plan_title: orderData.plan_title,
        plan_price: orderData.plan_price,
        order_status: orderData.order_status
      });
      return createdOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  const handleUploadScreenshot = async (orderId: string, paymentMethodId: string, file: File) => {
    try {
      await uploadPaymentScreenshot(orderId, paymentMethodId, file);
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      throw error;
    }
  };

  if (isLoading) {
    return <LoadingSpinner darkMode={darkMode} />;
  }

  return (
    <Suspense fallback={<LoadingSpinner darkMode={darkMode} />}>
      <Routes>
        {/* User Routes */}
        <Route path="/" element={
          <HomePage
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
            onSignUp={async (email, password, fullName, phone) => {
              const { user: newUser } = await signUp(email, password, fullName, phone);
              if (newUser) {
                setUser(newUser);
                const profile = await getUserProfile(newUser.id);
                setUserProfile(profile);
                const methods = await getPaymentMethods();
                setPaymentMethods(methods);
              }
            }}
            onShowAuth={() => {
              window.location.href = '/auth';
            }}
          />
        } />
        <Route path="/auth" element={<AuthPageWrapper darkMode={darkMode} />} />
        <Route path="/plans" element={
          user ? (
            <PlansPage
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
              user={user}
              userProfile={userProfile}
              paymentMethods={paymentMethods}
              onSignOut={handleSignOut}
              onSubmitOrder={handleSubmitOrder}
              onUploadScreenshot={handleUploadScreenshot}
            />
          ) : (
            <Navigate to="/auth" replace />
          )
        } />
        <Route path="/blog" element={
          <BlogPage darkMode={darkMode} onBack={() => {}} />
        } />
        {/* User Account Routes - with shared sidebar layout */}
        <Route path="/user" element={
          user ? (
            <UserLayout
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
              user={user}
              userProfile={userProfile}
            >
              <Outlet />
            </UserLayout>
          ) : (
            <Navigate to="/auth" replace />
          )
        }>
          <Route index element={<Navigate to="/user/dashboard" replace />} />
          <Route path="dashboard" element={
            <UserVpnDashboard
              darkMode={darkMode}
              user={user}
              userProfile={userProfile}
            />
          } />
          <Route path="packages" element={
            <UserPackages
              darkMode={darkMode}
              user={user}
              userProfile={userProfile}
            />
          } />
          <Route path="orders" element={
            <UserOrders
              darkMode={darkMode}
              user={user}
              userProfile={userProfile}
            />
          } />
          <Route path="subscription" element={
            <UserSubscription
              darkMode={darkMode}
              user={user}
              userProfile={userProfile}
            />
          } />
          <Route path="profile" element={
            <UserProfile
              darkMode={darkMode}
              user={user}
              userProfile={userProfile}
            />
          } />
        </Route>

        {/* Redirect old routes */}
        <Route path="/dashboard" element={<Navigate to="/user/dashboard" replace />} />
        <Route path="/profile" element={<Navigate to="/user/profile" replace />} />
        <Route path="/subscription" element={<Navigate to="/user/subscription" replace />} />

        {/* Admin Routes - Dynamic Path */}
        <Route path={`/${adminPath}/login`} element={<AdminLogin />} />
        <Route path={`/${adminPath}/*`} element={<AdminRouteHandler />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AdminProvider>
        <Toaster position="top-right" />
        <UserApp />
      </AdminProvider>
    </BrowserRouter>
  );
}

export default App;
