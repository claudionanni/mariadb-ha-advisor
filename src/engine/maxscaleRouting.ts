import type { 
  Topology, 
  MaxScaleNode,
  GaleraNode,
  FailureScenario,
  MaxScaleNodeState,
  CooperativeMonitoringLocks,
  GaleraClusterState
} from '../types';

/**
 * Calculate MaxScale routing state and determine which instances can route queries
 */
export class MaxScaleRoutingEngine {
  private topology: Topology;
  
  constructor(topology: Topology) {
    this.topology = topology;
  }

  /**
   * Calculate MaxScale cluster state for a given failure scenario
   */
  calculateMaxScaleState(
    scenario: FailureScenario,
    galeraState: GaleraClusterState
  ): MaxScaleNodeState[] {
    const maxscaleStates: MaxScaleNodeState[] = [];

    // Determine which MaxScale instances can participate in routing
    const totalMaxScale = this.topology.maxscaleNodes.length;
    const runningMaxScale = this.topology.maxscaleNodes.filter(
      node => !this.isNodeDown(node.id, scenario)
    );

    // Determine which MaxScale (if any) holds the cooperative lock
    const lockHolder = this.determineLockHolder(runningMaxScale, totalMaxScale);

    for (const maxscaleNode of this.topology.maxscaleNodes) {
      const isDown = this.isNodeDown(maxscaleNode.id, scenario);
      
      if (isDown) {
        maxscaleStates.push({
          nodeId: maxscaleNode.id,
          state: 'down',
          canRoute: false,
          visibleGaleraNodes: [],
          hasLock: false,
        });
        continue;
      }

      // Check which Galera nodes this MaxScale can see
      const visibleGaleraNodes = this.getVisibleGaleraNodes(
        maxscaleNode,
        scenario,
        galeraState
      );

      // Check if THIS specific MaxScale has the cooperative monitoring lock
      const hasLock = lockHolder === maxscaleNode.id;

      // Determine if MaxScale can route
      // With no locking (none), all can route if they see Galera nodes
      const lockType = maxscaleNode.settings.cooperativeMonitoringLocks;
      const canRoute = (!lockType || lockType === 'none' || hasLock) && 
                       visibleGaleraNodes.length > 0;

      maxscaleStates.push({
        nodeId: maxscaleNode.id,
        state: canRoute ? 'routing' : 'monitoring-only',
        canRoute,
        visibleGaleraNodes,
        hasLock,
      });
    }

    return maxscaleStates;
  }

  /**
   * Determine which MaxScale (if any) holds the cooperative monitoring lock
   * Returns the nodeId of the lock holder, or null if no lock mechanism or no holder
   */
  private determineLockHolder(
    runningMaxScale: MaxScaleNode[],
    totalMaxScale: number
  ): string | null {
    if (runningMaxScale.length === 0) return null;

    // Get the lock type from the first node (all should have same setting)
    const lockType = runningMaxScale[0].settings.cooperativeMonitoringLocks;

    if (!lockType || lockType === 'none') {
      // No locking - all can independently monitor/route
      return null;
    }

    if (lockType === 'majority_of_all') {
      // Need majority of ALL instances (including down ones)
      const requiredCount = Math.floor(totalMaxScale / 2) + 1;
      if (runningMaxScale.length < requiredCount) {
        // No majority - no lock holder
        return null;
      }
      // First running instance gets the lock (deterministic for simulation)
      return runningMaxScale[0].id;
    }

    if (lockType === 'majority_of_running') {
      // Always have majority of running instances (by definition)
      // First running instance gets the lock
      return runningMaxScale[0].id;
    }

    return null;
  }

  /**
   * Check if a MaxScale node is down in the scenario
   */
  private isNodeDown(nodeId: string, scenario: FailureScenario): boolean {
    const failure = scenario.failures.find(f => f.targetId === nodeId);
    return failure?.type === 'node_down';
  }

