import type { Topology, GaleraNode, AsyncReplicaNode, DatabaseNode } from '../types';

/**
 * Helper functions for backward compatibility and type-safe database node access
 */

/**
 * Get all Galera nodes from topology (handles backward compatibility)
 */
export function getGaleraNodes(topology: Topology): GaleraNode[] {
  // Check deprecated field first for backward compatibility
  if (topology.galeraNodes && topology.galeraNodes.length > 0) {
    return topology.galeraNodes;
  }
  
  // Filter from databaseNodes
  return topology.databaseNodes.filter(n => n.nodeType === 'galera') as GaleraNode[];
}

/**
 * Get all async replica nodes from topology
 */
export function getAsyncReplicaNodes(topology: Topology): AsyncReplicaNode[] {
  return topology.databaseNodes.filter(n => n.nodeType === 'async_replica') as AsyncReplicaNode[];
}

/**
 * Get all database nodes (both Galera and async replica)
 */
export function getAllDatabaseNodes(topology: Topology): DatabaseNode[] {
  // Merge deprecated galeraNodes with databaseNodes for complete compatibility
  const nodes: DatabaseNode[] = [...topology.databaseNodes];
  
  if (topology.galeraNodes && topology.galeraNodes.length > 0) {
    const galeraAsDb: DatabaseNode[] = topology.galeraNodes.map(n => ({
      ...n,
      nodeType: 'galera' as const,
    }));
    
    // Add any galera nodes that aren't already in databaseNodes
    for (const node of galeraAsDb) {
      if (!nodes.some(n => n.id === node.id)) {
        nodes.push(node);
      }
    }
  }
  
  return nodes;
}

/**
 * Check if topology has any database nodes
 */
export function hasDatabaseNodes(topology: Topology): boolean {
  return getAllDatabaseNodes(topology).length > 0;
}
