import { useState } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import { ScenarioRunner } from './ScenarioRunner';
import { BatchAnalysis } from './BatchAnalysis';
import { InteractiveScenarioBuilder } from './InteractiveScenarioBuilder';

type AnalysisMode = 'interactive' | 'preset' | 'batch';

export function AnalysisView() {
  const topology = useTopologyStore((state) => state.topology);
  const [mode, setMode] = useState<AnalysisMode>('interactive');
  
  const hasTopology = topology.galeraNodes.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Failure Analysis</h2>
          <p className="mt-1 text-sm text-gray-600">
            Simulate failure scenarios and analyze your HA configuration
          </p>
        </div>
        
        {hasTopology && (
          <div className="text-right">
            <div className="text-sm text-gray-600">Configuration:</div>
            <div className="text-lg font-semibold text-gray-900">{topology.name}</div>
            <div className="text-xs text-gray-500">
              {topology.clusterType === 'galera' ? '🔄 Galera Multi-Master' : '📊 Async Replication'}
            </div>
          </div>
        )}
      </div>

      {!hasTopology ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-medium text-blue-900 mb-2">Getting Started</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Go to "Topology" tab</li>
            <li>Define your network subnets</li>
            <li>Add servers to your subnets</li>
            <li>Place Galera nodes on servers</li>
            <li>Add MaxScale nodes for routing</li>
            <li>Return here to analyze failure scenarios</li>
          </ol>
        </div>
      ) : (
        <>
          {/* Important Note about Simulation */}
          <details className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <summary className="cursor-pointer font-medium text-amber-900 flex items-center gap-2">
              <span>⚠️</span>
              <span>Important: Simultaneous Failure Simulation</span>
            </summary>
            <div className="mt-3 text-sm text-amber-800 space-y-2">
              <p>
                This simulator models the <strong>final state after a sudden, simultaneous change</strong>, 
                even if nodes are marked as down sequentially in the interface. This is a conservative 
                approach for analyzing worst-case scenarios.
              </p>
              <p>
                <strong>Why this matters for Galera:</strong> In production, Galera dynamically recalculates 
                quorum when nodes leave the cluster gracefully or fail at different times. A cluster initially 
                requiring M/2+1 weight for Primary state can remain operational with fewer nodes if failures 
                occur sequentially.
              </p>
              <p>
                <strong>Example:</strong> A 5-node cluster (weights: 1+1+1+1+1) has initial quorum = 3. 
                If two nodes fail, the remaining three nodes maintain quorum. Galera then recalculates 
                quorum to 2 (based on 3 remaining nodes), allowing the cluster to survive another failure. 
                Therefore, a 5-node cluster can continue operating with just 2 nodes if failures are 
                sequential—but would fail with 3 simultaneous node failures.
              </p>
              <p className="font-medium">
                This simulator shows the <em>simultaneous failure scenario</em>, representing the most 
                critical failure mode for your infrastructure planning.
              </p>
            </div>
          </details>

          {/* Mode Selector */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setMode('interactive')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  mode === 'interactive'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>🎯</span>
                  <div className="text-left">
                    <div className="text-sm">Interactive</div>
                    <div className="text-xs opacity-75">Click nodes to fail</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setMode('preset')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  mode === 'preset'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>📋</span>
                  <div className="text-left">
                    <div className="text-sm">Preset</div>
                    <div className="text-xs opacity-75">Common scenarios</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setMode('batch')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  mode === 'batch'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>⚡</span>
                  <div className="text-left">
                    <div className="text-sm">Batch</div>
                    <div className="text-xs opacity-75">Test all</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Content */}
          {mode === 'interactive' && <InteractiveScenarioBuilder />}
          {mode === 'preset' && <ScenarioRunner />}
          {mode === 'batch' && <BatchAnalysis />}
        </>
      )}
    </div>
  );
}