  /**
   * Get list of Galera nodes visible to this MaxScale
   */
  private getVisibleGaleraNodes(
    maxscaleNode: MaxScaleNode,
    scenario: FailureScenario,
    galeraState: GaleraClusterState
  ): string[] {
    const visibleNodes: string[] = [];

    for (const galeraNode of this.topology.galeraNodes) {
      // Skip if Galera node is down
      const galeraNodeState = galeraState.nodeStates.find(
        s => s.nodeId === galeraNode.id
      );
      if (!galeraNodeState || galeraNodeState.state === 'down') {
        continue;
      }

      // Check if MaxScale can communicate with this Galera node
      if (this.canCommunicate(maxscaleNode, galeraNode, scenario)) {
        visibleNodes.push(galeraNode.id);
      }
    }

    return visibleNodes;
  }

  /**
   * Check if MaxScale can communicate with a Galera node
   */
  private canCommunicate(
    maxscaleNode: MaxScaleNode,
    galeraNode: GaleraNode,
    scenario: FailureScenario
  ): boolean {
    // Get servers for both nodes
    const maxscaleServer = this.topology.servers.find(
      s => s.id === maxscaleNode.serverId
    );
    const galeraServer = this.topology.servers.find(
      s => s.id === galeraNode.serverId
    );

    if (!maxscaleServer || !galeraServer) return false;

    // Same subnet = always connected (unless network failure)
    if (maxscaleServer.subnetId === galeraServer.subnetId) {
      // Check for subnet network failures
      const subnetFailure = scenario.failures.find(
        f => f.targetId === maxscaleServer.subnetId && f.type === 'network_partition'
      );
      return !subnetFailure;
    }

    // Different subnets - check if there's a path via subnet links
    return this.hasNetworkPath(
      maxscaleServer.subnetId,
      galeraServer.subnetId,
      scenario
    );
  }

  /**
   * Check if there's a network path between two subnets
   */
  private hasNetworkPath(
    subnet1Id: string,
    subnet2Id: string,
    scenario: FailureScenario
  ): boolean {
    // Check for direct link
    const directLink = this.topology.subnetLinks.find(
      link => 
        (link.subnet1Id === subnet1Id && link.subnet2Id === subnet2Id) ||
        (link.subnet1Id === subnet2Id && link.subnet2Id === subnet1Id)
    );

    if (!directLink) return false;

    // Check if link is failed
    const linkFailure = scenario.failures.find(
      f => f.targetId === directLink.id && f.type === 'network_partition'
    );

    return !linkFailure;
  }

  /**
   * Calculate overall system availability
   */
  calculateSystemAvailability(
    galeraState: GaleraClusterState,
    maxscaleStates: MaxScaleNodeState[]
  ): {
    canAcceptWrites: boolean;
    canAcceptReads: boolean;
    routingMaxScales: string[];
    primaryGaleraNodes: string[];
  } {
    // Check if any MaxScale can route
    const routingMaxScales = maxscaleStates
      .filter(ms => ms.canRoute)
      .map(ms => ms.nodeId);

    // Get primary Galera nodes
    const primaryGaleraNodes = galeraState.primaryComponent;

    // System can accept writes if:
    // 1. At least one MaxScale can route, AND
    // 2. That MaxScale can see at least one primary Galera node
    let canAcceptWrites = false;
    for (const msState of maxscaleStates) {
      if (msState.canRoute) {
        const canSeePrimary = msState.visibleGaleraNodes.some(
          nodeId => primaryGaleraNodes.includes(nodeId)
        );
        if (canSeePrimary) {
          canAcceptWrites = true;
          break;
        }
      }
    }

    // System can accept reads if:
    // At least one MaxScale can route to any Galera node
    const canAcceptReads = maxscaleStates.some(
      ms => ms.canRoute && ms.visibleGaleraNodes.length > 0
    );

    return {
      canAcceptWrites,
      canAcceptReads,
      routingMaxScales,
      primaryGaleraNodes,
    };
  }
}
