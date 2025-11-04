import { useState } from 'react';
import { SubnetForm } from './SubnetForm';
import { SubnetList } from './SubnetList';
import { ServerForm } from './ServerForm';
import { ServerList } from './ServerList';
import { GaleraNodeForm } from './GaleraNodeForm';
import { GaleraNodeList } from './GaleraNodeList';
import { MaxScaleNodeForm } from './MaxScaleNodeForm';
import { MaxScaleNodeList } from './MaxScaleNodeList';
import type { Subnet, Server, GaleraNode, MaxScaleNode } from '../../types';

type FormType = 'subnet' | 'server' | 'galera' | 'maxscale' | null;

export function TopologyView() {
  const [activeForm, setActiveForm] = useState<FormType>(null);
  const [editingSubnet, setEditingSubnet] = useState<Subnet | undefined>(undefined);
  const [editingServer, setEditingServer] = useState<Server | undefined>(undefined);
  const [editingGalera, setEditingGalera] = useState<GaleraNode | undefined>(undefined);
  const [editingMaxScale, setEditingMaxScale] = useState<MaxScaleNode | undefined>(undefined);

  const handleEditSubnet = (subnet: Subnet) => {
    setEditingSubnet(subnet);
    setActiveForm('subnet');
  };

  const handleEditServer = (server: Server) => {
    setEditingServer(server);
    setActiveForm('server');
  };

  const handleEditGalera = (node: GaleraNode) => {
    setEditingGalera(node);
    setActiveForm('galera');
  };

  const handleEditMaxScale = (node: MaxScaleNode) => {
    setEditingMaxScale(node);
    setActiveForm('maxscale');
  };

  const handleCancelForm = () => {
    setActiveForm(null);
    setEditingSubnet(undefined);
    setEditingServer(undefined);
    setEditingGalera(undefined);
    setEditingMaxScale(undefined);
  };

  const handleShowForm = (type: FormType) => {
    setEditingSubnet(undefined);
    setEditingServer(undefined);
    setEditingGalera(undefined);
    setEditingMaxScale(undefined);
    setActiveForm(type);
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
              onClick={() => handleShowForm('subnet')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              + Subnet
            </button>
            <button
              onClick={() => handleShowForm('server')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            >
              + Server
            </button>
            <button
              onClick={() => handleShowForm('galera')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              + Galera Node
            </button>
            <button
              onClick={() => handleShowForm('maxscale')}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              + MaxScale Node
            </button>
          </div>
        )}
      </div>

      {/* Forms */}
      {activeForm === 'subnet' && (
        <SubnetForm editingSubnet={editingSubnet} onCancel={handleCancelForm} />
      )}
      {activeForm === 'server' && (
        <ServerForm editingServer={editingServer} onCancel={handleCancelForm} />
      )}
      {activeForm === 'galera' && (
        <GaleraNodeForm editingNode={editingGalera} onCancel={handleCancelForm} />
      )}
      {activeForm === 'maxscale' && (
        <MaxScaleNodeForm editingNode={editingMaxScale} onCancel={handleCancelForm} />
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

      {/* Galera Nodes List */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Galera Database Nodes</h3>
        <GaleraNodeList onEdit={handleEditGalera} />
      </div>

      {/* MaxScale Nodes List */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">MaxScale Proxy Nodes</h3>
        <MaxScaleNodeList onEdit={handleEditMaxScale} />
      </div>

      {/* Progress Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-900 mb-2">✓ Topology Complete!</h4>
        <p className="text-sm text-green-800">
          You can now configure detailed HA settings for each node in the <strong>"HA Settings"</strong> tab,
          then run failure simulations in the <strong>"Analysis"</strong> tab.
        </p>
      </div>
    </div>
  );
}

