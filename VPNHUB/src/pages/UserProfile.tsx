import React, { useState } from 'react';
import {
  User, Lock, Mail, Save, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface UserProfileProps {
  darkMode: boolean;
  user: any;
  userProfile: any;
}

export default function UserProfile({ darkMode, user, userProfile }: UserProfileProps) {
  const [formData, setFormData] = useState({
    firstName: userProfile?.full_name?.split(' ')[0] || '',
    lastName: userProfile?.full_name?.split(' ').slice(1).join(' ') || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: `${formData.firstName} ${formData.lastName}`.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      if (error) throw error;
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const cardBg = darkMode ? 'bg-gray-800/80 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm';
  const cardBorder = darkMode ? 'border-gray-700' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-800';
  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-600';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200';
  const inputText = darkMode ? 'text-white' : 'text-gray-800';
  const inputPlaceholder = darkMode ? 'placeholder-gray-400' : 'placeholder-gray-400';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold mb-1 ${textPrimary}`}>My Profile</h1>
        <p className={textSecondary}>Manage your personal information and security</p>
      </div>

      {/* Personal Information Card */}
      <div className={`rounded-2xl border shadow-sm p-6 ${cardBg} ${cardBorder}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            darkMode ? 'bg-purple-600/20' : 'bg-purple-100'
          }`}>
            <User className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
          </div>
          <h2 className={`text-lg font-semibold ${textPrimary}`}>Personal Information</h2>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${textMuted}`}>
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${inputBg} ${inputText} ${inputPlaceholder}`}
                placeholder="Enter first name"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${textMuted}`}>
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${inputBg} ${inputText} ${inputPlaceholder}`}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textMuted}`}>
              Email
            </label>
            <div className={`w-full px-4 py-2.5 rounded-lg border text-sm flex items-center gap-2 ${inputBg} ${inputText}`}>
              <Mail className={`w-4 h-4 ${textMuted}`} />
              <span>{user?.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={isUpdating}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm text-white transition-all duration-300 ${
                isUpdating
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              <Save className="w-4 h-4" />
              {isUpdating ? 'Saving...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className={`rounded-2xl border shadow-sm p-6 ${cardBg} ${cardBorder}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            darkMode ? 'bg-orange-600/20' : 'bg-orange-100'
          }`}>
            <Lock className={`w-5 h-5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
          </div>
          <h2 className={`text-lg font-semibold ${textPrimary}`}>Change Password</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textMuted}`}>
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword.current ? 'text' : 'password'}
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className={`w-full px-4 py-2.5 pr-10 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${inputBg} ${inputText} ${inputPlaceholder}`}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${textMuted}`}
              >
                {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textMuted}`}>
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword.new ? 'text' : 'password'}
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className={`w-full px-4 py-2.5 pr-10 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${inputBg} ${inputText} ${inputPlaceholder}`}
                placeholder="Enter new password (min 6 characters)"
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${textMuted}`}
              >
                {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textMuted}`}>
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPassword.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className={`w-full px-4 py-2.5 pr-10 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${inputBg} ${inputText} ${inputPlaceholder}`}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${textMuted}`}
              >
                {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={isChangingPassword}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm text-white transition-all duration-300 ${
                isChangingPassword
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              <Lock className="w-4 h-4" />
              {isChangingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
