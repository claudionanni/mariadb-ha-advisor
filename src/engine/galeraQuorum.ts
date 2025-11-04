import type { 
  Topology, 
  GaleraNode, 
  FailureScenario, 
  NodeFailureType,
  GaleraClusterState,
  GaleraNodeState 
} from '../types';

/**
 * Calculate Galera cluster quorum and determine primary component
 */
export class GaleraQuorumEngine {
  private topology: Topology;
  
  constructor(topology: Topology) {
    this.topology = topology;
  }

  /**
   * Calculate cluster state for a given failure scenario
   */
  calculateClusterState(scenario: FailureScenario): GaleraClusterState {
    // Get Galera nodes (from either galeraNodes or databaseNodes)
    const galeraNodes = this.getGaleraNodes();
    
    // If no Galera nodes, return empty state
    if (galeraNodes.length === 0) {
      return {
        totalWeight: 0,
        quorumWeight: 0,
        partitions: [],
        nodeStates: [],
        primaryComponent: [],
        splitBrain: false,
        hasQuorum: false,
      };
    }
    
    const totalWeight = this.calculateTotalWeight();
    const partitions = this.identifyPartitions(scenario);
    const primaryPartition = this.selectPrimaryPartition(partitions, totalWeight);
    
    const nodeStates = galeraNodes.map(node => {
      const partition = partitions.find(p => p.nodeIds.includes(node.id));
      const isPrimary = partition === primaryPartition;
      const isDown = this.isNodeDown(node.id, scenario);
      
      return {
        nodeId: node.id,
        state: isDown ? 'down' : (isPrimary ? 'primary' : 'non-primary'),
        canAcceptWrites: !isDown && isPrimary,
        canAcceptReads: !isDown, // Non-primary can still serve reads
        partitionId: partition?.id || null,
      } as GaleraNodeState;
    });

    return {
      totalWeight,
      quorumWeight: Math.floor(totalWeight / 2) + 1,
      partitions: partitions.map(p => ({
        id: p.id,
        nodeIds: p.nodeIds,
        weight: p.weight,
        hasQuorum: p === primaryPartition,
      })),
      nodeStates,
      primaryComponent: primaryPartition?.nodeIds || [],
      splitBrain: this.detectSplitBrain(partitions, totalWeight),
      hasQuorum: primaryPartition !== null && primaryPartition !== undefined,
    };
  }

  /**
   * Get Galera nodes from topology (supports both formats)
   */
  private getGaleraNodes(): GaleraNode[] {
    // Try old format first
    if (this.topology.galeraNodes && this.topology.galeraNodes.length > 0) {
      return this.topology.galeraNodes;
    }
    
    // Try new format - filter database nodes for Galera type
    if (this.topology.databaseNodes) {
      return this.topology.databaseNodes
        .filter(node => node.nodeType === 'galera')
        .map(node => ({
          id: node.id,
          name: node.name,
          serverId: node.serverId,
          settings: node.settings as any, // Settings should have pcWeight
        })) as GaleraNode[];
    }
    
    return [];
  }

  /**
   * Calculate total cluster weight
   */
  private calculateTotalWeight(): number {
    const galeraNodes = this.getGaleraNodes();
    return galeraNodes.reduce(
      (sum, node) => sum + ((node.settings as any).pcWeight || 1), 
      0
    );
  }

  /**
   * Check if a node is down in the scenario
   */
  private isNodeDown(nodeId: string, scenario: FailureScenario): boolean {
    const failure = scenario.failures.find(f => f.targetId === nodeId);
    return failure?.type === 'node_down';
  }

  /**
   * Identify network partitions based on failure scenario
   */
  private identifyPartitions(scenario: FailureScenario): Partition[] {
    const galeraNodes = this.getGaleraNodes();
    const aliveNodes = galeraNodes.filter(
      node => !this.isNodeDown(node.id, scenario)
    );

    if (aliveNodes.length === 0) {
      return [];
    }

    // Build connectivity graph
    const connectivity = this.buildConnectivityGraph(scenario);
    
    // Find connected components using DFS
    const visited = new Set<string>();
    const partitions: Partition[] = [];
    let partitionId = 0;

    for (const node of aliveNodes) {
      if (visited.has(node.id)) continue;

      const partition = this.explorePartition(
        node.id,
        aliveNodes,
        connectivity,
        visited
      );

      if (partition.length > 0) {
        const weight = partition.reduce(
          (sum, nodeId) => {
            const node = galeraNodes.find(n => n.id === nodeId);
            return sum + ((node?.settings as any)?.pcWeight || 1);
          },
          0
        );

        partitions.push({
          id: `partition-${partitionId++}`,
          nodeIds: partition,
          weight,
        });
      }
    }

    return partitions;
  }

