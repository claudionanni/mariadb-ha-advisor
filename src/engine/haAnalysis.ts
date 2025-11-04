import type { 
  Topology, 
  FailureScenario,
  AnalysisResult,
  GaleraClusterState,
  MaxScaleNodeState
} from '../types';
import { GaleraQuorumEngine } from './galeraQuorum';
import { MaxScaleRoutingEngine } from './maxscaleRouting';

/**
 * Unified HA Analysis Engine
 * Combines Galera quorum and MaxScale routing analysis
 */
export class HAAnalysisEngine {
  private topology: Topology;
  private galeraEngine: GaleraQuorumEngine;
  private maxscaleEngine: MaxScaleRoutingEngine;
  
  constructor(topology: Topology) {
    this.topology = topology;
    this.galeraEngine = new GaleraQuorumEngine(topology);
    this.maxscaleEngine = new MaxScaleRoutingEngine(topology);
  }

  /**
   * Analyze a failure scenario and return complete analysis
   */
  analyzeScenario(scenario: FailureScenario): AnalysisResult {
    // Step 1: Calculate Galera cluster state
    const galeraState = this.galeraEngine.calculateClusterState(scenario);

    // Step 2: Calculate MaxScale routing state
    const maxscaleStates = this.maxscaleEngine.calculateMaxScaleState(
      scenario,
      galeraState
    );

    // Step 3: Calculate overall system availability
    const availability = this.maxscaleEngine.calculateSystemAvailability(
      galeraState,
      maxscaleStates
    );

    // Step 4: Generate summary and recommendations
    const summary = this.generateSummary(
      galeraState,
      maxscaleStates,
      availability
    );

    const recommendations = this.generateRecommendations(
      galeraState,
      maxscaleStates,
      availability
    );

    return {
      scenarioId: scenario.id,
      timestamp: new Date().toISOString(),
      galeraState,
      maxscaleStates,
      systemAvailability: {
        canAcceptWrites: availability.canAcceptWrites,
        canAcceptReads: availability.canAcceptReads,
        operationalMaxScales: availability.routingMaxScales.length,
        operationalGaleraNodes: galeraState.nodeStates.filter(
          n => n.state !== 'down'
        ).length,
      },
      summary,
      recommendations,
    };
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    galeraState: GaleraClusterState,
    maxscaleStates: MaxScaleNodeState[],
    availability: ReturnType<typeof this.maxscaleEngine.calculateSystemAvailability>
  ): string {
    const parts: string[] = [];

    // Galera status
    if (galeraState.primaryComponent.length === 0) {
      parts.push('❌ Galera cluster has NO primary component (no writes possible)');
    } else {
      parts.push(
        `✅ Galera primary component: ${galeraState.primaryComponent.length} node(s)`
      );
    }

    if (galeraState.splitBrain) {
      parts.push('⚠️ SPLIT-BRAIN detected!');
    }

    // MaxScale status
    const routingMaxScales = maxscaleStates.filter(ms => ms.canRoute);
    if (routingMaxScales.length === 0) {
      parts.push('❌ No MaxScale instances can route queries');
    } else {
      parts.push(`✅ ${routingMaxScales.length} MaxScale instance(s) can route`);
    }

    // Overall status
    if (availability.canAcceptWrites) {
      parts.push('✅ System can accept WRITES');
    } else {
      parts.push('❌ System CANNOT accept writes');
    }

    if (availability.canAcceptReads) {
      parts.push('✅ System can accept READS');
    } else {
      parts.push('❌ System CANNOT accept reads');
    }

    return parts.join('\n');
  }

  /**
   * Generate recommendations for improving HA
   */
  private generateRecommendations(
    galeraState: GaleraClusterState,
    maxscaleStates: MaxScaleNodeState[],
    availability: ReturnType<typeof this.maxscaleEngine.calculateSystemAvailability>
  ): string[] {
    const recommendations: string[] = [];

    // Galera recommendations
    if (galeraState.splitBrain) {
      recommendations.push(
        'CRITICAL: Split-brain detected. Review pc.weight configuration to ensure only one partition can have quorum.'
      );
    }

    if (galeraState.primaryComponent.length === 0) {
      recommendations.push(
        'No primary component formed. Increase pc.weight on strategically placed nodes or review network topology.'
      );
    }

    const downNodes = galeraState.nodeStates.filter(n => n.state === 'down');
    if (downNodes.length > 0 && galeraState.primaryComponent.length > 0) {
      recommendations.push(
        `${downNodes.length} Galera node(s) down but cluster operational. Monitor for additional failures.`
      );
    }

    // MaxScale recommendations
    const downMaxScales = maxscaleStates.filter(ms => ms.state === 'down');
    const routingMaxScales = maxscaleStates.filter(ms => ms.canRoute);
    const activeMaxScale = maxscaleStates.find(ms => ms.hasLock && ms.canRoute);
    
    if (downMaxScales.length > 0 && routingMaxScales.length > 0) {
      if (activeMaxScale) {
        recommendations.push(
          `${downMaxScales.length} MaxScale instance(s) down but another instance (${
            this.topology.maxscaleNodes.find(n => n.id === activeMaxScale.nodeId)?.name || 'unknown'
          }) automatically took over with lock. System fully operational.`
        );
      } else {
        recommendations.push(
          `${downMaxScales.length} MaxScale instance(s) down. Routing available but no lock holder.`
        );
      }
    }

    if (!availability.canAcceptWrites && galeraState.primaryComponent.length > 0) {
      recommendations.push(
        'Galera has primary component but MaxScale cannot route. Check MaxScale connectivity to Galera nodes.'
      );
    }

    const noLockMaxScales = maxscaleStates.filter(
      ms => ms.state !== 'down' && !ms.hasLock && ms.visibleGaleraNodes.length > 0
    );
    if (noLockMaxScales.length > 0) {
      const firstNode = this.topology.maxscaleNodes.find(n => n.id === noLockMaxScales[0].nodeId);
      const lockType = firstNode?.settings.cooperativeMonitoringLocks;
      if (lockType === 'majority_of_all') {
        const requiredLocks = Math.floor(this.topology.galeraNodes.length / 2) + 1;
        const runningGalera = galeraState.nodeStates.filter(n => n.state !== 'down').length;
        recommendations.push(
          `${noLockMaxScales.length} MaxScale instance(s) cannot obtain cooperative monitoring locks. With majority_of_all, need to acquire locks on ${requiredLocks} out of ${this.topology.galeraNodes.length} Galera backends (currently ${runningGalera} running).`
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Configuration looks good for this scenario.');
    }

    return recommendations;
  }

  /**
   * Batch analyze multiple scenarios
   */
  analyzeScenarios(scenarios: FailureScenario[]): AnalysisResult[] {
    return scenarios.map(scenario => this.analyzeScenario(scenario));
  }

  /**
   * Calculate overall cluster resilience score
   */
  calculateResilienceScore(results: AnalysisResult[]): number {
    if (results.length === 0) return 0;

    const successfulScenarios = results.filter(
      r => r.systemAvailability.canAcceptWrites
    ).length;

    return (successfulScenarios / results.length) * 100;
  }
}
