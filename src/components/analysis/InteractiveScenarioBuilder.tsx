import { useState, useEffect } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import { HAAnalysisEngine } from '../../engine/haAnalysis';
import type { FailureScenario, AnalysisResult } from '../../types';
import { AnalysisResultCard } from './AnalysisResultCard';
import { GaleraStateVisualization } from './GaleraStateVisualization';
import { MaxScaleStateVisualization } from './MaxScaleStateVisualization';
import { RecommendationsPanel } from './RecommendationsPanel';
import { NetworkStateVisualization } from './NetworkStateVisualization';

export function InteractiveScenarioBuilder() {
  const topology = useTopologyStore((state) => state.topology);
  const [failedNodes, setFailedNodes] = useState<Set<string>>(new Set());
  const [failedLinks, setFailedLinks] = useState<Set<string>>(new Set());
  const [failedServers, setFailedServers] = useState<Set<string>>(new Set());
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const servers = topology.servers;
  const subnets = topology.subnets;

  // Get database nodes (supports both old and new format)
  const databaseNodes = topology.databaseNodes || [];
  
  // Reset failures when topology changes (e.g., loading a different configuration)
  useEffect(() => {
    setFailedNodes(new Set());
    setFailedLinks(new Set());
    setFailedServers(new Set());
    setAnalysisResult(null);
  }, [topology.name, topology.clusterType]);
  
  // Auto-run analysis whenever failures change
  useEffect(() => {
    if (databaseNodes.length > 0 || topology.maxscaleNodes.length > 0) {
      runAnalysis();
    }
  }, [failedNodes, failedLinks, failedServers, topology]);

  const toggleServerFailure = (serverId: string) => {
    setFailedServers((prev) => {
      const next = new Set(prev);
      if (next.has(serverId)) {
        next.delete(serverId);
      } else {
        next.add(serverId);
      }
      return next;
    });
  };

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

  const toggleLinkFailure = (linkId: string) => {
    setFailedLinks((prev) => {
      const next = new Set(prev);
      if (next.has(linkId)) {
        next.delete(linkId);
      } else {
        next.add(linkId);
      }
      return next;
    });
  };

  const resetAll = () => {
    setFailedNodes(new Set());
    setFailedLinks(new Set());
    setFailedServers(new Set());
  };

  const runAnalysis = () => {
    // Collect all failed nodes (explicit + from failed servers)
    const allFailedNodes = new Set(failedNodes);
    
    // Add nodes from failed servers
    for (const serverId of failedServers) {
      const dbOnServer = databaseNodes.filter(n => n.serverId === serverId);
      const maxscaleOnServer = topology.maxscaleNodes.filter(n => n.serverId === serverId);
      dbOnServer.forEach(n => allFailedNodes.add(n.id));
      maxscaleOnServer.forEach(n => allFailedNodes.add(n.id));
    }
    
    const nodeFailures = Array.from(allFailedNodes).map((id) => ({
      targetId: id,
      type: 'node_down' as const,
    }));
    
    const linkFailures = Array.from(failedLinks).map((id) => ({
      targetId: id,
      type: 'network_partition' as const,
    }));
    
    const scenario: FailureScenario = {
      id: 'custom',
      name: 'Custom Scenario',
      description: `${allFailedNodes.size} node(s) down, ${failedLinks.size} link(s) cut, ${failedServers.size} server(s) down`,
      failures: [...nodeFailures, ...linkFailures],
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

  const maxscaleNodes = topology.maxscaleNodes;

  // Calculate effective failed nodes (including those on failed servers)
  const effectiveFailedNodes = new Set(failedNodes);
  for (const serverId of failedServers) {
    databaseNodes
      .filter(n => n.serverId === serverId)
      .forEach(n => effectiveFailedNodes.add(n.id));
    topology.maxscaleNodes
      .filter(n => n.serverId === serverId)
      .forEach(n => effectiveFailedNodes.add(n.id));
  }

  // Calculate quorum for Galera clusters only
  const isGalera = topology.clusterType === 'galera';
  const totalWeight = isGalera 
    ? databaseNodes.reduce((sum, node) => sum + (node.nodeType === 'galera' && 'pcWeight' in node.settings ? node.settings.pcWeight : 0), 0)
    : 0;
  const runningWeight = isGalera
    ? databaseNodes
        .filter((node) => !effectiveFailedNodes.has(node.id) && node.nodeType === 'galera')
        .reduce((sum, node) => sum + ('pcWeight' in node.settings ? node.settings.pcWeight : 0), 0)
    : 0;
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
              Click nodes and network links below to simulate failures. Analysis updates automatically.
            </p>
          </div>
          <button
            onClick={resetAll}
            disabled={failedNodes.size === 0 && failedLinks.size === 0 && failedServers.size === 0}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Network State */}
      <NetworkStateVisualization
        failedNodes={failedNodes}
        failedLinks={failedLinks}
        failedServers={failedServers}
        onToggleLinkFailure={toggleLinkFailure}
      />

      {/* Physical/Virtual Servers */}
      {servers.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">🖥️ Physical/Virtual Servers</h3>
          
          <div className="space-y-3">
            {servers.map((server) => {
              const subnet = subnets.find(s => s.id === server.subnetId);
              const isDown = failedServers.has(server.id);
              
              // Find services on this server
              const dbServices = databaseNodes.filter(n => n.serverId === server.id);
              const maxscaleServices = topology.maxscaleNodes.filter(n => n.serverId === server.id);
              const totalServices = dbServices.length + maxscaleServices.length;
              
              return (
                <div
                  key={server.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    isDown
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{isDown ? '🔴' : '🖥️'}</span>
                    <div>
                      <div className="font-medium text-gray-900">
                        {server.name}
                        <span className="ml-2 text-sm text-gray-600">
                          ({subnet?.name || 'Unknown subnet'})
                        </span>
                        {server.isVirtual && (
                          <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                            Virtual
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Services: {totalServices > 0 ? (
                          <>
                            {dbServices.map(g => g.name).join(', ')}
                            {dbServices.length > 0 && maxscaleServices.length > 0 && ', '}
                            {maxscaleServices.map(m => m.name).join(', ')}
                          </>
                        ) : (
                          'None'
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleServerFailure(server.id)}
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

      {/* Database Cluster State */}
      {databaseNodes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {isGalera ? '🟢 Galera Cluster State' : '💾 Database Nodes'}
          </h3>
          
          <div className="space-y-3 mb-6">
            {databaseNodes.map((node) => {
              const serverInfo = getServerInfo(node.serverId);
              const serverDown = failedServers.has(node.serverId);
              const nodeDown = failedNodes.has(node.id);
              const isDown = serverDown || nodeDown;
              
              return (
                <div
                  key={node.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    isDown
                      ? 'border-red-300 bg-red-50'
                      : isGalera ? 'border-green-300 bg-green-50' : 'border-blue-300 bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{isDown ? '🔴' : isGalera ? '🟢' : '💾'}</span>
                    <div>
                      <div className="font-medium text-gray-900">
                        {node.name}
                        <span className="ml-2 text-sm text-gray-600">
                          ({serverInfo.subnet})
                        </span>
                        {!isGalera && node.nodeType === 'async_replica' && 'isPrimary' in node.settings && (
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                            node.settings.isPrimary 
                              ? 'bg-blue-200 text-blue-900' 
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {node.settings.isPrimary ? 'Primary' : 'Replica'}
                          </span>
                        )}
                        {serverDown && (
                          <span className="ml-2 text-xs bg-red-200 text-red-900 px-2 py-0.5 rounded">
                            Server Down
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Server: {serverInfo.name}
                        {isGalera && node.nodeType === 'galera' && 'pcWeight' in node.settings && (
                          <> • Weight: <span className="font-medium">{node.settings.pcWeight}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleNodeFailure(node.id)}
                    disabled={serverDown}
                    className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                      serverDown
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : isDown
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                    title={serverDown ? 'Cannot control - server is down' : ''}
                  >
                    {isDown ? 'Mark Up' : 'Mark Down'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quorum Summary - Only for Galera */}
          {isGalera && (
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
          )}
        </div>
      )}

      {/* MaxScale Routing State */}
      {maxscaleNodes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">🔶 MaxScale Routing State</h3>
          
          {/* Cooperative Monitoring Info - Only for Async Replication */}
          {!isGalera && maxscaleNodes.some(n => n.settings.cooperativeMonitoringLocks) && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <span className="font-medium">ℹ️ Cooperative Monitoring Enabled</span>
              {' • '}
              Only one MaxScale actively manages failover at a time to prevent conflicts.
            </div>
          )}
          
          <div className="space-y-3">
            {maxscaleNodes.map((node) => {
              const serverInfo = getServerInfo(node.serverId);
              const serverDown = failedServers.has(node.serverId);
              const nodeDown = failedNodes.has(node.id);
              const isDown = serverDown || nodeDown;
              
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
                        {serverDown && (
                          <span className="ml-2 text-xs bg-red-200 text-red-900 px-2 py-0.5 rounded">
                            Server Down
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Server: {serverInfo.name}
                        {!isGalera && node.settings.cooperativeMonitoringLocks && (
                          <> • Locks: {node.settings.cooperativeMonitoringLocks.replace('_', ' ')}</>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleNodeFailure(node.id)}
                    disabled={serverDown}
                    className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                      serverDown
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : isDown
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                    title={serverDown ? 'Cannot control - server is down' : ''}
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
      {analysisResult ? (
        <>
          <AnalysisResultCard result={analysisResult} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GaleraStateVisualization state={analysisResult.galeraState} />
            <MaxScaleStateVisualization states={analysisResult.maxscaleStates} />
          </div>

          <RecommendationsPanel recommendations={analysisResult.recommendations} />
        </>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">
            {databaseNodes.length === 0 && topology.maxscaleNodes.length === 0
              ? 'Configure your topology in the Setup tab to begin analysis'
              : 'Waiting for analysis...'}
          </p>
        </div>
      )}
    </div>
  );
}
