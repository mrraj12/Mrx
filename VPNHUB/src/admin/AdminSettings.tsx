import React, { useState, useEffect } from 'react';
import {
  Settings,
  Globe,
  Server,
  Lock,
  Bell,
  Mail,
  Send,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  Image,
  Users,
  Percent,
  Monitor,
  Smartphone,
  Laptop,
  Trash2,
  LogOut
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllSettings,
  updateSystemSettings,
  updateAppSettings,
  updateEmailSettings,
  updateTelegramSettings,
  testEmailSettings,
  testTelegramSettings,
  getEmailTemplates
} from '../lib/adminService';
import { useAdmin } from '../contexts/AdminContext';
import type { EmailTemplate } from '../types';

type SettingsTab = 'general' | 'admin' | 'node' | 'subscription' | 'security' | 'sessions' | 'email' | 'telegram' | 'templates' | 'reseller';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<'email' | 'telegram' | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const { sessions, currentSessionId, fetchSessions, revokeSession, revokeAllOtherSessions } = useAdmin();
  const [revokingSession, setRevokingSession] = useState<string | null>(null);

  const [settings, setSettings] = useState<any>({
    system: null,
    app: null,
    email: null,
    telegram: null
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates();
    }
    if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, [activeTab]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await getAllSettings();
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await getEmailTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates');
    }
  };

  const handleSave = async (type: 'system' | 'app' | 'email' | 'telegram') => {
    setSaving(true);
    try {
      let result;
      switch (type) {
        case 'system':
          result = await updateSystemSettings(settings.system, settings.system?.id);
          break;
        case 'app':
          result = await updateAppSettings(settings.app);
          break;
        case 'email':
          result = await updateEmailSettings(settings.email);
          break;
        case 'telegram':
          result = await updateTelegramSettings(settings.telegram);
          break;
      }

      if (result?.success) {
        toast.success('Settings saved successfully');
        fetchSettings();
      } else {
        toast.error(result?.error || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (type: 'email' | 'telegram') => {
    setTesting(type);
    try {
      const result = type === 'email' ? await testEmailSettings() : await testTelegramSettings();
      if (result.success) {
        toast.success(`${type === 'email' ? 'Email' : 'Telegram'} test successful`);
      } else {
        toast.error(result.error || 'Test failed');
      }
    } catch (error) {
      toast.error('Test failed');
    } finally {
      setTesting(null);
    }
  };

  const updateSetting = (category: 'system' | 'app' | 'email' | 'telegram', key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Globe className="w-4 h-4" /> },
    { id: 'admin', label: 'Admin Path', icon: <Lock className="w-4 h-4" /> },
    { id: 'node', label: 'Node Settings', icon: <Server className="w-4 h-4" /> },
    { id: 'subscription', label: 'Subscription', icon: <Settings className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
    { id: 'sessions', label: 'Sessions', icon: <Monitor className="w-4 h-4" /> },
    { id: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
    { id: 'telegram', label: 'Telegram', icon: <Bell className="w-4 h-4" /> },
    { id: 'templates', label: 'Templates', icon: <Mail className="w-4 h-4" /> },
    { id: 'reseller', label: 'Reseller', icon: <Users className="w-4 h-4" /> }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Configure your application settings</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-gray-800 rounded-lg p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-gray-800 rounded-lg p-6">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-white">General Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Site Name</label>
                <input
                  type="text"
                  value={settings.system?.site_name || ''}
                  onChange={(e) => updateSetting('system', 'site_name', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Site Description</label>
                <input
                  type="text"
                  value={settings.app?.site_description || ''}
                  onChange={(e) => updateSetting('app', 'site_description', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Logo URL</label>
                <input
                  type="text"
                  value={settings.app?.logo_url || ''}
                  onChange={(e) => updateSetting('app', 'logo_url', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={settings.app?.contact_email || ''}
                  onChange={(e) => updateSetting('app', 'contact_email', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Default Currency</label>
                <select
                  value={settings.app?.default_currency || 'CNY'}
                  onChange={(e) => {
                    updateSetting('app', 'default_currency', e.target.value);
                    updateSetting('app', 'currency_symbol', e.target.value === 'CNY' ? '¥' : e.target.value === 'USD' ? '$' : e.target.value === 'EUR' ? '€' : e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="CNY">CNY (¥)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Timezone</label>
                <select
                  value={settings.app?.timezone || 'Asia/Shanghai'}
                  onChange={(e) => updateSetting('app', 'timezone', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="Asia/Shanghai">Asia/Shanghai</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.app?.registration_enabled ?? true}
                    onChange={(e) => updateSetting('app', 'registration_enabled', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                  />
                  <span className="text-sm text-gray-300">Allow new user registration</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.system?.maintenance_mode ?? false}
                    onChange={(e) => updateSetting('system', 'maintenance_mode', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                  />
                  <span className="text-sm text-gray-300">Maintenance mode (only admins can access)</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <button
                onClick={() => handleSave('system')}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="ml-2">Save System</span>
              </button>
              <button
                onClick={() => handleSave('app')}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
              >
                Save App Settings
              </button>
            </div>
          </div>
        )}

        {/* Admin Path Settings */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-white">Admin Panel Path</h2>
            <p className="text-sm text-gray-400">
              Change the URL path to access the admin panel. After changing, you'll need to use the new path.
            </p>
            <div className="max-w-md">
              <label className="block text-sm text-gray-400 mb-1">Admin Path</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">/</span>
                <input
                  type="text"
                  value={settings.system?.admin_panel_path || 'admin'}
                  onChange={(e) => updateSetting('system', 'admin_panel_path', e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="admin"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Current URL: /{settings.system?.admin_panel_path || 'admin'}/login
              </p>
            </div>
            <button
              onClick={() => handleSave('system')}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
            >
              Save Admin Path
            </button>
          </div>
        )}

        {/* Node Settings */}
        {activeTab === 'node' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-white">Node Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Node Selection Mode</label>
                <select
                  value={settings.app?.node_selection_mode || 'auto'}
                  onChange={(e) => updateSetting('app', 'node_selection_mode', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="auto">Auto (Best Available)</option>
                  <option value="manual">Manual (Admin Selects)</option>
                  <option value="load_balanced">Load Balanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Default Node</label>
                <select
                  value={settings.app?.default_node_id || ''}
                  onChange={(e) => updateSetting('app', 'default_node_id', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Auto Select</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => handleSave('app')}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
            >
              Save Node Settings
            </button>
          </div>
        )}

        {/* Subscription Settings */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-white">Subscription Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Subscription URL Format</label>
                <input
                  type="text"
                  value={settings.app?.subscription_path_format || 'sub/{client_uuid}'}
                  onChange={(e) => updateSetting('app', 'subscription_path_format', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Use {'{client_uuid}'} as placeholder</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tutorial URL</label>
                <input
                  type="text"
                  value={settings.app?.tutorial_url || ''}
                  onChange={(e) => updateSetting('app', 'tutorial_url', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Devices Per User</label>
                <input
                  type="number"
                  value={settings.app?.max_devices_per_user || 5}
                  onChange={(e) => updateSetting('app', 'max_devices_per_user', parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Support URL</label>
                <input
                  type="text"
                  value={settings.app?.support_url || ''}
                  onChange={(e) => updateSetting('app', 'support_url', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="https://..."
                />
              </div>
            </div>
            <button
              onClick={() => handleSave('app')}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
            >
              Save Subscription Settings
            </button>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-white">Security Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Session Timeout (minutes)</label>
                <input
                  type="number"
                  value={settings.app?.session_timeout_minutes || 60}
                  onChange={(e) => updateSetting('app', 'session_timeout_minutes', parseInt(e.target.value) || 60)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.app?.require_2fa ?? false}
                    onChange={(e) => updateSetting('app', 'require_2fa', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                  />
                  <span className="text-sm text-gray-300">Require 2FA for admin accounts</span>
                </label>
              </div>
            </div>
            <button
              onClick={() => handleSave('app')}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
            >
              Save Security Settings
            </button>
          </div>
        )}

        {/* Session Management */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-white">Active Sessions</h2>
                <p className="text-sm text-gray-400">Manage your active login sessions across devices</p>
              </div>
              <button
                onClick={async () => {
                  const success = await revokeAllOtherSessions();
                  if (success) {
                    toast.success('All other sessions revoked');
                  } else {
                    toast.error('Failed to revoke sessions');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
              >
                <LogOut className="w-4 h-4" />
                Log Out All Other Sessions
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <Monitor className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No active sessions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`bg-gray-700 rounded-lg p-4 ${
                      session.id === currentSessionId ? 'ring-2 ring-purple-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                          {session.device_info?.device === 'Mobile' ? (
                            <Smartphone className="w-5 h-5 text-gray-300" />
                          ) : session.device_info?.device === 'Tablet' ? (
                            <Smartphone className="w-5 h-5 text-gray-300" />
                          ) : (
                            <Laptop className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">
                              {session.device_info?.browser || 'Unknown'} on {session.device_info?.os || 'Unknown'}
                            </span>
                            {session.id === currentSessionId && (
                              <span className="text-xs px-2 py-0.5 bg-purple-600 text-white rounded">
                                Current
                              </span>
                            )}
                            {!session.is_active && (
                              <span className="text-xs px-2 py-0.5 bg-gray-600 text-gray-300 rounded">
                                Expired
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            IP: {session.ip_address || 'Unknown'} • Token: {session.token_prefix}...
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Last active: {new Date(session.last_activity_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right text-xs text-gray-400">
                          <div>Created: {new Date(session.created_at).toLocaleDateString()}</div>
                          <div>Expires: {new Date(session.expires_at).toLocaleDateString()}</div>
                        </div>
                        {session.id !== currentSessionId && session.is_active && (
                          <button
                            onClick={async () => {
                              setRevokingSession(session.id);
                              const success = await revokeSession(session.id);
                              setRevokingSession(null);
                              if (success) {
                                toast.success('Session revoked');
                              } else {
                                toast.error('Failed to revoke session');
                              }
                            }}
                            disabled={revokingSession === session.id}
                            className="ml-3 p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {revokingSession === session.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-500">
                Sessions automatically expire after 8 hours of inactivity. You can have up to 5 active sessions.
              </p>
            </div>
          </div>
        )}

        {/* Email Settings */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-white">Email Settings (SMTP)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={settings.email?.smtp_host || ''}
                  onChange={(e) => updateSetting('email', 'smtp_host', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">SMTP Port</label>
                <input
                  type="number"
                  value={settings.email?.smtp_port || 587}
                  onChange={(e) => updateSetting('email', 'smtp_port', parseInt(e.target.value) || 587)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">SMTP Username</label>
                <input
                  type="text"
                  value={settings.email?.smtp_username || ''}
                  onChange={(e) => updateSetting('email', 'smtp_username', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">SMTP Password</label>
                <input
                  type="password"
                  value={settings.email?.smtp_password || ''}
                  onChange={(e) => updateSetting('email', 'smtp_password', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">From Name</label>
                <input
                  type="text"
                  value={settings.email?.from_name || ''}
                  onChange={(e) => updateSetting('email', 'from_name', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">From Email</label>
                <input
                  type="email"
                  value={settings.email?.from_email || ''}
                  onChange={(e) => updateSetting('email', 'from_email', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Encryption</label>
                <select
                  value={settings.email?.encryption || 'tls'}
                  onChange={(e) => updateSetting('email', 'encryption', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.email?.is_enabled ?? false}
                    onChange={(e) => updateSetting('email', 'is_enabled', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                  />
                  <span className="text-sm text-gray-300">Enable email sending</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-700">
              <button
                onClick={() => handleTest('email')}
                disabled={testing === 'email'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {testing === 'email' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Test Email
              </button>
              <button
                onClick={() => handleSave('email')}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
              >
                Save Email Settings
              </button>
            </div>
          </div>
        )}

        {/* Telegram Settings */}
        {activeTab === 'telegram' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-white">Telegram Bot Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Bot Token</label>
                <input
                  type="password"
                  value={settings.telegram?.bot_token || ''}
                  onChange={(e) => updateSetting('telegram', 'bot_token', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="123456789:ABC..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Chat ID</label>
                <input
                  type="text"
                  value={settings.telegram?.chat_id || ''}
                  onChange={(e) => updateSetting('telegram', 'chat_id', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="-1001234567890"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.telegram?.is_enabled ?? false}
                    onChange={(e) => updateSetting('telegram', 'is_enabled', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                  />
                  <span className="text-sm text-gray-300">Enable Telegram notifications</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-400 mb-2">Notification Types:</p>
                <div className="space-y-2">
                  {[
                    { key: 'notify_new_orders', label: 'New Orders' },
                    { key: 'notify_order_approved', label: 'Order Approved' },
                    { key: 'notify_order_rejected', label: 'Order Rejected' },
                    { key: 'notify_subscription_expired', label: 'Subscription Expired' },
                    { key: 'notify_daily_stats', label: 'Daily Statistics' }
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.telegram?.[item.key] ?? false}
                        onChange={(e) => updateSetting('telegram', item.key, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                      />
                      <span className="text-sm text-gray-300">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-700">
              <button
                onClick={() => handleTest('telegram')}
                disabled={testing === 'telegram'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {testing === 'telegram' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Test Telegram
              </button>
              <button
                onClick={() => handleSave('telegram')}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
              >
                Save Telegram Settings
              </button>
            </div>
          </div>
        )}

        {/* Templates */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-white">Email Templates</h2>
            <div className="space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-white font-medium">{template.name}</h3>
                      <span className="text-xs text-gray-400">{template.template_type}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      template.is_active ? 'bg-green-900/30 text-green-400' : 'bg-gray-600 text-gray-400'
                    }`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">Subject: {template.subject}</p>
                  <p className="text-xs text-gray-500">
                    Variables: {template.variables.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reseller Settings */}
        {activeTab === 'reseller' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-white">Reseller Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.app?.reseller_enabled ?? false}
                    onChange={(e) => updateSetting('app', 'reseller_enabled', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                  />
                  <span className="text-sm text-gray-300">Enable Reseller System</span>
                </label>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Default Commission Rate (%)</label>
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={settings.app?.default_commission_rate || 10}
                    onChange={(e) => updateSetting('app', 'default_commission_rate', parseFloat(e.target.value) || 10)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Reseller Currency</label>
                <select
                  value={settings.app?.reseller_currency || 'CNY'}
                  onChange={(e) => updateSetting('app', 'reseller_currency', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="CNY">CNY (¥)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Minimum Payout Amount (¥)</label>
                <input
                  type="number"
                  value={settings.app?.minimum_payout_amount || 100}
                  onChange={(e) => updateSetting('app', 'minimum_payout_amount', parseFloat(e.target.value) || 100)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.app?.auto_approve_resellers ?? false}
                    onChange={(e) => updateSetting('app', 'auto_approve_resellers', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                  />
                  <span className="text-sm text-gray-300">Auto Approve Resellers (skip admin review)</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Reseller Terms Text</label>
                <textarea
                  value={settings.app?.reseller_terms || ''}
                  onChange={(e) => updateSetting('app', 'reseller_terms', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Enter terms and conditions for resellers..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <button
                onClick={() => handleSave('app')}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="ml-2">Save Reseller Settings</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
