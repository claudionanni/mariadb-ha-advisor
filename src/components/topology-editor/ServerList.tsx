import { useState } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import type { Server } from '../../types';

interface ServerListProps {
  onEdit: (server: Server) => void;
}

export function ServerList({ onEdit }: ServerListProps) {
  const servers = useTopologyStore((state) => state.topology.servers);
  const subnets = useTopologyStore((state) => state.topology.subnets);
  const removeServer = useTopologyStore((state) => state.removeServer);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getSubnetName = (subnetId: string) => {
    return subnets.find(s => s.id === subnetId)?.name || 'Unknown';
  };

  const getHostName = (serverId: string) => {
    return servers.find(s => s.id === serverId)?.name || 'Unknown';
  };

  const getVMsForServer = (serverId: string) => {
    return servers.filter(s => s.physicalServerId === serverId);
  };

  const handleDelete = (id: string) => {
    // Check if server has VMs
    const vms = getVMsForServer(id);
    if (vms.length > 0) {
      alert(`Cannot delete: This server hosts ${vms.length} virtual machine(s). Delete or reassign them first.`);
      return;
    }

    if (deletingId === id) {
      removeServer(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  if (servers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No servers defined yet.</p>
        <p className="text-sm mt-1">Add servers to host your database nodes.</p>
      </div>
    );
  }

  // Separate physical and virtual servers
  const physicalServers = servers.filter(s => !s.isVirtual);
  const virtualServers = servers.filter(s => s.isVirtual);

  return (
    <div className="space-y-6">
      {/* Physical Servers */}
      {physicalServers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Physical Servers</h4>
          <div className="space-y-2">
            {physicalServers.map((server) => {
              const vms = getVMsForServer(server.id);
              return (
                <div
                  key={server.id}
                  className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{server.name}</h5>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span className="inline-flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                          </svg>
                          Physical
                        </span>
                        <span>Subnet: {getSubnetName(server.subnetId)}</span>
                        {vms.length > 0 && (
                          <span className="text-blue-600">
                            {vms.length} VM{vms.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => onEdit(server)}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(server.id)}
                        className={`px-3 py-1 text-sm rounded-md ${
                          deletingId === server.id
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {deletingId === server.id ? 'Confirm' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Virtual Servers */}
      {virtualServers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Virtual Machines</h4>
          <div className="space-y-2">
            {virtualServers.map((server) => (
              <div
                key={server.id}
                className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{server.name}</h5>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="inline-flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                        Virtual
                      </span>
                      <span>Host: {getHostName(server.physicalServerId!)}</span>
                      <span>Subnet: {getSubnetName(server.subnetId)}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => onEdit(server)}
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(server.id)}
                      className={`px-3 py-1 text-sm rounded-md ${
                        deletingId === server.id
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {deletingId === server.id ? 'Confirm' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
