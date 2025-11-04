import { useTopologyStore } from '../../store/topologyStore';
import type { GaleraNode, AsyncReplicaNode } from '../../types';

export function SettingsView() {
  const topology = useTopologyStore((state) => state.topology);
  
  const galeraNodes = topology.databaseNodes.filter(n => n.nodeType === 'galera') as GaleraNode[];
  const asyncNodes = topology.databaseNodes.filter(n => n.nodeType === 'async_replica') as AsyncReplicaNode[];
  
  const hasNodes = topology.databaseNodes.length > 0 || topology.maxscaleNodes.length > 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">HA Settings Configuration</h2>
      {!hasNodes ? (
        <div className="text-gray-600">
          <p>No nodes defined yet. Please define your topology first.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {galeraNodes.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Galera Nodes</h3>
              <div className="space-y-2">
                {galeraNodes.map((node) => (
                  <div
                    key={node.id}
                    className="p-4 border border-gray-200 rounded hover:border-blue-300"
                  >
                    <div className="font-medium">{node.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Weight: {node.settings.pcWeight}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {asyncNodes.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Async Replica Nodes</h3>
              <div className="space-y-2">
                {asyncNodes.map((node) => (
                  <div
                    key={node.id}
                    className="p-4 border border-gray-200 rounded hover:border-blue-300"
                  >
                    <div className="font-medium">{node.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Role: {node.settings.role === 'primary' ? '🔷 Primary' : '🔶 Replica'}
                      {node.settings.readOnly !== undefined && 
                        ` • Read Only: ${node.settings.readOnly ? 'Yes' : 'No'}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {topology.maxscaleNodes.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">MaxScale Nodes</h3>
              <div className="space-y-2">
                {topology.maxscaleNodes.map((node) => (
                  <div
                    key={node.id}
                    className="p-4 border border-gray-200 rounded hover:border-blue-300"
                  >
                    <div className="font-medium">{node.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Monitor Interval: {node.settings.monitorInterval}ms
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              🚧 Settings editor will be implemented here
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
