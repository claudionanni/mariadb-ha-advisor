import type { AsyncReplicaClusterState } from '../../types';
import { useTopologyStore } from '../../store/topologyStore';

interface AsyncReplicaStateVisualizationProps {
  state?: AsyncReplicaClusterState;
}

export function AsyncReplicaStateVisualization({ state }: AsyncReplicaStateVisualizationProps) {
  const topology = useTopologyStore((state) => state.topology);
  const databaseNodes = topology.databaseNodes || [];
  
  if (!state) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <span className="text-blue-600">💾</span>
          Async Replication State
        </h4>
        <p className="text-sm text-gray-500">No analysis data available</p>
      </div>
    );
  }
  
  const primaryNode = databaseNodes.find(n => n.id === state.primaryNode);
  const replicaNodes = state.nodeStates.filter(n => n.role === 'replica');
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
        <span className="text-blue-600">💾</span>
        Async Replication State
      </h4>

      {/* Primary Node Info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-sm">
          <div className="font-medium text-blue-900 mb-2">Primary Node</div>
          {state.hasActivePrimary ? (
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span className="text-gray-900">{primaryNode?.name || 'Unknown'}</span>
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                Active
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-red-600">❌</span>
              <span className="text-gray-900">No active primary</span>
            </div>
          )}
        </div>
      </div>

      {/* Replica Nodes */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">
          Replica Nodes ({replicaNodes.length})
        </div>
        <div className="space-y-2">
          {replicaNodes.map((replica) => {
            const node = databaseNodes.find(n => n.id === replica.nodeId);
            const isUp = replica.state === 'up';
            
            return (
              <div
                key={replica.nodeId}
                className={`p-2 rounded border ${
                  isUp
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{isUp ? '✅' : '🔴'}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {node?.name || replica.nodeId}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {isUp && replica.canAcceptReads && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        Reads
                      </span>
                    )}
                    {!isUp && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                        Down
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Summary */}
      <div className="p-3 bg-gray-50 rounded border border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-600 font-medium">Total Nodes</div>
            <div className="text-lg font-bold text-gray-900">{state.nodeStates.length}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 font-medium">Active Replicas</div>
            <div className="text-lg font-bold text-gray-900">
              {replicaNodes.filter(n => n.state === 'up').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
