import { useTopologyStore } from '../../store/topologyStore';
import { GaleraQuorumEngine } from '../../engine/galeraQuorum';
import type { FailureScenario } from '../../types';

export function QuorumTester() {
  const topology = useTopologyStore((state) => state.topology);
  
  const handleTestBasicScenario = () => {
    if (topology.galeraNodes.length < 2) {
      alert('Please add at least 2 Galera nodes to test quorum calculation');
      return;
    }

    const engine = new GaleraQuorumEngine(topology);
    
    // Test 1: No failures
    const noFailureScenario: FailureScenario = {
      id: 'test-no-failure',
      name: 'No Failures',
      description: 'All nodes operational',
      failures: [],
    };
    
    const state1 = engine.calculateClusterState(noFailureScenario);
    console.log('=== TEST 1: No Failures ===');
    console.log('Total Weight:', state1.totalWeight);
    console.log('Quorum Weight:', state1.quorumWeight);
    console.log('Primary Component:', state1.primaryComponent);
    console.log('Split Brain:', state1.splitBrain);
    console.log('Node States:', state1.nodeStates);
    console.log('Partitions:', state1.partitions);
    
    // Test 2: One node down
    if (topology.galeraNodes.length >= 3) {
      const oneNodeDownScenario: FailureScenario = {
        id: 'test-one-down',
        name: 'One Node Down',
        description: 'First node is down',
        failures: [{
          targetId: topology.galeraNodes[0].id,
          type: 'node_down',
        }],
      };
      
      const state2 = engine.calculateClusterState(oneNodeDownScenario);
      console.log('\n=== TEST 2: One Node Down ===');
      console.log('Total Weight:', state2.totalWeight);
      console.log('Quorum Weight:', state2.quorumWeight);
      console.log('Primary Component:', state2.primaryComponent);
      console.log('Split Brain:', state2.splitBrain);
      console.log('Node States:', state2.nodeStates);
    }
    
    alert('Quorum calculation complete! Check browser console for results.');
  };

  const hasGaleraNodes = topology.galeraNodes.length > 0;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <h4 className="font-medium text-yellow-900 mb-2">🧪 Quorum Engine Test</h4>
      <p className="text-sm text-yellow-800 mb-3">
        Test the Galera quorum calculation engine with your current topology.
      </p>
      <button
        onClick={handleTestBasicScenario}
        disabled={!hasGaleraNodes}
        className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        Run Quorum Test
      </button>
      {!hasGaleraNodes && (
        <p className="text-xs text-yellow-700 mt-2">
          Add Galera nodes to enable testing
        </p>
      )}
    </div>
  );
}
