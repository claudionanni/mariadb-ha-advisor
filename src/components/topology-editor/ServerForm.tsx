import { useState } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import type { Server } from '../../types';

interface ServerFormProps {
  onCancel?: () => void;
  editingServer?: Server;
}

export function ServerForm({ onCancel, editingServer }: ServerFormProps) {
  const subnets = useTopologyStore((state) => state.topology.subnets);
  const servers = useTopologyStore((state) => state.topology.servers);
  const addServer = useTopologyStore((state) => state.addServer);
  const updateServer = useTopologyStore((state) => state.updateServer);
  
  const [name, setName] = useState(editingServer?.name || '');
  const [subnetId, setSubnetId] = useState(editingServer?.subnetId || '');
  const [isVirtual, setIsVirtual] = useState(editingServer?.isVirtual || false);
  const [physicalServerId, setPhysicalServerId] = useState(editingServer?.physicalServerId || '');
  const [error, setError] = useState('');

  // Get physical servers only for VM host selection
  const physicalServers = servers.filter(s => !s.isVirtual && s.id !== editingServer?.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Server name is required');
      return;
    }

    if (!subnetId) {
      setError('Please select a subnet');
      return;
    }

    if (isVirtual && !physicalServerId) {
      setError('Please select a physical host for the virtual machine');
      return;
    }

    // Prevent circular dependency
    if (isVirtual && physicalServerId === editingServer?.id) {
      setError('A server cannot be its own host');
      return;
    }

    const serverData: Server = {
      id: editingServer?.id || `server-${Date.now()}`,
      name: name.trim(),
      subnetId,
      isVirtual,
      physicalServerId: isVirtual ? physicalServerId : undefined,
    };

    if (editingServer) {
      updateServer(editingServer.id, serverData);
    } else {
      addServer(serverData);
    }

    // Reset form
    setName('');
    setSubnetId('');
    setIsVirtual(false);
    setPhysicalServerId('');
    
    if (onCancel) onCancel();
  };

  if (subnets.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          ⚠️ Please add at least one subnet before creating servers.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium mb-4">
        {editingServer ? 'Edit Server' : 'Add New Server'}
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="server-name" className="block text-sm font-medium text-gray-700 mb-1">
            Server Name *
          </label>
          <input
            id="server-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., db-server-01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="server-subnet" className="block text-sm font-medium text-gray-700 mb-1">
            Subnet *
          </label>
          <select
            id="server-subnet"
            value={subnetId}
            onChange={(e) => setSubnetId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a subnet...</option>
            {subnets.map((subnet) => (
              <option key={subnet.id} value={subnet.id}>
                {subnet.name} ({subnet.type.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <input
            id="server-virtual"
            type="checkbox"
            checked={isVirtual}
            onChange={(e) => {
              setIsVirtual(e.target.checked);
              if (!e.target.checked) setPhysicalServerId('');
            }}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="server-virtual" className="ml-2 block text-sm text-gray-700">
            This is a virtual machine
          </label>
        </div>

        {isVirtual && (
          <div>
            <label htmlFor="server-host" className="block text-sm font-medium text-gray-700 mb-1">
              Physical Host *
            </label>
            <select
              id="server-host"
              value={physicalServerId}
              onChange={(e) => setPhysicalServerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select physical host...</option>
              {physicalServers.length === 0 ? (
                <option disabled>No physical servers available</option>
              ) : (
                physicalServers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name}
                  </option>
                ))
              )}
            </select>
            {physicalServers.length === 0 && (
              <p className="mt-1 text-sm text-yellow-600">
                Add a physical server first to create VMs
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {editingServer ? 'Update Server' : 'Add Server'}
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
