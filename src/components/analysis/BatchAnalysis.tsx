import { useState } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import { HAAnalysisEngine } from '../../engine/haAnalysis';
import { ScenarioGenerator } from '../../engine/scenarioGenerator';
import type { AnalysisResult } from '../../types';

export function BatchAnalysis() {
  const topology = useTopologyStore((state) => state.topology);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [testSuite, setTestSuite] = useState<'quick' | 'comprehensive'>('quick');

  const handleRunBatchAnalysis = async () => {
    setIsAnalyzing(true);
    setResults([]);

    // Small delay for UI
    await new Promise(resolve => setTimeout(resolve, 100));

    const generator = new ScenarioGenerator(topology);
    const scenarios = testSuite === 'quick' 
      ? generator.generateQuickTestSuite()
      : generator.generateAllScenarios();

    const engine = new HAAnalysisEngine(topology);
    const batchResults = engine.analyzeScenarios(scenarios);

    setResults(batchResults);
    setIsAnalyzing(false);
  };

  const hasTopology = topology.databaseNodes.length > 0;

  if (!hasTopology) {
    return null;
  }

  const passCount = results.filter(r => r.systemAvailability.canAcceptWrites).length;
  const failCount = results.length - passCount;
  const passRate = results.length > 0 ? (passCount / results.length * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Batch Analysis</h3>
        <p className="text-sm text-gray-600 mb-4">
          Run comprehensive failure testing across multiple scenarios
        </p>

        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="quick"
              checked={testSuite === 'quick'}
              onChange={(e) => setTestSuite(e.target.value as 'quick')}
              className="text-blue-600"
            />
            <span className="text-sm">Quick Test Suite</span>
            <span className="text-xs text-gray-500">(single failures + DC failures)</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="comprehensive"
              checked={testSuite === 'comprehensive'}
              onChange={(e) => setTestSuite(e.target.value as 'comprehensive')}
              className="text-blue-600"
            />
            <span className="text-sm">Comprehensive Suite</span>
            <span className="text-xs text-gray-500">(all combinations)</span>
          </label>
        </div>

        <button
          onClick={handleRunBatchAnalysis}
          disabled={isAnalyzing}
          className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isAnalyzing ? '⏳ Analyzing...' : '▶ Run Batch Analysis'}
        </button>
      </div>

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Test Results Summary</h3>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{results.length}</div>
              <div className="text-xs text-gray-600">Total Scenarios</div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{passCount}</div>
              <div className="text-xs text-gray-600">Passed (Operational)</div>
            </div>
            
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{failCount}</div>
              <div className="text-xs text-gray-600">Failed (Degraded)</div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{passRate}%</div>
              <div className="text-xs text-gray-600">Success Rate</div>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Scenario</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-700">Writes</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-700">Reads</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-700">Galera Up</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-700">MaxScale Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.map((result, index) => {
                  const scenario = result.scenarioId;
                  const isOperational = result.systemAvailability.canAcceptWrites;

                  return (
                    <tr key={index} className={isOperational ? 'bg-white' : 'bg-red-50'}>
                      <td className="px-4 py-2">
                        <span className="text-lg">
                          {isOperational ? '✅' : '❌'}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {scenario}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {result.systemAvailability.canAcceptWrites ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {result.systemAvailability.canAcceptReads ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center text-gray-700">
                        {result.systemAvailability.operationalGaleraNodes}
                      </td>
                      <td className="px-4 py-2 text-center text-gray-700">
                        {result.systemAvailability.operationalMaxScales}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Critical Failures */}
          {failCount > 0 && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-900 mb-2">⚠️ Critical Scenarios</h4>
              <div className="text-sm text-red-800 space-y-1">
                {results
                  .filter(r => !r.systemAvailability.canAcceptWrites)
                  .slice(0, 5)
                  .map((r, i) => (
                    <div key={i}>• {r.scenarioId}</div>
                  ))}
                {failCount > 5 && (
                  <div className="text-xs text-red-600 mt-2">
                    ...and {failCount - 5} more failures
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
