import { useState } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import type { Subnet, SubnetType } from '../../types';

interface SubnetFormProps {
  onCancel?: () => void;
  editingSubnet?: Subnet;
}

export function SubnetForm({ onCancel, editingSubnet }: SubnetFormProps) {
  const addSubnet = useTopologyStore((state) => state.addSubnet);
  const updateSubnet = useTopologyStore((state) => state.updateSubnet);
  
  const [name, setName] = useState(editingSubnet?.name || '');
  const [type, setType] = useState<SubnetType>(editingSubnet?.type || 'lan');
  const [latency, setLatency] = useState(editingSubnet?.latencyMs?.toString() || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Subnet name is required');
      return;
    }

    if (type === 'wan' && latency) {
      const latencyNum = parseInt(latency, 10);
      if (isNaN(latencyNum) || latencyNum < 0) {
        setError('Latency must be a positive number');
        return;
      }
    }

    const subnetData: Subnet = {
      id: editingSubnet?.id || `subnet-${Date.now()}`,
      name: name.trim(),
      type,
      latencyMs: type === 'wan' && latency ? parseInt(latency, 10) : undefined,
    };

    if (editingSubnet) {
      updateSubnet(editingSubnet.id, subnetData);
    } else {
      addSubnet(subnetData);
    }

    // Reset form
    setName('');
    setType('lan');
    setLatency('');
    
    if (onCancel) onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium mb-4">
        {editingSubnet ? 'Edit Subnet' : 'Add New Subnet'}
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="subnet-name" className="block text-sm font-medium text-gray-700 mb-1">
            Subnet Name *
          </label>
          <input
            id="subnet-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., DC1-Primary"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="subnet-type" className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <select
            id="subnet-type"
            value={type}
            onChange={(e) => setType(e.target.value as SubnetType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="lan">LAN (Local Area Network)</option>
            <option value="wan">WAN (Wide Area Network)</option>
          </select>
        </div>

        {type === 'wan' && (
          <div>
            <label htmlFor="subnet-latency" className="block text-sm font-medium text-gray-700 mb-1">
              Latency (ms)
            </label>
            <input
              id="subnet-latency"
              type="number"
              value={latency}
              onChange={(e) => setLatency(e.target.value)}
              placeholder="e.g., 50"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Typical latency for WAN connections (optional)
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {editingSubnet ? 'Update Subnet' : 'Add Subnet'}
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