  /**
   * Build connectivity graph considering failures
   */
  private buildConnectivityGraph(scenario: FailureScenario): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    const galeraNodes = this.getGaleraNodes();

    // Initialize graph
    for (const node of galeraNodes) {
      graph.set(node.id, new Set());
    }

    // Check connectivity between every pair of nodes
    for (const node1 of galeraNodes) {
      for (const node2 of galeraNodes) {
        if (node1.id === node2.id) continue;

        if (this.canCommunicate(node1, node2, scenario)) {
          graph.get(node1.id)?.add(node2.id);
        }
      }
    }

    return graph;
  }

  /**
   * Check if two nodes can communicate given the failure scenario
   */
  private canCommunicate(
    node1: GaleraNode,
    node2: GaleraNode,
    scenario: FailureScenario
  ): boolean {
    // If either node is down, they can't communicate
    if (this.isNodeDown(node1.id, scenario) || this.isNodeDown(node2.id, scenario)) {
      return false;
    }

    // Check for node unresponsive failures
    const node1Failure = scenario.failures.find(f => f.targetId === node1.id);
    const node2Failure = scenario.failures.find(f => f.targetId === node2.id);
    
    if (node1Failure?.type === 'node_unresponsive' || node2Failure?.type === 'node_unresponsive') {
      return false;
    }

    // Get servers for both nodes
    const server1 = this.topology.servers.find(s => s.id === node1.serverId);
    const server2 = this.topology.servers.find(s => s.id === node2.serverId);

    if (!server1 || !server2) return false;

    // Same subnet = can communicate (nodes in same subnet always see each other)
    if (server1.subnetId === server2.subnetId) {
      return true;
    }

    // Different subnets - check if there's a path via subnet links
    return this.hasNetworkPath(server1.subnetId, server2.subnetId, scenario);
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
   * Explore partition using DFS
   */
  private explorePartition(
    startNodeId: string,
    aliveNodes: GaleraNode[],
    connectivity: Map<string, Set<string>>,
    visited: Set<string>
  ): string[] {
    const partition: string[] = [];
    const stack = [startNodeId];

    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      partition.push(nodeId);

      const neighbors = connectivity.get(nodeId) || new Set();
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId) && aliveNodes.find(n => n.id === neighborId)) {
          stack.push(neighborId);
        }
      }
    }

    return partition;
  }

  /**
   * Select primary partition based on quorum rules
   */
  private selectPrimaryPartition(
    partitions: Partition[],
    totalWeight: number
  ): Partition | null {
    if (partitions.length === 0) return null;
    if (partitions.length === 1) {
      // Single partition - check if it has quorum
      const quorumWeight = Math.floor(totalWeight / 2) + 1;
      return partitions[0].weight >= quorumWeight ? partitions[0] : null;
    }

    // Multiple partitions - find the one with majority
    const quorumWeight = Math.floor(totalWeight / 2) + 1;
    const candidatePartitions = partitions.filter(p => p.weight >= quorumWeight);

    if (candidatePartitions.length === 0) {
      // No partition has quorum
      return null;
    }

    if (candidatePartitions.length === 1) {
      return candidatePartitions[0];
    }

    // Multiple partitions with quorum (shouldn't happen with proper weights, but handle it)
    // Select the one with highest weight, tie-break by first node ID
    return candidatePartitions.sort((a, b) => {
      if (a.weight !== b.weight) return b.weight - a.weight;
      return a.nodeIds[0].localeCompare(b.nodeIds[0]);
    })[0];
  }

  /**
   * Detect split-brain scenario (multiple partitions think they have quorum)
   */
  private detectSplitBrain(partitions: Partition[], totalWeight: number): boolean {
    const quorumWeight = Math.floor(totalWeight / 2) + 1;
    const partitionsWithQuorum = partitions.filter(p => p.weight >= quorumWeight);
    return partitionsWithQuorum.length > 1;
  }
}

interface Partition {
  id: string;
  nodeIds: string[];
  weight: number;
}
