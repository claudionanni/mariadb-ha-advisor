import { useState } from 'react';
import { SubnetForm } from './SubnetForm';
import { SubnetList } from './SubnetList';
import type { Subnet } from '../../types';

export function TopologyView() {
  const [showForm, setShowForm] = useState(false);
  const [editingSubnet, setEditingSubnet] = useState<Subnet | undefined>(undefined);

  const handleEdit = (subnet: Subnet) => {
    setEditingSubnet(subnet);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingSubnet(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Topology Builder</h2>
          <p className="mt-1 text-sm text-gray-600">
            Define your infrastructure topology step by step
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Add Subnet
          </button>
        )}
      </div>

      {/* Subnet Form */}
      {showForm && (
        <SubnetForm
          editingSubnet={editingSubnet}
          onCancel={handleCancelForm}
        />
      )}

      {/* Subnet List */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Network Subnets</h3>
        <SubnetList onEdit={handleEdit} />
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Next Steps</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Define network subnets (LAN/WAN)</li>
          <li>Add servers to subnets (coming soon)</li>
          <li>Place Galera nodes on servers (coming soon)</li>
          <li>Place MaxScale nodes on servers (coming soon)</li>
        </ol>
      </div>
    </div>
  );
}

