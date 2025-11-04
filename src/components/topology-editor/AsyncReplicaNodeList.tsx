import { useState } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import type { AsyncReplicaNode } from '../../types';

interface AsyncReplicaNodeListProps {
  onEdit: (node: AsyncReplicaNode) => void;
}

export function AsyncReplicaNodeList({ onEdit }: AsyncReplicaNodeListProps) {
  const databaseNodes = useTopologyStore((state) => state.topology.databaseNodes);
  const servers = useTopologyStore((state) => state.topology.servers);
  const subnets = useTopologyStore((state) => state.topology.subnets);
  const removeDatabaseNode = useTopologyStore((state) => state.removeDatabaseNode);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter only async replica nodes
  const asyncNodes = databaseNodes.filter(n => n.nodeType === 'async_replica') as AsyncReplicaNode[];

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
      removeDatabaseNode(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  if (asyncNodes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No async replica nodes defined yet.</p>
        <p className="text-sm mt-1">Add primary and replica nodes to your cluster.</p>
      </div>
    );
  }

  // Find primary and replicas
  const primary = asyncNodes.find(n => n.role === 'primary');
  const replicas = asyncNodes.filter(n => n.role === 'replica');

  return (
    <div className="space-y-4">
      {/* Cluster Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-800">
            <strong>Cluster Status:</strong> {asyncNodes.length} node(s)
          </span>
          <span className="text-blue-800">
            <strong>Primary:</strong> {primary ? '1' : '0'} | <strong>Replicas:</strong> {replicas.length}
          </span>
        </div>
      </div>

      {!primary && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            ⚠️ <strong>Warning:</strong> No primary node defined. Add a primary node to enable replication.
          </p>
        </div>
      )}

      {/* Node List */}
      <div className="space-y-2">
        {asyncNodes.map((node) => {
          const serverInfo = getServerInfo(node.serverId);
          return (
            <div
              key={node.id}
              className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium text-gray-900">{node.name}</h5>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      node.role === 'primary' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {node.role === 'primary' ? 'Primary' : 'Replica'}
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
                    {node.role === 'replica' && node.settings.priority !== undefined && (
                      <span>Priority: {node.settings.priority}</span>
                    )}
                  </div>
                  
                  {/* Role Description */}
                  <div className="mt-2 text-xs text-gray-600">
                    {node.role === 'primary' ? (
                      <span>Handles all write operations and replicates to replicas</span>
                    ) : (
                      <span>Read-only replica, can be promoted to primary during failover</span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => onEdit(node)}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
