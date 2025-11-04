import { useState } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import { HAAnalysisEngine } from '../../engine/haAnalysis';
import type { FailureScenario, AnalysisResult } from '../../types';
import { AnalysisResultCard } from './AnalysisResultCard';
import { GaleraStateVisualization } from './GaleraStateVisualization';
import { MaxScaleStateVisualization } from './MaxScaleStateVisualization';
import { RecommendationsPanel } from './RecommendationsPanel';

export function ScenarioRunner() {
  const topology = useTopologyStore((state) => state.topology);
  const [selectedScenario, setSelectedScenario] = useState<string>('no-failure');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const hasGalera = topology.galeraNodes.length > 0;
  const hasMaxScale = topology.maxscaleNodes.length > 0;

  const presetScenarios: Array<{
    id: string;
    name: string;
    description: string;
    generator: () => FailureScenario;
  }> = [
    {
      id: 'no-failure',
      name: '✅ No Failures',
      description: 'All nodes operational (baseline)',
      generator: () => ({
        id: 'no-failure',
        name: 'No Failures',
        description: 'All nodes operational',
        failures: [],
      }),
    },
  ];

  // Add Galera failure scenarios
  if (topology.galeraNodes.length > 0) {
    presetScenarios.push({
      id: 'one-galera-down',
      name: '❌ One Galera Down',
      description: `${topology.galeraNodes[0]?.name || 'First Galera'} node fails`,
      generator: () => ({
        id: 'one-galera-down',
        name: 'One Galera Node Down',
        description: 'Single Galera node failure',
        failures: [{
          targetId: topology.galeraNodes[0].id,
          type: 'node_down',
        }],
      }),
    });

    if (topology.galeraNodes.length >= 2) {
      presetScenarios.push({
        id: 'two-galera-down',
        name: '❌❌ Two Galera Down',
        description: 'Multiple Galera node failures',
        generator: () => ({
          id: 'two-galera-down',
          name: 'Two Galera Nodes Down',
          description: 'Multiple Galera node failures',
          failures: [
            { targetId: topology.galeraNodes[0].id, type: 'node_down' },
            { targetId: topology.galeraNodes[1].id, type: 'node_down' },
          ],
        }),
      });
    }
  }

  // Add MaxScale failure scenarios
  if (topology.maxscaleNodes.length > 0) {
    presetScenarios.push({
      id: 'one-maxscale-down',
      name: '❌ One MaxScale Down',
      description: `${topology.maxscaleNodes[0]?.name || 'First MaxScale'} proxy fails`,
      generator: () => ({
        id: 'one-maxscale-down',
        name: 'One MaxScale Node Down',
        description: 'Single MaxScale proxy failure',
        failures: [{
          targetId: topology.maxscaleNodes[0].id,
          type: 'node_down',
        }],
      }),
    });
  }

  // Add network partition scenarios
  if (topology.subnetLinks.length > 0) {
    presetScenarios.push({
      id: 'network-partition',
      name: '🔗 Network Partition',
      description: 'Inter-subnet link failure',
      generator: () => ({
        id: 'network-partition',
        name: 'Network Partition',
        description: 'Link between subnets fails',
        failures: [{
          targetId: topology.subnetLinks[0].id,
          type: 'network_partition',
        }],
      }),
    });
  }

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    
    // Small delay for UI feedback
    setTimeout(() => {
      const scenario = presetScenarios.find(s => s.id === selectedScenario);
      if (!scenario) return;

      const engine = new HAAnalysisEngine(topology);
      const result = engine.analyzeScenario(scenario.generator());
      
      setAnalysisResult(result);
      setIsAnalyzing(false);
    }, 100);
  };

  if (!hasGalera) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">
          ⚠️ Add Galera nodes to your topology to run failure analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scenario Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Failure Scenario</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {presetScenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => setSelectedScenario(scenario.id)}
              className={`p-4 text-left rounded-lg border-2 transition-all ${
                selectedScenario === scenario.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="font-medium text-sm text-gray-900 mb-1">
                {scenario.name}
              </div>
              <div className="text-xs text-gray-600">
                {scenario.description}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isAnalyzing ? 'Analyzing...' : '▶ Run Analysis'}
        </button>
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-6">
          <AnalysisResultCard result={analysisResult} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GaleraStateVisualization state={analysisResult.galeraState} />
            {hasMaxScale && (
              <MaxScaleStateVisualization states={analysisResult.maxscaleStates} />
            )}
          </div>
          
          <RecommendationsPanel recommendations={analysisResult.recommendations} />
        </div>
      )}
    </div>
  );
}
