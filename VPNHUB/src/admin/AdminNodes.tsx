import React, { useState, useEffect } from 'react';
import { Server, Globe, Plus, CreditCard as Edit, Trash2, RefreshCw, Wifi, WifiOff, X, Activity, Users, HardDrive, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllVpnPanels,
  getAllVpnNodes,
  createVpnPanel,
  updateVpnPanel,
  deleteVpnPanel,
  createVpnNode,
  updateVpnNode,
  deleteVpnNode,
  testPanelConnection,
  getPanelStats
} from '../lib/adminService';
import type { VpnPanelFormData, VpnNodeFormData } from '../types';

export default function AdminNodes() {
  const [activeTab, setActiveTab] = useState<'panels' | 'nodes'>('panels');
  const [panels, setPanels] = useState<any[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanelModal, setShowPanelModal] = useState(false);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [editingPanel, setEditingPanel] = useState<any>(null);
  const [editingNode, setEditingNode] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [testingPanel, setTestingPanel] = useState<string | null>(null);
  const [connectionResult, setConnectionResult] = useState<any>(null);

  const [panelForm, setPanelForm] = useState<VpnPanelFormData>({
    name: '',
    country: '',
    panel_url: '',
    username: 'admin',
    password: '',
    subscription_path: 'sub',
    is_active: true,
    max_clients: 100
  });

  const [nodeForm, setNodeForm] = useState<VpnNodeFormData>({
    panel_id: '',
    inbound_id: 1,
    country: '',
    city: '',
    node_name: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'nodes') {
      fetchNodes();
    }
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const panelsData = await getAllVpnPanels();
      setPanels(panelsData);
    } catch (error) {
      console.error('Error fetching panels:', error);
      toast.error('Failed to load panels');
    } finally {
      setLoading(false);
    }
  };

  const fetchNodes = async () => {
    try {
      const nodesData = await getAllVpnNodes();
      setNodes(nodesData);
    } catch (error) {
      console.error('Error fetching nodes:', error);
    }
  };

  // Panel actions
  const openCreatePanel = () => {
    setEditingPanel(null);
    setPanelForm({
      name: '',
      country: '',
      panel_url: '',
      username: 'admin',
      password: '',
      subscription_path: 'sub',
      is_active: true,
      max_clients: 100
    });
    setShowPanelModal(true);
  };

  const openEditPanel = (panel: any) => {
    setEditingPanel(panel);
    setPanelForm({
      name: panel.name,
      country: panel.country,
      panel_url: panel.panel_url,
      username: panel.username,
      password: '', // Don't show password
      subscription_path: panel.subscription_path,
      is_active: panel.is_active,
      max_clients: panel.max_clients || 100
    });
    setShowPanelModal(true);
  };

  const handlePanelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!panelForm.name || !panelForm.panel_url) {
      toast.error('Panel name and URL are required');
      return;
    }

    setSaving(true);
    try {
      let result;
      if (editingPanel) {
        const updateData = { ...panelForm };
        if (!updateData.password) {
          delete (updateData as any).password;
        }
        result = await updateVpnPanel(editingPanel.id, updateData);
      } else {
        if (!panelForm.password) {
          toast.error('Password is required for new panel');
          setSaving(false);
          return;
        }
        result = await createVpnPanel(panelForm);
      }

      if (result.success) {
        toast.success(editingPanel ? 'Panel updated' : 'Panel created');
        setShowPanelModal(false);
        fetchData();
      } else {
        toast.error(result.error || 'Failed to save panel');
      }
    } catch (error) {
      toast.error('Failed to save panel');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePanel = async (panelId: string) => {
    if (!confirm('Are you sure? This will delete all nodes associated with this panel.')) {
      return;
    }

    try {
      const result = await deleteVpnPanel(panelId);
      if (result.success) {
        toast.success('Panel deleted');
        fetchData();
      } else {
        toast.error(result.error || 'Failed to delete panel');
      }
    } catch (error) {
      toast.error('Failed to delete panel');
    }
  };

  const handleTestConnection = async (panelId: string) => {
    setTestingPanel(panelId);
    setConnectionResult(null);
    try {
      const result = await testPanelConnection(panelId);
      if (result.success) {
        setConnectionResult(result.data);
        toast.success('Connection successful');
      } else {
        toast.error(result.error || 'Connection failed');
      }
    } catch (error) {
      toast.error('Failed to test connection');
    } finally {
      setTestingPanel(null);
    }
  };

  // Node actions
  const openCreateNode = () => {
    setEditingNode(null);
    setNodeForm({
      panel_id: panels[0]?.id || '',
      inbound_id: 1,
      country: '',
      city: '',
      node_name: '',
      is_active: true
    });
    setShowNodeModal(true);
  };

  const openEditNode = (node: any) => {
    setEditingNode(node);
    setNodeForm({
      panel_id: node.panel_id,
      inbound_id: node.inbound_id,
      country: node.country,
      city: node.city || '',
      node_name: node.node_name,
      is_active: node.is_active
    });
    setShowNodeModal(true);
  };

  const handleNodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nodeForm.panel_id || !nodeForm.node_name) {
      toast.error('Panel and node name are required');
      return;
    }

    setSaving(true);
    try {
      let result;
      if (editingNode) {
        result = await updateVpnNode(editingNode.id, nodeForm);
      } else {
        result = await createVpnNode(nodeForm);
      }

      if (result.success) {
        toast.success(editingNode ? 'Node updated' : 'Node created');
        setShowNodeModal(false);
        fetchNodes();
      } else {
        toast.error(result.error || 'Failed to save node');
      }
    } catch (error) {
      toast.error('Failed to save node');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm('Are you sure you want to delete this node?')) {
      return;
    }

    try {
      const result = await deleteVpnNode(nodeId);
      if (result.success) {
        toast.success('Node deleted');
        fetchNodes();
      } else {
        toast.error(result.error || 'Failed to delete node');
      }
    } catch (error) {
      toast.error('Failed to delete node');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Node Management</h1>
          <p className="text-gray-400 mt-1">Manage VPN panels and server nodes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab('panels')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === 'panels'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Panels ({panels.length})
        </button>
        <button
          onClick={() => setActiveTab('nodes')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === 'nodes'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Nodes ({nodes.length})
        </button>
      </div>

      {/* Panels Tab */}
      {activeTab === 'panels' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={openCreatePanel}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              <Plus className="w-5 h-5" />
              Add Panel
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
            </div>
          ) : panels.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <Server className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No panels configured</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {panels.map((panel) => (
                <div
                  key={panel.id}
                  className={`bg-gray-800 rounded-lg p-4 border-2 ${
                    panel.is_active ? 'border-gray-700' : 'border-gray-700 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-medium text-white">{panel.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                        <Globe className="w-4 h-4" />
                        {panel.country}
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      panel.is_active ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {panel.is_active ? (
                        <>
                          <Wifi className="w-3 h-3 mr-1" /> Online
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3 h-3 mr-1" /> Offline
                        </>
                      )}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      <span className="truncate">{panel.panel_url}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{panel.clients_count || 0} clients</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      <span>{panel.nodes_count || 0} nodes</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-700">
                    <button
                      onClick={() => handleTestConnection(panel.id)}
                      disabled={testingPanel === panel.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm disabled:opacity-50"
                    >
                      {testingPanel === panel.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Activity className="w-4 h-4" />
                      )}
                      Test
                    </button>
                    <button
                      onClick={() => openEditPanel(panel)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-gray-400 hover:text-white rounded-lg text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePanel(panel.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-gray-400 hover:text-red-400 rounded-lg text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {connectionResult && testingPanel === null && (
                    <div className="mt-3 p-2 bg-gray-700 rounded text-sm">
                      <div className="flex items-center gap-2 text-green-400 mb-2">
                        <CheckCircle className="w-4 h-4" />
                        Connected
                      </div>
                      <div className="text-gray-400">
                        Version: {connectionResult.version}<br />
                        Inbounds: {connectionResult.inbounds_count}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nodes Tab */}
      {activeTab === 'nodes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={openCreateNode}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              <Plus className="w-5 h-5" />
              Add Node
            </button>
          </div>

          {nodes.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No nodes configured</p>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Node</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Panel</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Location</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Inbound</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Clients</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {nodes.map((node) => (
                    <tr key={node.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{node.node_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-300">{node.panel?.name || 'Unknown'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-300">
                          {node.country}{node.city ? `, ${node.city}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-300">{node.inbound_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-300">{node.clients_count || 0}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          node.is_active
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {node.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditNode(node)}
                            className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteNode(node.id)}
                            className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Panel Modal */}
      {showPanelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingPanel ? 'Edit Panel' : 'Add Panel'}
              </h2>
              <button onClick={() => setShowPanelModal(false)} className="p-1 hover:bg-gray-700 rounded">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handlePanelSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Panel Name *</label>
                <input
                  type="text"
                  value={panelForm.name}
                  onChange={(e) => setPanelForm({ ...panelForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="US-East-1"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Country *</label>
                <input
                  type="text"
                  value={panelForm.country}
                  onChange={(e) => setPanelForm({ ...panelForm, country: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="United States"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Panel URL *</label>
                <input
                  type="text"
                  value={panelForm.panel_url}
                  onChange={(e) => setPanelForm({ ...panelForm, panel_url: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="https://panel.example.com:2053"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={panelForm.username}
                    onChange={(e) => setPanelForm({ ...panelForm, username: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Password {editingPanel && '(leave empty to keep)'}
                  </label>
                  <input
                    type="password"
                    value={panelForm.password}
                    onChange={(e) => setPanelForm({ ...panelForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required={!editingPanel}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Subscription Path</label>
                  <input
                    type="text"
                    value={panelForm.subscription_path}
                    onChange={(e) => setPanelForm({ ...panelForm, subscription_path: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max Clients</label>
                  <input
                    type="number"
                    value={panelForm.max_clients}
                    onChange={(e) => setPanelForm({ ...panelForm, max_clients: parseInt(e.target.value) || 100 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="panel_active"
                  checked={panelForm.is_active}
                  onChange={(e) => setPanelForm({ ...panelForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                />
                <label htmlFor="panel_active" className="text-sm text-gray-300">Active</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowPanelModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingPanel ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Node Modal */}
      {showNodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingNode ? 'Edit Node' : 'Add Node'}
              </h2>
              <button onClick={() => setShowNodeModal(false)} className="p-1 hover:bg-gray-700 rounded">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleNodeSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Panel *</label>
                <select
                  value={nodeForm.panel_id}
                  onChange={(e) => setNodeForm({ ...nodeForm, panel_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Select Panel</option>
                  {panels.map((panel) => (
                    <option key={panel.id} value={panel.id}>
                      {panel.name} ({panel.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Node Name *</label>
                <input
                  type="text"
                  value={nodeForm.node_name}
                  onChange={(e) => setNodeForm({ ...nodeForm, node_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Node-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Country</label>
                  <input
                    type="text"
                    value={nodeForm.country}
                    onChange={(e) => setNodeForm({ ...nodeForm, country: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">City</label>
                  <input
                    type="text"
                    value={nodeForm.city}
                    onChange={(e) => setNodeForm({ ...nodeForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Inbound ID</label>
                <input
                  type="number"
                  value={nodeForm.inbound_id}
                  onChange={(e) => setNodeForm({ ...nodeForm, inbound_id: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="node_active"
                  checked={nodeForm.is_active}
                  onChange={(e) => setNodeForm({ ...nodeForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                />
                <label htmlFor="node_active" className="text-sm text-gray-300">Active</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowNodeModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingNode ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
