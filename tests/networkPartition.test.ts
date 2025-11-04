import { describe, it, expect } from 'vitest';
import { HAAnalysisEngine } from '../src/engine/haAnalysis';
import type { Topology, FailureScenario } from '../src/types';

describe('Network Partition Analysis', () => {
  it('should correctly identify Galera partitions when network link is cut', () => {
    // Setup: 3 Galera nodes across 2 subnets connected by 1 link
    // N1, N2 in subnet1 (weights: 1, 1)
    // N3 in subnet2 (weight: 1)
    const topology: Topology = {
      subnets: [
        { id: 'subnet1', name: 'DC1' },
        { id: 'subnet2', name: 'DC2' },
      ],
      subnetLinks: [
        { id: 'link1', subnet1Id: 'subnet1', subnet2Id: 'subnet2', linkType: 'wan', latencyMs: 50 },
      ],
      servers: [
        { id: 'server1', name: 'Server1', subnetId: 'subnet1', isVirtual: false },
        { id: 'server2', name: 'Server2', subnetId: 'subnet1', isVirtual: false },
        { id: 'server3', name: 'Server3', subnetId: 'subnet2', isVirtual: false },
      ],
      galeraNodes: [
        { id: 'n1', name: 'Node1', serverId: 'server1', settings: { pcWeight: 1 } },
        { id: 'n2', name: 'Node2', serverId: 'server2', settings: { pcWeight: 1 } },
        { id: 'n3', name: 'Node3', serverId: 'server3', settings: { pcWeight: 1 } },
      ],
      maxscaleNodes: [],
    };

    // Scenario: Cut the link between subnet1 and subnet2
    const scenario: FailureScenario = {
      id: 'test1',
      name: 'Network Partition Test',
      description: 'Cut WAN link between DC1 and DC2',
      failures: [
        { targetId: 'link1', type: 'network_partition' },
      ],
    };

    const engine = new HAAnalysisEngine(topology);
    const result = engine.analyzeScenario(scenario);

    // Expectations:
    // - 2 partitions should be identified
    // - Partition with N1+N2 (weight=2) should have quorum
    // - Partition with N3 (weight=1) should NOT have quorum
    // - N1 and N2 should be in 'primary' state
    // - N3 should be in 'non-primary' state
    
    expect(result.galeraState.partitions.length).toBe(2);
    expect(result.galeraState.hasQuorum).toBe(true);
    expect(result.galeraState.splitBrain).toBe(false);
    
    // Primary partition should have nodes N1 and N2
    expect(result.galeraState.primaryComponent.length).toBe(2);
    expect(result.galeraState.primaryComponent).toContain('n1');
    expect(result.galeraState.primaryComponent).toContain('n2');
    
    // Check individual node states
    const n1State = result.galeraState.nodeStates.find(n => n.nodeId === 'n1');
    const n2State = result.galeraState.nodeStates.find(n => n.nodeId === 'n2');
    const n3State = result.galeraState.nodeStates.find(n => n.nodeId === 'n3');
    
    expect(n1State?.state).toBe('primary');
    expect(n1State?.canAcceptWrites).toBe(true);
    expect(n2State?.state).toBe('primary');
    expect(n2State?.canAcceptWrites).toBe(true);
    expect(n3State?.state).toBe('non-primary');
    expect(n3State?.canAcceptWrites).toBe(false);
    expect(n3State?.canAcceptReads).toBe(true); // Non-primary can still read
  });

  it('should handle MaxScale connectivity during network partition', () => {
    // Setup: 2 MaxScale + 3 Galera across 2 subnets
    // MaxScale1 in subnet1, MaxScale2 in subnet2
    // Galera N1, N2 in subnet1, N3 in subnet2
    const topology: Topology = {
      subnets: [
        { id: 'subnet1', name: 'DC1' },
        { id: 'subnet2', name: 'DC2' },
      ],
      subnetLinks: [
        { id: 'link1', subnet1Id: 'subnet1', subnet2Id: 'subnet2', linkType: 'wan', latencyMs: 50 },
      ],
      servers: [
        { id: 'server1', name: 'Server1', subnetId: 'subnet1', isVirtual: false },
        { id: 'server2', name: 'Server2', subnetId: 'subnet1', isVirtual: false },
        { id: 'server3', name: 'Server3', subnetId: 'subnet2', isVirtual: false },
        { id: 'server4', name: 'Server4', subnetId: 'subnet1', isVirtual: false },
        { id: 'server5', name: 'Server5', subnetId: 'subnet2', isVirtual: false },
      ],
      galeraNodes: [
        { id: 'n1', name: 'Node1', serverId: 'server1', settings: { pcWeight: 1 } },
        { id: 'n2', name: 'Node2', serverId: 'server2', settings: { pcWeight: 1 } },
        { id: 'n3', name: 'Node3', serverId: 'server3', settings: { pcWeight: 1 } },
      ],
      maxscaleNodes: [
        { 
          id: 'mx1', 
          name: 'MaxScale1', 
          serverId: 'server4',
          settings: { cooperativeMonitoringLocks: 'majority_of_running' }
        },
        { 
          id: 'mx2', 
          name: 'MaxScale2', 
          serverId: 'server5',
          settings: { cooperativeMonitoringLocks: 'majority_of_running' }
        },
      ],
    };

    // Scenario: Cut the WAN link
    const scenario: FailureScenario = {
      id: 'test2',
      name: 'MaxScale Partition Test',
      description: 'Test MaxScale behavior during network partition',
      failures: [
        { targetId: 'link1', type: 'network_partition' },
      ],
    };

    const engine = new HAAnalysisEngine(topology);
    const result = engine.analyzeScenario(scenario);

    // Expectations:
    // - MaxScale1 should see N1 and N2 (primary partition)
    // - MaxScale2 should see only N3 (non-primary partition)
    // - MaxScale1 should be able to route (has lock, sees primary nodes)
    // - MaxScale2 should NOT route to writes (sees non-primary node)
    
    const mx1State = result.maxscaleStates.find(m => m.nodeId === 'mx1');
    const mx2State = result.maxscaleStates.find(m => m.nodeId === 'mx2');
    
    expect(mx1State?.visibleGaleraNodes.length).toBe(2);
    expect(mx1State?.visibleGaleraNodes).toContain('n1');
    expect(mx1State?.visibleGaleraNodes).toContain('n2');
    expect(mx1State?.hasLock).toBe(true);
    expect(mx1State?.canRoute).toBe(true);
    
    expect(mx2State?.visibleGaleraNodes.length).toBe(1);
    expect(mx2State?.visibleGaleraNodes).toContain('n3');
    expect(mx2State?.hasLock).toBe(false);
    
    // System should be able to accept writes (MaxScale1 can see primary nodes)
    expect(result.systemAvailability.canAcceptWrites).toBe(true);
  });

  it('should handle MaxScale failover when active instance goes down', () => {
    // Setup: 2 MaxScale + 3 Galera in same subnet (no network issues)
    const topology: Topology = {
      subnets: [
        { id: 'subnet1', name: 'DC1' },
      ],
      subnetLinks: [],
      servers: [
        { id: 'server1', name: 'Server1', subnetId: 'subnet1', isVirtual: false },
        { id: 'server2', name: 'Server2', subnetId: 'subnet1', isVirtual: false },
        { id: 'server3', name: 'Server3', subnetId: 'subnet1', isVirtual: false },
        { id: 'server4', name: 'Server4', subnetId: 'subnet1', isVirtual: false },
        { id: 'server5', name: 'Server5', subnetId: 'subnet1', isVirtual: false },
      ],
      galeraNodes: [
        { id: 'n1', name: 'Node1', serverId: 'server1', settings: { pcWeight: 1 } },
        { id: 'n2', name: 'Node2', serverId: 'server2', settings: { pcWeight: 1 } },
        { id: 'n3', name: 'Node3', serverId: 'server3', settings: { pcWeight: 1 } },
      ],
      maxscaleNodes: [
        { 
          id: 'mx1', 
          name: 'MaxScale1', 
          serverId: 'server4',
          settings: { cooperativeMonitoringLocks: 'majority_of_all' }
        },
        { 
          id: 'mx2', 
          name: 'MaxScale2', 
          serverId: 'server5',
          settings: { cooperativeMonitoringLocks: 'majority_of_all' }
        },
      ],
    };

    // Scenario: First MaxScale goes down
    const scenario: FailureScenario = {
      id: 'test3',
      name: 'MaxScale Failover Test',
      description: 'Active MaxScale fails, standby takes over',
      failures: [
        { targetId: 'mx1', type: 'node_down' },
      ],
    };

    const engine = new HAAnalysisEngine(topology);
    const result = engine.analyzeScenario(scenario);

    // Expectations:
    // - mx1 should be down
    // - mx2 should automatically take over (get the lock)
    // - System should still be fully operational
    
    const mx1State = result.maxscaleStates.find(m => m.nodeId === 'mx1');
    const mx2State = result.maxscaleStates.find(m => m.nodeId === 'mx2');
    
    expect(mx1State?.state).toBe('down');
    expect(mx1State?.canRoute).toBe(false);
    
    expect(mx2State?.state).toBe('up');
    expect(mx2State?.hasLock).toBe(true);
    expect(mx2State?.canRoute).toBe(true);
    expect(mx2State?.visibleGaleraNodes.length).toBe(3);
    
    expect(result.systemAvailability.canAcceptWrites).toBe(true);
    expect(result.systemAvailability.canAcceptReads).toBe(true);
  });

  it('should handle split-brain scenario with equal weight partitions', () => {
    // Setup: 4 nodes with equal weights across 2 subnets (2+2)
    const topology: Topology = {
      subnets: [
        { id: 'subnet1', name: 'DC1' },
        { id: 'subnet2', name: 'DC2' },
      ],
      subnetLinks: [
        { id: 'link1', subnet1Id: 'subnet1', subnet2Id: 'subnet2', linkType: 'wan', latencyMs: 50 },
      ],
      servers: [
        { id: 'server1', name: 'Server1', subnetId: 'subnet1', isVirtual: false },
        { id: 'server2', name: 'Server2', subnetId: 'subnet1', isVirtual: false },
        { id: 'server3', name: 'Server3', subnetId: 'subnet2', isVirtual: false },
        { id: 'server4', name: 'Server4', subnetId: 'subnet2', isVirtual: false },
      ],
      galeraNodes: [
        { id: 'n1', name: 'Node1', serverId: 'server1', settings: { pcWeight: 1 } },
        { id: 'n2', name: 'Node2', serverId: 'server2', settings: { pcWeight: 1 } },
        { id: 'n3', name: 'Node3', serverId: 'server3', settings: { pcWeight: 1 } },
        { id: 'n4', name: 'Node4', serverId: 'server4', settings: { pcWeight: 1 } },
      ],
      maxscaleNodes: [],
    };

    // Scenario: Cut the WAN link - creates 2 partitions with equal weight (2+2)
    const scenario: FailureScenario = {
      id: 'test4',
      name: 'Split Brain Test',
      description: 'Equal weight partitions - no quorum',
      failures: [
        { targetId: 'link1', type: 'network_partition' },
      ],
    };

    const engine = new HAAnalysisEngine(topology);
    const result = engine.analyzeScenario(scenario);

    // Expectations:
    // - 2 partitions with weight=2 each
    // - Total weight = 4, quorum needed = 3
    // - Neither partition has quorum (both have weight=2 < 3)
    // - All nodes should be non-primary
    // - No writes possible
    
    expect(result.galeraState.partitions.length).toBe(2);
    expect(result.galeraState.totalWeight).toBe(4);
    expect(result.galeraState.quorumWeight).toBe(3);
    expect(result.galeraState.hasQuorum).toBe(false);
    expect(result.galeraState.primaryComponent.length).toBe(0);
    
    // All partitions should NOT have quorum
    result.galeraState.partitions.forEach(partition => {
      expect(partition.hasQuorum).toBe(false);
    });
    
    // All nodes should be non-primary
    result.galeraState.nodeStates.forEach(nodeState => {
      expect(nodeState.state).toBe('non-primary');
      expect(nodeState.canAcceptWrites).toBe(false);
    });
  });
});
