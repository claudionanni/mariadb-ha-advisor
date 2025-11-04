import { useState } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import type { Subnet } from '../../types';

interface SubnetListProps {
  onEdit: (subnet: Subnet) => void;
}

export function SubnetList({ onEdit }: SubnetListProps) {
  const subnets = useTopologyStore((state) => state.topology.subnets);
  const removeSubnet = useTopologyStore((state) => state.removeSubnet);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (deletingId === id) {
      removeSubnet(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      // Auto-cancel after 3 seconds
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  if (subnets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No subnets defined yet.</p>
        <p className="text-sm mt-1">Add your first subnet to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {subnets.map((subnet) => (
        <div
          key={subnet.id}
          className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{subnet.name}</h4>
              <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                <span className="inline-flex items-center">
                  <span
                    className={`w-2 h-2 rounded-full mr-2 ${
                      subnet.type === 'lan' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                  />
                  {subnet.type.toUpperCase()}
                </span>
                {subnet.latencyMs && (
                  <span className="text-gray-500">
                    Latency: {subnet.latencyMs}ms
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => onEdit(subnet)}
                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(subnet.id)}
                className={`px-3 py-1 text-sm rounded-md focus:outline-none focus:ring-2 ${
                  deletingId === subnet.id
                    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                    : 'text-red-600 hover:bg-red-50 focus:ring-red-500'
                }`}
              >
                {deletingId === subnet.id ? 'Confirm Delete' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
