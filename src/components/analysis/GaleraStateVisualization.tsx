import type { GaleraClusterState } from '../../types';
import { useTopologyStore } from '../../store/topologyStore';

interface GaleraStateVisualizationProps {
  state?: GaleraClusterState;
}

export function GaleraStateVisualization({ state }: GaleraStateVisualizationProps) {
  const galeraNodes = useTopologyStore((state) => state.topology.galeraNodes);
  
  if (!state) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <span className="text-emerald-600">🔷</span>
          Galera Cluster State
        </h4>
        <p className="text-sm text-gray-500">No analysis data available</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
        <span className="text-emerald-600">🔷</span>
        Galera Cluster State
      </h4>

      {/* Quorum Info */}
      <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-emerald-600 font-medium">Total Weight</div>
            <div className="text-lg font-bold text-emerald-900">{state.totalWeight}</div>
          </div>
          <div>
            <div className="text-xs text-emerald-600 font-medium">Quorum Required</div>
            <div className="text-lg font-bold text-emerald-900">{state.quorumWeight}</div>
          </div>
          <div>
            <div className="text-xs text-emerald-600 font-medium">Primary Nodes</div>
            <div className="text-lg font-bold text-emerald-900">{state.primaryComponent.length}</div>
          </div>
        </div>
      </div>

      {/* Split Brain Warning */}
      {state.splitBrain && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg border-2 border-red-300">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <div className="font-medium text-red-900">SPLIT-BRAIN DETECTED!</div>
              <div className="text-sm text-red-700">
                Multiple partitions believe they have quorum
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Partitions */}
      {state.partitions.length > 1 && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Network Partitions</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {state.partitions.map((partition) => (
              <div
                key={partition.id}
                className={`p-2 rounded border ${
                  partition.hasQuorum
                    ? 'bg-green-50 border-green-300'
                    : 'bg-gray-50 border-gray-300'
                }`}
              >
                <div className="text-xs font-medium text-gray-700">
                  {partition.hasQuorum ? '✓ Primary' : '○ Non-Primary'}
                </div>
                <div className="text-xs text-gray-600">
                  Weight: {partition.weight} | Nodes: {partition.nodeIds.length}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Node States */}
      <div>
        <h5 className="text-sm font-medium text-gray-700 mb-2">Node Status</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {state.nodeStates.map((nodeState) => {
            const node = galeraNodes.find(n => n.id === nodeState.nodeId);
            const statusColor = 
              nodeState.state === 'down' ? 'bg-gray-100 border-gray-300' :
              nodeState.state === 'primary' ? 'bg-green-50 border-green-300' :
              'bg-yellow-50 border-yellow-300';
            
            const statusIcon = 
              nodeState.state === 'down' ? '⚫' :
              nodeState.state === 'primary' ? '🟢' :
              '🟡';

            return (
              <div
                key={nodeState.nodeId}
                className={`p-3 rounded border ${statusColor}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{statusIcon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {node?.name || nodeState.nodeId}
                    </div>
                    <div className="text-xs text-gray-600">
                      Weight: {node?.settings.pcWeight || 0}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 flex gap-2 text-xs">
                  {nodeState.canAcceptWrites && (
                    <span className="px-1.5 py-0.5 bg-green-200 text-green-800 rounded">
                      W
                    </span>
                  )}
                  {nodeState.canAcceptReads && (
                    <span className="px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded">
                      R
                    </span>
                  )}
                  {nodeState.state === 'down' && (
                    <span className="px-1.5 py-0.5 bg-gray-300 text-gray-700 rounded">
                      DOWN
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
