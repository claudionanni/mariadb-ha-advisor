import type { 
  Topology, 
  FailureScenario,
  AsyncReplicaNode,
  DatabaseNode
} from '../types';

export interface AsyncReplicaNodeState {
  nodeId: string;
  role: 'primary' | 'replica';
  state: 'up' | 'down';
  canAcceptReads: boolean;
  canAcceptWrites: boolean;
}

export interface AsyncReplicaClusterState {
  primaryNode: string | null;
  nodeStates: AsyncReplicaNodeState[];
  hasActivePrimary: boolean;
}

/**
 * Async Replica Cluster Analysis Engine
 * Handles analysis for async replication topologies (non-Galera)
 */
export class AsyncReplicaEngine {
  private topology: Topology;
  
  constructor(topology: Topology) {
    this.topology = topology;
  }

  /**
   * Calculate async replica cluster state for a given failure scenario
   */
  calculateClusterState(scenario: FailureScenario): AsyncReplicaClusterState {
    const databaseNodes = this.topology.databaseNodes || [];
    const nodeStates: AsyncReplicaNodeState[] = [];
    let primaryNode: string | null = null;

    for (const dbNode of databaseNodes) {
      if (dbNode.nodeType !== 'async_replica') continue;

      const isDown = this.isNodeDown(dbNode.id, scenario);
      const asyncNode = dbNode as AsyncReplicaNode;

      const state: AsyncReplicaNodeState = {
        nodeId: dbNode.id,
        role: asyncNode.role,
        state: isDown ? 'down' : 'up',
        canAcceptReads: !isDown,
        canAcceptWrites: !isDown && asyncNode.role === 'primary',
      };

      nodeStates.push(state);

      if (!isDown && asyncNode.role === 'primary') {
        primaryNode = dbNode.id;
      }
    }

    return {
      primaryNode,
      nodeStates,
      hasActivePrimary: primaryNode !== null,
    };
  }

  /**
   * Check if a node is down in the scenario
   */
  private isNodeDown(nodeId: string, scenario: FailureScenario): boolean {
    const failure = scenario.failures.find(f => f.targetId === nodeId);
    return failure?.type === 'node_down';
  }
}
