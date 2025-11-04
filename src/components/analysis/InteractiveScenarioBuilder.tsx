import { useState, useEffect } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import { HAAnalysisEngine } from '../../engine/haAnalysis';
import type { FailureScenario, AnalysisResult } from '../../types';
import { AnalysisResultCard } from './AnalysisResultCard';
import { GaleraStateVisualization } from './GaleraStateVisualization';
import { MaxScaleStateVisualization } from './MaxScaleStateVisualization';
import { RecommendationsPanel } from './RecommendationsPanel';

export function InteractiveScenarioBuilder() {
  const topology = useTopologyStore((state) => state.topology);
  const [failedNodes, setFailedNodes] = useState<Set<string>>(new Set());
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const servers = topology.servers;
  const subnets = topology.subnets;

  // Auto-run analysis whenever failures change
  useEffect(() => {
    runAnalysis();
  }, [failedNodes, topology]);

  const toggleNodeFailure = (nodeId: string) => {
    setFailedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const resetAll = () => {
    setFailedNodes(new Set());
  };

  const runAnalysis = () => {
    const scenario: FailureScenario = {
      id: 'custom',
      name: 'Custom Scenario',
      description: `${failedNodes.size} node(s) down`,
      failures: Array.from(failedNodes).map((id) => ({
        targetId: id,
        type: 'node_down',
      })),
    };

    const engine = new HAAnalysisEngine(topology);
    const result = engine.analyzeScenario(scenario);
    setAnalysisResult(result);
  };

  const getServerInfo = (serverId: string) => {
    const server = servers.find((s) => s.id === serverId);
    if (!server) return { name: 'Unknown', subnet: 'Unknown' };

    const subnet = subnets.find((s) => s.id === server.subnetId);
    return {
      name: server.name,
      subnet: subnet?.name || 'Unknown',
    };
  };

  const galeraNodes = topology.galeraNodes;
  const maxscaleNodes = topology.maxscaleNodes;

  const totalWeight = galeraNodes.reduce((sum, node) => sum + node.settings.pcWeight, 0);
  const runningWeight = galeraNodes
    .filter((node) => !failedNodes.has(node.id))
    .reduce((sum, node) => sum + node.settings.pcWeight, 0);
  const quorumNeeded = Math.floor(totalWeight / 2) + 1;
  const hasQuorum = runningWeight >= quorumNeeded;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-blue-900">🎯 Interactive Scenario Builder</h3>
            <p className="text-sm text-blue-700 mt-1">
              Click nodes below to mark them as failed. Analysis updates automatically.
            </p>
          </div>
          <button
            onClick={resetAll}
            disabled={failedNodes.size === 0}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Galera Cluster State */}
      {galeraNodes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">🟢 Galera Cluster State</h3>
          
          <div className="space-y-3 mb-6">
            {galeraNodes.map((node) => {
              const serverInfo = getServerInfo(node.serverId);
              const isDown = failedNodes.has(node.id);
              
              return (
                <div
                  key={node.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    isDown
                      ? 'border-red-300 bg-red-50'
                      : 'border-green-300 bg-green-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{isDown ? '🔴' : '🟢'}</span>
                    <div>
                      <div className="font-medium text-gray-900">
                        {node.name}
                        <span className="ml-2 text-sm text-gray-600">
                          ({serverInfo.subnet})
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Server: {serverInfo.name} • Weight: <span className="font-medium">{node.settings.pcWeight}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleNodeFailure(node.id)}
                    className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                      isDown
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {isDown ? 'Mark Up' : 'Mark Down'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quorum Summary */}
          <div className={`p-4 rounded-lg ${hasQuorum ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalWeight}</div>
                <div className="text-xs text-gray-600">Total Weight</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{runningWeight}</div>
                <div className="text-xs text-gray-600">Running Weight</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{quorumNeeded}</div>
                <div className="text-xs text-gray-600">Quorum Needed</div>
              </div>
              <div>
                <div className="text-2xl">{hasQuorum ? '✅' : '❌'}</div>
                <div className="text-xs font-medium text-gray-900">
                  {hasQuorum ? 'HAS QUORUM' : 'LOST QUORUM'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MaxScale Routing State */}
      {maxscaleNodes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">🔶 MaxScale Routing State</h3>
          
          <div className="space-y-3">
            {maxscaleNodes.map((node) => {
              const serverInfo = getServerInfo(node.serverId);
              const isDown = failedNodes.has(node.id);
              
              return (
                <div
                  key={node.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    isDown
                      ? 'border-red-300 bg-red-50'
                      : 'border-purple-300 bg-purple-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{isDown ? '🔴' : '🔶'}</span>
                    <div>
                      <div className="font-medium text-gray-900">
                        {node.name}
                        <span className="ml-2 text-sm text-gray-600">
                          ({serverInfo.subnet})
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Server: {serverInfo.name} • 
                        Locks: {node.settings.cooperativeMonitoringLocks?.replace('_', ' ') || 'None'}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleNodeFailure(node.id)}
                    className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                      isDown
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {isDown ? 'Mark Up' : 'Mark Down'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <>
          <AnalysisResultCard result={analysisResult} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GaleraStateVisualization result={analysisResult} />
            <MaxScaleStateVisualization result={analysisResult} />
          </div>

          <RecommendationsPanel result={analysisResult} />
        </>
      )}
    </div>
  );
}
