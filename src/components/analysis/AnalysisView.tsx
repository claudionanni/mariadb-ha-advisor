import { useTopologyStore } from '../../store/topologyStore';

export function AnalysisView() {
  const topology = useTopologyStore((state) => state.topology);
  const scenarios = useTopologyStore((state) => state.scenarios);
  
  const hasTopology = topology.galeraNodes.length > 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Failure Analysis</h2>
      
      {!hasTopology ? (
        <div className="text-gray-600">
          <p>Define your topology and configure HA settings to analyze failure scenarios.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Analysis Modes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left">
                <div className="font-medium text-blue-600">Manual Scenarios</div>
                <div className="text-sm text-gray-600 mt-1">
                  Select specific nodes/links to fail
                </div>
              </button>
              
              <button className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left">
                <div className="font-medium text-blue-600">Auto-Generate</div>
                <div className="text-sm text-gray-600 mt-1">
                  Test all possible failure combinations
                </div>
              </button>
              
              <button className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left">
                <div className="font-medium text-blue-600">Preset Scenarios</div>
                <div className="text-sm text-gray-600 mt-1">
                  Common failure patterns
                </div>
              </button>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              🚧 Analysis engine and visualization will be implemented here
            </p>
          </div>
          
          {scenarios.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Scenarios ({scenarios.length})</h3>
              <div className="space-y-2">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="p-3 border border-gray-200 rounded"
                  >
                    <div className="font-medium">{scenario.name}</div>
                    <div className="text-sm text-gray-600">
                      {scenario.nodeFailures.length} node failure(s)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
