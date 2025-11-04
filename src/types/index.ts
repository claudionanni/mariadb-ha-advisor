/**
 * Core type definitions for the HA Advisor tool
 */

// ============================================================================
// Network & Infrastructure
// ============================================================================

export interface Subnet {
  id: string;
  name: string;
  // All subnets are LAN - WAN is defined via links between subnets
}

export type LinkType = 'lan' | 'wan';

export interface SubnetLink {
  id: string;
  subnet1Id: string;
  subnet2Id: string;
  linkType: LinkType;
  latencyMs?: number; // For WAN links or high-latency LAN
}

export interface Server {
  id: string;
  name: string;
  subnetId: string;
  isVirtual: boolean;
  physicalServerId?: string; // If virtual, references physical host
}

// ============================================================================
// Database Node Configuration
// ============================================================================

export type DatabaseNodeType = 'galera' | 'async_replica';

export interface GaleraNode {
  id: string;
  name: string;
  serverId: string;
  nodeType: 'galera';
  settings: GaleraSettings;
}

export interface AsyncReplicaNode {
  id: string;
  name: string;
  serverId: string;
  nodeType: 'async_replica';
  role: 'primary' | 'replica';
  settings: AsyncReplicaSettings;
}

export type DatabaseNode = GaleraNode | AsyncReplicaNode;

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

export interface AsyncReplicaSettings {
  // Replication settings
  replicationLag?: number; // Seconds behind primary
  readOnly?: boolean; // Read-only replica
  
  // Connection settings
  connectRetryCount?: number;
  connectRetryInterval?: number; // Seconds
  
  // Failover settings
  priority?: number; // Higher priority replicas are preferred for promotion
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
  
  // Cooperative monitoring - ONLY for async_replica clusters via mariadbmon
  // Determines how MaxScale acquires locks on backends for automatic failover
  // Only ONE MaxScale holds locks at any time (via SELECT GET_LOCK())
  // - majority_of_all: Must acquire locks on majority of ALL configured nodes
  // - majority_of_running: Must acquire locks on majority of RUNNING nodes
  // - undefined: No cooperative monitoring (used for Galera clusters)
  // NOTE: Galera clusters don't need cooperative monitoring - MaxScale only routes traffic
  cooperativeMonitoringLocks?: 'majority_of_all' | 'majority_of_running';
  
  // Backend server priorities
  serverPriorities?: Record<string, number>; // databaseNodeId -> priority
  
  // Failover settings (only applicable for async_replica clusters)
  autoFailover?: boolean;
  failoverTimeout?: number; // Seconds
  switchoverOnLowDiskSpace?: boolean;
}

// ============================================================================
// Topology
// ============================================================================

export type ClusterType = 'galera' | 'async_replica';

export interface Topology {
  id?: string;
  name: string;
  clusterType: ClusterType;
  subnets: Subnet[];
  subnetLinks: SubnetLink[];
  servers: Server[];
  databaseNodes: DatabaseNode[]; // Replaces galeraNodes - can be Galera or Async Replica
  maxscaleNodes: MaxScaleNode[];
  
  // Deprecated - kept for backward compatibility during migration
  galeraNodes?: GaleraNode[];
}

// ============================================================================
// Failure Scenarios
// ============================================================================

export type NodeFailureType = 
  | 'node_down'           // Complete node failure
  | 'node_unresponsive'   // Node running but not responding
  | 'network_partition';  // Network partition

export interface NodeFailure {
  targetId: string;
  type: NodeFailureType;
}

export interface FailureScenario {
  id: string;
  name: string;
  description: string;
  failures: NodeFailure[];
}

// ============================================================================
// Analysis Results
// ============================================================================

export type ClusterState = 'operational' | 'degraded' | 'failed';
export type GaleraNodeState = 'primary' | 'non_primary' | 'down';

export interface GaleraNodeStateInfo {
  nodeId: string;
  state: GaleraNodeState;
  canAcceptReads: boolean;
  canAcceptWrites: boolean;
  partitionId?: number;
}

export interface GaleraPartition {
  id: number;
  nodeIds: string[];
  weight: number;
  hasQuorum: boolean;
}

export interface GaleraClusterState {
  totalWeight: number;
  quorumWeight: number;
  primaryComponent: string[]; // Node IDs in primary component
  nodeStates: GaleraNodeStateInfo[];
  partitions: GaleraPartition[];
  splitBrain: boolean;
  hasQuorum: boolean;
}

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

export interface MaxScaleNodeState {
  nodeId: string;
  state: 'up' | 'down';
  canRoute: boolean;
  visibleGaleraNodes: string[];
  hasLock: boolean;
}

export interface MaxScaleRoutingState {
  nodeId: string;
  canRouteReads: boolean;
  canRouteWrites: boolean;
  targetGaleraNodes: string[]; // Which Galera nodes this MaxScale routes to
  isReadOnly: boolean; // Set read-only due to lost majority
}

export interface SystemAvailability {
  canAcceptWrites: boolean;
  canAcceptReads: boolean;
  operationalMaxScales: number;
  operationalGaleraNodes: number;
}

export interface AnalysisResult {
  scenarioId: string;
  timestamp: string;
  galeraState?: GaleraClusterState;
  asyncReplicaState?: AsyncReplicaClusterState;
  maxscaleStates: MaxScaleNodeState[];
  systemAvailability: SystemAvailability;
  summary: string;
  recommendations: string[];
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
