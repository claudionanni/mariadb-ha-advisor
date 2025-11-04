import type { MaxScaleNodeState } from '../../types';
import { useTopologyStore } from '../../store/topologyStore';

interface MaxScaleStateVisualizationProps {
  states: MaxScaleNodeState[];
}

export function MaxScaleStateVisualization({ states }: MaxScaleStateVisualizationProps) {
  const maxscaleNodes = useTopologyStore((state) => state.topology.maxscaleNodes);
  const galeraNodes = useTopologyStore((state) => state.topology.galeraNodes);
  
  const routingCount = states.filter(s => s.canRoute).length;
  const downCount = states.filter(s => s.state === 'down').length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
        <span className="text-purple-600">🔶</span>
        MaxScale Routing State
      </h4>

      {/* Summary Stats */}
      <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-purple-600 font-medium">Total Instances</div>
            <div className="text-lg font-bold text-purple-900">{states.length}</div>
          </div>
          <div>
            <div className="text-xs text-purple-600 font-medium">Can Route</div>
            <div className="text-lg font-bold text-purple-900">{routingCount}</div>
          </div>
          <div>
            <div className="text-xs text-purple-600 font-medium">Down</div>
            <div className="text-lg font-bold text-purple-900">{downCount}</div>
          </div>
        </div>
      </div>

      {/* MaxScale Nodes */}
      <div>
        <h5 className="text-sm font-medium text-gray-700 mb-2">Instance Status</h5>
        <div className="space-y-3">
          {states.map((nodeState) => {
            const node = maxscaleNodes.find(n => n.id === nodeState.nodeId);
            
            const statusColor = 
              nodeState.state === 'down' ? 'bg-gray-100 border-gray-300' :
              nodeState.canRoute ? 'bg-green-50 border-green-300' :
              'bg-orange-50 border-orange-300';
            
            const statusIcon = 
              nodeState.state === 'down' ? '⚫' :
              nodeState.canRoute ? '🟢' :
              '🟠';

            return (
              <div
                key={nodeState.nodeId}
                className={`p-3 rounded border ${statusColor}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{statusIcon}</span>
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        {node?.name || nodeState.nodeId}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {nodeState.state === 'down' ? 'DOWN' :
                         nodeState.canRoute ? 'ROUTING' : 'MONITORING ONLY'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {nodeState.hasLock && nodeState.state !== 'down' && (
                      <span className="px-2 py-1 text-xs bg-purple-200 text-purple-800 rounded">
                        🔒 Has Lock
                      </span>
                    )}
                    {!nodeState.hasLock && nodeState.state !== 'down' && (
                      <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                        No Lock
                      </span>
                    )}
                  </div>
                </div>

                {/* Visible Galera Nodes */}
                {nodeState.state !== 'down' && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      Visible Galera Nodes: {nodeState.visibleGaleraNodes.length}
                    </div>
                    {nodeState.visibleGaleraNodes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {nodeState.visibleGaleraNodes.map((galeraId) => {
                          const galeraNode = galeraNodes.find(n => n.id === galeraId);
                          return (
                            <span
                              key={galeraId}
                              className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800 rounded"
                            >
                              {galeraNode?.name || galeraId}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-red-600">
                        ⚠️ No Galera nodes visible - cannot route queries
                      </div>
                    )}
                  </div>
                )}

                {/* Cooperative Monitoring Info */}
                {node && nodeState.state !== 'down' && (
                  <div className="mt-2 text-xs text-gray-500">
                    Lock mode: {node.settings.cooperativeMonitoringLocks?.replace('_', ' ') || 'none'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
