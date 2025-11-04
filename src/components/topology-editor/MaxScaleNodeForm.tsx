import { useState } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import type { MaxScaleNode, MaxScaleSettings } from '../../types';

interface MaxScaleNodeFormProps {
  onCancel?: () => void;
  editingNode?: MaxScaleNode;
}

// Default MaxScale settings
const DEFAULT_SETTINGS: MaxScaleSettings = {
  monitorInterval: 2000, // 2 seconds
  monitorTimeoutMs: 3000,
  cooperativeMonitoringLocks: 'majority_of_all',
  autoFailover: true,
  failoverTimeout: 90,
};

export function MaxScaleNodeForm({ onCancel, editingNode }: MaxScaleNodeFormProps) {
  const servers = useTopologyStore((state) => state.topology.servers);
  const maxscaleNodes = useTopologyStore((state) => state.topology.maxscaleNodes);
  const galeraNodes = useTopologyStore((state) => state.topology.galeraNodes);
  const addMaxScaleNode = useTopologyStore((state) => state.addMaxScaleNode);
  const updateMaxScaleNode = useTopologyStore((state) => state.updateMaxScaleNode);
  
  const [name, setName] = useState(editingNode?.name || '');
  const [serverId, setServerId] = useState(editingNode?.serverId || '');
  const [monitorInterval, setMonitorInterval] = useState(
    editingNode?.settings.monitorInterval.toString() || '2000'
  );
  const [error, setError] = useState('');

  // Filter out servers that already have MaxScale nodes or Galera nodes
  const occupiedServerIds = new Set([
    ...maxscaleNodes.filter(n => n.id !== editingNode?.id).map(n => n.serverId),
    ...galeraNodes.map(n => n.serverId),
  ]);
  const availableServers = servers.filter(s => !occupiedServerIds.has(s.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Node name is required');
      return;
    }

    if (!serverId) {
      setError('Please select a server');
      return;
    }

    const intervalNum = parseInt(monitorInterval, 10);
    if (isNaN(intervalNum) || intervalNum < 100) {
      setError('Monitor interval must be at least 100ms');
      return;
    }

    const nodeData: MaxScaleNode = {
      id: editingNode?.id || `maxscale-${Date.now()}`,
      name: name.trim(),
      serverId,
      settings: {
        ...DEFAULT_SETTINGS,
        monitorInterval: intervalNum,
      },
    };

    if (editingNode) {
      updateMaxScaleNode(editingNode.id, nodeData);
    } else {
      addMaxScaleNode(nodeData);
    }

    // Reset form
    setName('');
    setServerId('');
    setMonitorInterval('2000');
    
    if (onCancel) onCancel();
  };

  if (servers.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          ⚠️ Please add servers before creating MaxScale nodes.
        </p>
      </div>
    );
  }

  if (availableServers.length === 0 && !editingNode) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          ⚠️ All servers are occupied. Add more servers or use co-location (allowed).
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium mb-4">
        {editingNode ? 'Edit MaxScale Node' : 'Add MaxScale Node'}
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="maxscale-name" className="block text-sm font-medium text-gray-700 mb-1">
            Node Name *
          </label>
          <input
            id="maxscale-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., maxscale-1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="maxscale-server" className="block text-sm font-medium text-gray-700 mb-1">
            Server *
          </label>
          <select
            id="maxscale-server"
            value={serverId}
            onChange={(e) => setServerId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a server...</option>
            {availableServers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name} ({server.isVirtual ? 'VM' : 'Physical'})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Note: MaxScale nodes cannot share servers with Galera nodes
          </p>
        </div>

        <div>
          <label htmlFor="maxscale-interval" className="block text-sm font-medium text-gray-700 mb-1">
            Monitor Interval (ms)
          </label>
          <input
            id="maxscale-interval"
            type="number"
            value={monitorInterval}
            onChange={(e) => setMonitorInterval(e.target.value)}
            min="100"
            step="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            How often MaxScale checks backend server health. Default: 2000ms (2 seconds)
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            ℹ️ Additional settings (cooperative monitoring locks, failover timeout, server priorities) can be configured later in the "HA Settings" tab.
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {editingNode ? 'Update Node' : 'Add MaxScale Node'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
