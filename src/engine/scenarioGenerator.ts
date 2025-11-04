import type { Topology, FailureScenario, NodeFailure } from '../types';

/**
 * Generate comprehensive failure scenarios for testing
 */
export class ScenarioGenerator {
  private topology: Topology;

  constructor(topology: Topology) {
    this.topology = topology;
  }

  /**
   * Generate all single-node failure scenarios
   */
  generateSingleNodeFailures(): FailureScenario[] {
    const scenarios: FailureScenario[] = [];
    let id = 1;

    // Single Galera node failures
    for (const node of this.topology.galeraNodes) {
      scenarios.push({
        id: `single-galera-${id++}`,
        name: `Galera: ${node.name} Down`,
        description: `Single Galera node failure: ${node.name}`,
        failures: [{ targetId: node.id, type: 'node_down' }],
      });
    }

    // Single MaxScale node failures
    for (const node of this.topology.maxscaleNodes) {
      scenarios.push({
        id: `single-maxscale-${id++}`,
        name: `MaxScale: ${node.name} Down`,
        description: `Single MaxScale node failure: ${node.name}`,
        failures: [{ targetId: node.id, type: 'node_down' }],
      });
    }

    return scenarios;
  }

  /**
   * Generate all double-node failure combinations
   */
  generateDoubleNodeFailures(): FailureScenario[] {
    const scenarios: FailureScenario[] = [];
    let id = 1;

    // Two Galera nodes
    for (let i = 0; i < this.topology.galeraNodes.length; i++) {
      for (let j = i + 1; j < this.topology.galeraNodes.length; j++) {
        const node1 = this.topology.galeraNodes[i];
        const node2 = this.topology.galeraNodes[j];
        scenarios.push({
          id: `double-galera-${id++}`,
          name: `Galera: ${node1.name} + ${node2.name} Down`,
          description: `Two Galera nodes down: ${node1.name}, ${node2.name}`,
          failures: [
            { targetId: node1.id, type: 'node_down' },
            { targetId: node2.id, type: 'node_down' },
          ],
        });
      }
    }

    // One Galera + One MaxScale
    for (const galeraNode of this.topology.galeraNodes) {
      for (const maxscaleNode of this.topology.maxscaleNodes) {
        scenarios.push({
          id: `mixed-${id++}`,
          name: `${galeraNode.name} + ${maxscaleNode.name} Down`,
          description: `Mixed failure: Galera ${galeraNode.name} and MaxScale ${maxscaleNode.name}`,
          failures: [
            { targetId: galeraNode.id, type: 'node_down' },
            { targetId: maxscaleNode.id, type: 'node_down' },
          ],
        });
      }
    }

    return scenarios;
  }

  /**
   * Generate network partition scenarios
   */
  generateNetworkPartitions(): FailureScenario[] {
    const scenarios: FailureScenario[] = [];
    let id = 1;

    // Single subnet link failures
    for (const link of this.topology.subnetLinks) {
      const subnet1 = this.topology.subnets.find(s => s.id === link.subnet1Id);
      const subnet2 = this.topology.subnets.find(s => s.id === link.subnet2Id);
      
      scenarios.push({
        id: `partition-${id++}`,
        name: `Partition: ${subnet1?.name || 'Subnet1'} ↔ ${subnet2?.name || 'Subnet2'}`,
        description: `Network partition between ${subnet1?.name} and ${subnet2?.name}`,
        failures: [{ targetId: link.id, type: 'network_partition' }],
      });
    }

    // Complete subnet isolation (all links to a subnet)
    for (const subnet of this.topology.subnets) {
      const linksToSubnet = this.topology.subnetLinks.filter(
        link => link.subnet1Id === subnet.id || link.subnet2Id === subnet.id
      );

      if (linksToSubnet.length > 1) {
        scenarios.push({
          id: `isolation-${id++}`,
          name: `Isolated: ${subnet.name}`,
          description: `Complete network isolation of ${subnet.name}`,
          failures: linksToSubnet.map(link => ({
            targetId: link.id,
            type: 'network_partition' as const,
          })),
        });
      }
    }

    return scenarios;
  }

