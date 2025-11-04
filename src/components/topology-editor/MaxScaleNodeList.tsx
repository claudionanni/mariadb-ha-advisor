import { useState } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import type { MaxScaleNode } from '../../types';
import { MaxScaleNodeSettings } from '../topology/MaxScaleNodeSettings';

interface MaxScaleNodeListProps {
  onEdit: (node: MaxScaleNode) => void;
}

export function MaxScaleNodeList({ onEdit }: MaxScaleNodeListProps) {
  const maxscaleNodes = useTopologyStore((state) => state.topology.maxscaleNodes);
  const servers = useTopologyStore((state) => state.topology.servers);
  const subnets = useTopologyStore((state) => state.topology.subnets);
  const removeMaxScaleNode = useTopologyStore((state) => state.removeMaxScaleNode);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getServerInfo = (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (!server) return { name: 'Unknown', subnet: 'Unknown' };
    
    const subnet = subnets.find(s => s.id === server.subnetId);
    return {
      name: server.name,
      subnet: subnet?.name || 'Unknown',
      isVirtual: server.isVirtual,
    };
  };

  const handleDelete = (id: string) => {
    if (deletingId === id) {
      removeMaxScaleNode(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  if (maxscaleNodes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No MaxScale nodes defined yet.</p>
        <p className="text-sm mt-1">Add MaxScale proxy nodes for load balancing and routing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <div className="text-sm text-purple-800">
          <strong>{maxscaleNodes.length} MaxScale node(s)</strong> configured for database routing and monitoring
        </div>
      </div>

      {/* Node List */}
      <div className="space-y-2">
        {maxscaleNodes.map((node) => {
          const serverInfo = getServerInfo(node.serverId);
          return (
            <div
              key={node.id}
              className="bg-white p-4 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium text-gray-900">{node.name}</h5>
                    <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                      MaxScale
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span className="inline-flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                      Server: {serverInfo.name}
                      {serverInfo.isVirtual && <span className="ml-1 text-xs text-gray-500">(VM)</span>}
                    </span>
                    <span>Subnet: {serverInfo.subnet}</span>
                    <span className="text-purple-600">
                      Monitor: {node.settings.monitorInterval}ms
                    </span>
                  </div>
                  
                  {/* Settings Editor */}
                  <MaxScaleNodeSettings node={node} />
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => onEdit(node)}
                    className="px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(node.id)}
                    className={`px-3 py-1 text-sm rounded-md focus:outline-none focus:ring-2 ${
                      deletingId === node.id
                        ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                        : 'text-red-600 hover:bg-red-50 focus:ring-red-500'
                    }`}
                  >
                    {deletingId === node.id ? 'Confirm' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
