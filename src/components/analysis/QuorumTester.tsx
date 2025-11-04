import { useTopologyStore } from '../../store/topologyStore';
import { HAAnalysisEngine } from '../../engine/haAnalysis';
import type { FailureScenario } from '../../types';

export function QuorumTester() {
  const topology = useTopologyStore((state) => state.topology);
  
  const handleTestBasicScenario = () => {
    if (topology.galeraNodes.length < 2) {
      alert('Please add at least 2 Galera nodes to test HA analysis');
      return;
    }

    const engine = new HAAnalysisEngine(topology);
    
    // Test 1: No failures
    const noFailureScenario: FailureScenario = {
      id: 'test-no-failure',
      name: 'No Failures',
      description: 'All nodes operational',
      failures: [],
    };
    
    const result1 = engine.analyzeScenario(noFailureScenario);
    console.log('=== TEST 1: No Failures ===');
    console.log('Summary:', result1.summary);
    console.log('System Availability:', result1.systemAvailability);
    console.log('Galera State:', result1.galeraState);
    console.log('MaxScale States:', result1.maxscaleStates);
    console.log('Recommendations:', result1.recommendations);
    
    // Test 2: One Galera node down
    if (topology.galeraNodes.length >= 3) {
      const oneNodeDownScenario: FailureScenario = {
        id: 'test-one-galera-down',
        name: 'One Galera Node Down',
        description: 'First Galera node is down',
        failures: [{
          targetId: topology.galeraNodes[0].id,
          type: 'node_down',
        }],
      };
      
      const result2 = engine.analyzeScenario(oneNodeDownScenario);
      console.log('\n=== TEST 2: One Galera Node Down ===');
      console.log('Summary:', result2.summary);
      console.log('System Availability:', result2.systemAvailability);
      console.log('Recommendations:', result2.recommendations);
    }
    
    // Test 3: One MaxScale down (if available)
    if (topology.maxscaleNodes.length > 0) {
      const oneMaxScaleDownScenario: FailureScenario = {
        id: 'test-one-maxscale-down',
        name: 'One MaxScale Down',
        description: 'First MaxScale node is down',
        failures: [{
          targetId: topology.maxscaleNodes[0].id,
          type: 'node_down',
        }],
      };
      
      const result3 = engine.analyzeScenario(oneMaxScaleDownScenario);
      console.log('\n=== TEST 3: One MaxScale Down ===');
      console.log('Summary:', result3.summary);
      console.log('System Availability:', result3.systemAvailability);
      console.log('Recommendations:', result3.recommendations);
    }
    
    alert('HA Analysis complete! Check browser console for detailed results.');
  };

  const hasGaleraNodes = topology.galeraNodes.length > 0;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <h4 className="font-medium text-yellow-900 mb-2">🧪 HA Analysis Engine Test</h4>
      <p className="text-sm text-yellow-800 mb-3">
        Test the complete HA analysis engine (Galera + MaxScale) with your current topology.
      </p>
      <button
        onClick={handleTestBasicScenario}
        disabled={!hasGaleraNodes}
        className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        Run HA Analysis Test
      </button>
      {!hasGaleraNodes && (
        <p className="text-xs text-yellow-700 mt-2">
          Add Galera nodes to enable testing
        </p>
      )}
    </div>
  );
}
