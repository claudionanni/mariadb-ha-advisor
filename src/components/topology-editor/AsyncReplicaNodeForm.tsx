import { useState } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import type { AsyncReplicaNode, AsyncReplicaSettings } from '../../types';

interface AsyncReplicaNodeFormProps {
  onCancel?: () => void;
  editingNode?: AsyncReplicaNode;
}

const DEFAULT_SETTINGS: AsyncReplicaSettings = {
  replicationLag: 0,
  readOnly: true,
  connectRetryCount: 10,
  connectRetryInterval: 60,
  priority: 1,
};

export function AsyncReplicaNodeForm({ onCancel, editingNode }: AsyncReplicaNodeFormProps) {
  const servers = useTopologyStore((state) => state.topology.servers);
  const databaseNodes = useTopologyStore((state) => state.topology.databaseNodes);
  const addDatabaseNode = useTopologyStore((state) => state.addDatabaseNode);
  const updateDatabaseNode = useTopologyStore((state) => state.updateDatabaseNode);
  
  const [name, setName] = useState(editingNode?.name || '');
  const [serverId, setServerId] = useState(editingNode?.serverId || '');
  const [role, setRole] = useState<'primary' | 'replica'>(editingNode?.role || 'replica');
  const [priority, setPriority] = useState(editingNode?.settings.priority?.toString() || '1');
  const [error, setError] = useState('');

  // Filter out servers that already have database nodes
  const occupiedServerIds = new Set(
    databaseNodes.filter(n => n.id !== editingNode?.id).map(n => n.serverId)
  );
  const availableServers = servers.filter(s => !occupiedServerIds.has(s.id));

  // Check if primary already exists
  const hasPrimary = databaseNodes.some(
    n => n.nodeType === 'async_replica' && n.role === 'primary' && n.id !== editingNode?.id
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Node name is required');
      return;
    }

    if (!serverId) {
      setError('Please select a server');
      return;
    }

    if (role === 'primary' && hasPrimary) {
      setError('Only one primary node is allowed');
      return;
    }

    const priorityNum = parseInt(priority, 10);
    if (isNaN(priorityNum) || priorityNum < 0) {
      setError('Priority must be a non-negative number');
      return;
    }

    const nodeData: AsyncReplicaNode = {
      id: editingNode?.id || `async-${Date.now()}`,
      name: name.trim(),
      serverId,
      nodeType: 'async_replica',
      role,
      settings: {
        ...DEFAULT_SETTINGS,
        readOnly: role === 'replica',
        priority: priorityNum,
      },
    };

    if (editingNode) {
      updateDatabaseNode(editingNode.id, nodeData);
    } else {
      addDatabaseNode(nodeData);
    }

    // Reset form
    setName('');
    setServerId('');
    setRole('replica');
    setPriority('1');
    setError('');
    onCancel?.();
  };

  return (
    <div className="bg-white border border-emerald-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">
        {editingNode ? 'Edit Async Replica Node' : 'Add Async Replica Node'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="node-name" className="block text-sm font-medium text-gray-700 mb-1">
            Node Name *
          </label>
          <input
            id="node-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g., db-primary, db-replica-1"
          />
        </div>

        {/* Server */}
        <div>
          <label htmlFor="server-select" className="block text-sm font-medium text-gray-700 mb-1">
            Server *
          </label>
          <select
            id="server-select"
            value={serverId}
            onChange={(e) => setServerId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select a server</option>
            {editingNode && (
              <option value={editingNode.serverId}>
                {servers.find(s => s.id === editingNode.serverId)?.name} (current)
              </option>
            )}
            {availableServers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name}
              </option>
            ))}
          </select>
          {servers.length === 0 && (
            <p className="text-sm text-amber-600 mt-1">Please add servers first</p>
          )}
        </div>

        {/* Role */}
        <div>
          <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 mb-1">
            Role *
          </label>
          <select
            id="role-select"
            value={role}
            onChange={(e) => setRole(e.target.value as 'primary' | 'replica')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={role === 'primary' && editingNode?.role === 'primary' && hasPrimary}
          >
            <option value="primary">Primary (Read/Write)</option>
            <option value="replica">Replica (Read-Only)</option>
          </select>
          {hasPrimary && role !== 'primary' && (
            <p className="text-sm text-amber-600 mt-1">
              A primary node already exists
            </p>
          )}
        </div>

        {/* Priority (for replicas) */}
        {role === 'replica' && (
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Failover Priority
            </label>
            <input
              id="priority"
              type="number"
              min="0"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-gray-600 mt-1">
              Higher priority replicas are preferred for promotion to primary during failover
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {editingNode ? 'Update Node' : 'Add Node'}
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
    </div>
  );
}
