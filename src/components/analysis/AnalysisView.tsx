import { useTopologyStore } from '../../store/topologyStore';
import { ScenarioRunner } from './ScenarioRunner';

export function AnalysisView() {
  const topology = useTopologyStore((state) => state.topology);
  
  const hasTopology = topology.galeraNodes.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Failure Analysis</h2>
        <p className="mt-1 text-sm text-gray-600">
          Simulate failure scenarios and analyze your HA configuration
        </p>
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
        <ScenarioRunner />
      )}
    </div>
  );
}
