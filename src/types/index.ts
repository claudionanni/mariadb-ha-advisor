/**
 * Core type definitions for the HA Advisor tool
 */

// ============================================================================
// Network & Infrastructure
// ============================================================================

export type SubnetType = 'lan' | 'wan';

export interface Subnet {
  id: string;
  name: string;
  type: SubnetType;
  latencyMs?: number; // For WAN connections
}

export interface Server {
  id: string;
  name: string;
  subnetId: string;
  isVirtual: boolean;
  physicalServerId?: string; // If virtual, references physical host
}

// ============================================================================
// Galera Node Configuration
// ============================================================================

export interface GaleraNode {
  id: string;
  name: string;
  serverId: string;
  settings: GaleraSettings;
}

export interface GaleraSettings {
  // Primary Component (PC) settings
  pcWeight: number; // Default: 1
  pcIgnoreSb?: boolean; // Ignore split brain
  pcBootstrap?: boolean; // Bootstrap the cluster
  
  // EVS (Extended Virtual Synchrony) settings for failure detection
  evsViewForgetTimeout?: string; // Default: PT24H
  evsInactiveCheckPeriod?: string; // Default: PT0.5S
  evsInactiveTimeout?: string; // Default: PT15S
  evsSuspectTimeout?: string; // Default: PT5S
  evsInstallTimeout?: string; // Default: PT7.5S
  
  // Network timeouts
  evsKeepalivePeriod?: string; // Default: PT1S
  evsJoinRetransmitPeriod?: string; // Default: PT1S
  
  // Additional settings
  autoEvict?: number; // Auto-evict nodes after N failures
}

// ============================================================================
// MaxScale Node Configuration
// ============================================================================

export interface MaxScaleNode {
  id: string;
  name: string;
  serverId: string;
  settings: MaxScaleSettings;
}

export interface MaxScaleSettings {
  // Monitor settings
  monitorInterval: number; // Milliseconds
  monitorTimeoutMs?: number;
  
  // Cooperative monitoring
  cooperativeMonitoringLocks?: 'majority_of_all' | 'majority_of_running';
  
  // Backend server priorities
  serverPriorities?: Record<string, number>; // galeraNodeId -> priority
  
  // Failover settings
  autoFailover?: boolean;
  failoverTimeout?: number; // Seconds
}

// ============================================================================
// Topology
// ============================================================================

export interface Topology {
  subnets: Subnet[];
  servers: Server[];
  galeraNodes: GaleraNode[];
  maxscaleNodes: MaxScaleNode[];
}

// ============================================================================
// Failure Scenarios
// ============================================================================

export type FailureType = 
  | 'node_down'           // Complete node failure
  | 'node_unresponsive'   // Node running but not responding
  | 'node_unreachable';   // Network partition

export interface NodeFailure {
  nodeId: string;
  nodeType: 'galera' | 'maxscale' | 'server';
  failureType: FailureType;
}

export interface NetworkPartition {
  // List of nodes that can reach each other
  partitionGroups: string[][]; // Each group can reach each other but not other groups
}

export type FailureScenarioMode = 'manual' | 'auto' | 'preset';

export interface FailureScenario {
  id: string;
  name: string;
  mode: FailureScenarioMode;
  nodeFailures: NodeFailure[];
  networkPartitions?: NetworkPartition;
}

// ============================================================================
// Analysis Results
// ============================================================================

export type ClusterState = 'operational' | 'degraded' | 'failed';

export interface GaleraClusterState {
  state: ClusterState;
  primaryComponent: string[]; // Node IDs in primary component
  nonPrimaryComponents: string[][]; // Other partitions
  hasQuorum: boolean;
}

export interface MaxScaleRoutingState {
  nodeId: string;
  canRouteReads: boolean;
  canRouteWrites: boolean;
  targetGaleraNodes: string[]; // Which Galera nodes this MaxScale routes to
  isReadOnly: boolean; // Set read-only due to lost majority
}

export interface AnalysisResult {
  scenarioId: string;
  clusterState: ClusterState;
  galeraState: GaleraClusterState;
  maxscaleStates: MaxScaleRoutingState[];
  toleranceSummary: ToleranceSummary;
}

export interface ToleranceSummary {
  canSurvive: string[];
  cannotSurvive: string[];
  degradedScenarios: string[];
}

// ============================================================================
// Preset Scenarios
// ============================================================================

export interface PresetScenario {
  id: string;
  name: string;
  description: string;
  generateScenarios: (topology: Topology) => FailureScenario[];
}
