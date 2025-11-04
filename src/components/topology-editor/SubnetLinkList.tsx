import { useState } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import type { SubnetLink } from '../../types';

interface SubnetLinkListProps {
  onEdit: (link: SubnetLink) => void;
}

export function SubnetLinkList({ onEdit }: SubnetLinkListProps) {
  const subnetLinks = useTopologyStore((state) => state.topology.subnetLinks);
  const subnets = useTopologyStore((state) => state.topology.subnets);
  const removeSubnetLink = useTopologyStore((state) => state.removeSubnetLink);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getSubnetName = (subnetId: string) => {
    return subnets.find(s => s.id === subnetId)?.name || 'Unknown';
  };

  const handleDelete = (id: string) => {
    if (deletingId === id) {
      removeSubnetLink(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  if (subnetLinks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No subnet links defined yet.</p>
        <p className="text-sm mt-1">Connect subnets to define network topology.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {subnetLinks.map((link) => (
        <div
          key={link.id}
          className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">
                  {getSubnetName(link.subnet1Id)}
                </span>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span className="font-medium text-gray-900">
                  {getSubnetName(link.subnet2Id)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                <span className="inline-flex items-center">
                  <span
                    className={`w-2 h-2 rounded-full mr-2 ${
                      link.linkType === 'lan' ? 'bg-green-500' : 'bg-orange-500'
                    }`}
                  />
                  {link.linkType.toUpperCase()}
                </span>
                {link.latencyMs !== undefined && (
                  <span className="text-gray-500">
                    Latency: {link.latencyMs}ms
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => onEdit(link)}
                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(link.id)}
                className={`px-3 py-1 text-sm rounded-md focus:outline-none focus:ring-2 ${
                  deletingId === link.id
                    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                    : 'text-red-600 hover:bg-red-50 focus:ring-red-500'
                }`}
              >
                {deletingId === link.id ? 'Confirm Delete' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
