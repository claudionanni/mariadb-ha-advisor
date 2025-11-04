import type { 
  Topology, 
  FailureScenario,
  AnalysisResult,
  GaleraClusterState,
  AsyncReplicaClusterState,
  MaxScaleNodeState
} from '../types';
import { GaleraQuorumEngine } from './galeraQuorum';
import { AsyncReplicaEngine } from './asyncReplicaEngine';
import { MaxScaleRoutingEngine } from './maxscaleRouting';

/**
 * Unified HA Analysis Engine
 * Handles both Galera and Async Replica topologies
 */
export class HAAnalysisEngine {
  private topology: Topology;
  private galeraEngine?: GaleraQuorumEngine;
  private asyncReplicaEngine?: AsyncReplicaEngine;
  private maxscaleEngine: MaxScaleRoutingEngine;
  
  constructor(topology: Topology) {
    this.topology = topology;
    
    // Initialize appropriate engine based on cluster type
    if (topology.clusterType === 'galera') {
      this.galeraEngine = new GaleraQuorumEngine(topology);
    } else {
      this.asyncReplicaEngine = new AsyncReplicaEngine(topology);
    }
    
    this.maxscaleEngine = new MaxScaleRoutingEngine(topology);
  }

  /**
   * Analyze a failure scenario and return complete analysis
   */
  analyzeScenario(scenario: FailureScenario): AnalysisResult {
    let galeraState: GaleraClusterState | undefined;
    let asyncReplicaState: AsyncReplicaClusterState | undefined;
    let maxscaleStates: MaxScaleNodeState[];
    
    if (this.topology.clusterType === 'galera' && this.galeraEngine) {
      // Galera cluster analysis
      galeraState = this.galeraEngine.calculateClusterState(scenario);
      maxscaleStates = this.maxscaleEngine.calculateMaxScaleState(
        scenario,
        galeraState
      );
    } else if (this.asyncReplicaEngine) {
      // Async replica cluster analysis
      asyncReplicaState = this.asyncReplicaEngine.calculateClusterState(scenario);
      maxscaleStates = this.maxscaleEngine.calculateMaxScaleStateForAsyncReplica(
        scenario,
        asyncReplicaState
      );
    } else {
      throw new Error('Invalid cluster configuration');
    }

    // Calculate overall system availability
    const availability = this.maxscaleEngine.calculateSystemAvailability(
      galeraState,
      asyncReplicaState,
      maxscaleStates
    );

    // Generate summary and recommendations
    const summary = this.generateSummary(
      galeraState,
      asyncReplicaState,
      maxscaleStates,
      availability
    );

    const recommendations = this.generateRecommendations(
      galeraState,
      asyncReplicaState,
      maxscaleStates,
      availability
    );

    return {
      scenarioId: scenario.id,
      timestamp: new Date().toISOString(),
      galeraState,
      asyncReplicaState,
      maxscaleStates,
      systemAvailability: {
        canAcceptWrites: availability.canAcceptWrites,
        canAcceptReads: availability.canAcceptReads,
        operationalMaxScales: availability.routingMaxScales.length,
        operationalGaleraNodes: galeraState 
          ? galeraState.nodeStates.filter(n => n.state !== 'down').length
          : asyncReplicaState?.nodeStates.filter(n => n.state !== 'down').length || 0,
      },
      summary,
      recommendations,
    };
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    galeraState: GaleraClusterState | undefined,
    asyncReplicaState: AsyncReplicaClusterState | undefined,
    maxscaleStates: MaxScaleNodeState[],
    availability: ReturnType<typeof this.maxscaleEngine.calculateSystemAvailability>
  ): string {
    const parts: string[] = [];

    // Cluster-specific status
    if (galeraState) {
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
    } else if (asyncReplicaState) {
      // Async replica status
      if (!asyncReplicaState.hasActivePrimary) {
        parts.push('❌ No active primary node (no writes possible)');
      } else {
        const primaryNodeId = asyncReplicaState.primaryNode;
        const primaryNode = this.topology.databaseNodes?.find(n => n.id === primaryNodeId);
        parts.push(
          `✅ Active primary node: ${primaryNode?.name || 'unknown'}`
        );
      }
      
      const activeReplicas = asyncReplicaState.nodeStates.filter(
        n => n.state === 'up' && n.role === 'replica'
      ).length;
      parts.push(`✅ ${activeReplicas} active replica(s)`);
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
    galeraState: GaleraClusterState | undefined,
    asyncReplicaState: AsyncReplicaClusterState | undefined,
    maxscaleStates: MaxScaleNodeState[],
    availability: ReturnType<typeof this.maxscaleEngine.calculateSystemAvailability>
  ): string[] {
    const recommendations: string[] = [];

    // Galera recommendations
    if (galeraState) {
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
    }

    // Async replica recommendations
    if (asyncReplicaState) {
      if (!asyncReplicaState.hasActivePrimary) {
        recommendations.push(
          'CRITICAL: No active primary node. Manual failover required to promote a replica to primary.'
        );
      }

      const downReplicas = asyncReplicaState.nodeStates.filter(
        n => n.state === 'down' && n.role === 'replica'
      );
      if (downReplicas.length > 0 && asyncReplicaState.hasActivePrimary) {
        recommendations.push(
          `${downReplicas.length} replica(s) down but primary still operational. Check replication lag on remaining replicas.`
        );
      }
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

    if (!availability.canAcceptWrites && (galeraState?.primaryComponent.length || asyncReplicaState?.hasActivePrimary)) {
      recommendations.push(
        'Database has writable nodes but MaxScale cannot route. Check MaxScale connectivity to database nodes.'
      );
    }

    const noLockMaxScales = maxscaleStates.filter(
      ms => ms.state !== 'down' && !ms.hasLock && ms.visibleGaleraNodes.length > 0
    );
    if (noLockMaxScales.length > 0 && this.topology.clusterType === 'async_replica') {
      const firstNode = this.topology.maxscaleNodes.find(n => n.id === noLockMaxScales[0].nodeId);
      const lockType = firstNode?.settings.cooperativeMonitoringLocks;
      if (lockType === 'majority_of_all') {
        const databaseNodes = this.topology.databaseNodes || [];
        const requiredLocks = Math.floor(databaseNodes.length / 2) + 1;
        const runningNodes = asyncReplicaState?.nodeStates.filter(n => n.state !== 'down').length || 0;
        recommendations.push(
          `${noLockMaxScales.length} MaxScale instance(s) cannot obtain cooperative monitoring locks. With majority_of_all, need to acquire locks on ${requiredLocks} out of ${databaseNodes.length} backends (currently ${runningNodes} running).`
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