  /**
   * Generate datacenter/subnet failure scenarios
   */
  generateDatacenterFailures(): FailureScenario[] {
    const scenarios: FailureScenario[] = [];
    let id = 1;

    for (const subnet of this.topology.subnets) {
      // Get all servers in this subnet
      const serversInSubnet = this.topology.servers.filter(
        s => s.subnetId === subnet.id
      );

      if (serversInSubnet.length === 0) continue;

      // Get all Galera nodes in this subnet
      const galeraInSubnet = this.topology.galeraNodes.filter(
        node => serversInSubnet.some(s => s.id === node.serverId)
      );

      // Get all MaxScale nodes in this subnet
      const maxscaleInSubnet = this.topology.maxscaleNodes.filter(
        node => serversInSubnet.some(s => s.id === node.serverId)
      );

      const failures: NodeFailure[] = [
        ...galeraInSubnet.map(node => ({ targetId: node.id, type: 'node_down' as const })),
        ...maxscaleInSubnet.map(node => ({ targetId: node.id, type: 'node_down' as const })),
      ];

      if (failures.length > 0) {
        scenarios.push({
          id: `dc-failure-${id++}`,
          name: `DC Failure: ${subnet.name}`,
          description: `Complete datacenter/subnet failure: ${subnet.name} (${failures.length} nodes)`,
          failures,
        });
      }
    }

    return scenarios;
  }

  /**
   * Generate split-brain scenarios (designed to create split-brain if possible)
   */
  generateSplitBrainScenarios(): FailureScenario[] {
    const scenarios: FailureScenario[] = [];
    
    // This requires specific configurations where two partitions can both have quorum
    // Only possible if weights are misconfigured
    // We'll create scenarios that test edge cases

    if (this.topology.galeraNodes.length >= 3) {
      // Try to split evenly (might cause split-brain with equal weights)
      const half = Math.floor(this.topology.galeraNodes.length / 2);
      const partition1 = this.topology.galeraNodes.slice(0, half);
      const partition2 = this.topology.galeraNodes.slice(half);

      // Find if they're on different subnets
      const servers1 = partition1.map(n => 
        this.topology.servers.find(s => s.id === n.serverId)
      ).filter(Boolean);
      const servers2 = partition2.map(n => 
        this.topology.servers.find(s => s.id === n.serverId)
      ).filter(Boolean);

      const subnets1 = new Set(servers1.map(s => s?.subnetId));
      const subnets2 = new Set(servers2.map(s => s?.subnetId));

      // If they're on different subnets, create partition scenario
      if (subnets1.size > 0 && subnets2.size > 0 && 
          ![...subnets1].some(s => subnets2.has(s))) {
        
        // Find links between these subnet groups
        const linksToBreak = this.topology.subnetLinks.filter(link =>
          (subnets1.has(link.subnet1Id) && subnets2.has(link.subnet2Id)) ||
          (subnets2.has(link.subnet1Id) && subnets1.has(link.subnet2Id))
        );

        if (linksToBreak.length > 0) {
          scenarios.push({
            id: 'potential-split-brain',
            name: 'Potential Split-Brain Test',
            description: `Network partition creating two equal groups (tests split-brain prevention)`,
            failures: linksToBreak.map(link => ({
              targetId: link.id,
              type: 'network_partition' as const,
            })),
          });
        }
      }
    }

    return scenarios;
  }

  /**
   * Generate all scenarios (comprehensive test suite)
   */
  generateAllScenarios(): FailureScenario[] {
    return [
      // Baseline
      {
        id: 'baseline',
        name: '✅ Baseline (No Failures)',
        description: 'All nodes operational',
        failures: [],
      },
      // Single failures
      ...this.generateSingleNodeFailures(),
      // Double failures
      ...this.generateDoubleNodeFailures(),
      // Network partitions
      ...this.generateNetworkPartitions(),
      // Datacenter failures
      ...this.generateDatacenterFailures(),
      // Split-brain tests
      ...this.generateSplitBrainScenarios(),
    ];
  }

  /**
   * Generate a quick test suite (most important scenarios only)
   */
  generateQuickTestSuite(): FailureScenario[] {
    return [
      // Baseline
      {
        id: 'baseline',
        name: '✅ Baseline (No Failures)',
        description: 'All nodes operational',
        failures: [],
      },
      // Single node failures
      ...this.generateSingleNodeFailures(),
      // Datacenter failures (most critical)
      ...this.generateDatacenterFailures(),
    ];
  }
}
