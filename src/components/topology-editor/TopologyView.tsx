import { useState } from 'react';
import { SubnetForm } from './SubnetForm';
import { SubnetList } from './SubnetList';
import { ServerForm } from './ServerForm';
import { ServerList } from './ServerList';
import type { Subnet, Server } from '../../types';

type FormType = 'subnet' | 'server' | null;

export function TopologyView() {
  const [activeForm, setActiveForm] = useState<FormType>(null);
  const [editingSubnet, setEditingSubnet] = useState<Subnet | undefined>(undefined);
  const [editingServer, setEditingServer] = useState<Server | undefined>(undefined);

  const handleEditSubnet = (subnet: Subnet) => {
    setEditingSubnet(subnet);
    setActiveForm('subnet');
  };

  const handleEditServer = (server: Server) => {
    setEditingServer(server);
    setActiveForm('server');
  };

  const handleCancelForm = () => {
    setActiveForm(null);
    setEditingSubnet(undefined);
    setEditingServer(undefined);
  };

  const handleShowSubnetForm = () => {
    setEditingSubnet(undefined);
    setActiveForm('subnet');
  };

  const handleShowServerForm = () => {
    setEditingServer(undefined);
    setActiveForm('server');
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
        {!activeForm && (
          <div className="flex gap-2">
            <button
              onClick={handleShowSubnetForm}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              + Add Subnet
            </button>
            <button
              onClick={handleShowServerForm}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              + Add Server
            </button>
          </div>
        )}
      </div>

      {/* Forms */}
      {activeForm === 'subnet' && (
        <SubnetForm
          editingSubnet={editingSubnet}
          onCancel={handleCancelForm}
        />
      )}

      {activeForm === 'server' && (
        <ServerForm
          editingServer={editingServer}
          onCancel={handleCancelForm}
        />
      )}

      {/* Subnet List */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Network Subnets</h3>
        <SubnetList onEdit={handleEditSubnet} />
      </div>

      {/* Server List */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Servers</h3>
        <ServerList onEdit={handleEditServer} />
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Progress</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>✓ Define network subnets (LAN/WAN)</li>
          <li>✓ Add servers to subnets</li>
          <li>⏩ Place Galera nodes on servers (coming next)</li>
          <li>⏩ Place MaxScale nodes on servers (coming next)</li>
        </ol>
      </div>
    </div>
  );
}

