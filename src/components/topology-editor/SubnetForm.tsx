import { useState } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import type { Subnet } from '../../types';

interface SubnetFormProps {
  onCancel?: () => void;
  editingSubnet?: Subnet;
}

export function SubnetForm({ onCancel, editingSubnet }: SubnetFormProps) {
  const addSubnet = useTopologyStore((state) => state.addSubnet);
  const updateSubnet = useTopologyStore((state) => state.updateSubnet);
  
  const [name, setName] = useState(editingSubnet?.name || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Subnet name is required');
      return;
    }

    const subnetData: Subnet = {
      id: editingSubnet?.id || `subnet-${Date.now()}`,
      name: name.trim(),
    };

    if (editingSubnet) {
      updateSubnet(editingSubnet.id, subnetData);
    } else {
      addSubnet(subnetData);
    }

    // Reset form
    setName('');
    
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
            placeholder="e.g., DC1-Primary, DC2-Backup"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            All subnets are LAN by default. Define WAN links between subnets separately.
          </p>
        </div>
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
