import { useState } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import type { GaleraNode, GaleraSettings } from '../../types';

interface GaleraNodeFormProps {
  onCancel?: () => void;
  editingNode?: GaleraNode;
}

// Default Galera settings
const DEFAULT_SETTINGS: GaleraSettings = {
  pcWeight: 1,
  pcIgnoreSb: false,
  evsViewForgetTimeout: 'PT24H',
  evsInactiveCheckPeriod: 'PT0.5S',
  evsInactiveTimeout: 'PT15S',
  evsSuspectTimeout: 'PT5S',
  evsInstallTimeout: 'PT7.5S',
  evsKeepalivePeriod: 'PT1S',
  evsJoinRetransmitPeriod: 'PT1S',
};

export function GaleraNodeForm({ onCancel, editingNode }: GaleraNodeFormProps) {
  const servers = useTopologyStore((state) => state.topology.servers);
  const databaseNodes = useTopologyStore((state) => state.topology.databaseNodes);
  const addGaleraNode = useTopologyStore((state) => state.addGaleraNode);
  const updateGaleraNode = useTopologyStore((state) => state.updateGaleraNode);
  
  const [name, setName] = useState(editingNode?.name || '');
  const [serverId, setServerId] = useState(editingNode?.serverId || '');
  const [pcWeight, setPcWeight] = useState(editingNode?.settings.pcWeight.toString() || '1');
  const [error, setError] = useState('');

  // Filter out servers that already have database nodes
  const occupiedServerIds = new Set(
    databaseNodes.filter(n => n.id !== editingNode?.id).map(n => n.serverId)
  );
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

    const weightNum = parseInt(pcWeight, 10);
    if (isNaN(weightNum) || weightNum < 0) {
      setError('Weight must be a non-negative number');
      return;
    }

    const nodeData: GaleraNode = {
      id: editingNode?.id || `galera-${Date.now()}`,
      name: name.trim(),
      serverId,
      settings: {
        ...DEFAULT_SETTINGS,
        pcWeight: weightNum,
      },
    };

    if (editingNode) {
      updateGaleraNode(editingNode.id, nodeData);
    } else {
      addGaleraNode(nodeData);
    }

    // Reset form
    setName('');
    setServerId('');
    setPcWeight('1');
    
    if (onCancel) onCancel();
  };

  if (servers.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          ⚠️ Please add servers before creating Galera nodes.
        </p>
      </div>
    );
  }

  if (availableServers.length === 0 && !editingNode) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          ⚠️ All servers already have Galera nodes. Add more servers first.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium mb-4">
        {editingNode ? 'Edit Galera Node' : 'Add Galera Node'}
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="galera-name" className="block text-sm font-medium text-gray-700 mb-1">
            Node Name *
          </label>
          <input
            id="galera-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., galera-node-1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="galera-server" className="block text-sm font-medium text-gray-700 mb-1">
            Server *
          </label>
          <select
            id="galera-server"
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
            Note: Each server can host only one Galera node
          </p>
        </div>

        <div>
          <label htmlFor="galera-weight" className="block text-sm font-medium text-gray-700 mb-1">
            Quorum Weight (pc.weight)
          </label>
          <input
            id="galera-weight"
            type="number"
            value={pcWeight}
            onChange={(e) => setPcWeight(e.target.value)}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Used for quorum calculation. Default is 1. Higher weight = more votes.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            ℹ️ Additional HA settings (EVS timeouts, auto-evict) can be configured later in the "HA Settings" tab.
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {editingNode ? 'Update Node' : 'Add Galera Node'}
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
