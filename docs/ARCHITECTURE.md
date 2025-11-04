# MariaDB HA Advisor - Technical Architecture Document

## Project Overview

**MariaDB HA Advisor** is an interactive web-based tool for analyzing High Availability (HA) configurations for MariaDB database clusters with MaxScale proxy. It allows users to define complex database topologies, configure HA settings, and simulate various failure scenarios to understand system behavior and resilience.

**Key Principle**: This is an analysis and learning tool, NOT a configuration generator. It helps users understand HA behavior before implementing configurations in production.

## Core Concepts

### Supported Cluster Types

1. **Galera Cluster**
   - Multi-master replication with all nodes writable
   - Uses quorum-based split-brain protection
   - Nodes have configurable weights for quorum calculation
   - No failover needed - all nodes are equal peers
   - MaxScale only performs routing (read-write split)

2. **Async Replication**
   - Traditional primary-replica topology
   - One writable primary, multiple read-only replicas
   - MaxScale performs automatic failover via cooperative monitoring
   - Uses MariaDB Monitor (mariadbmon) module

### Key HA Concepts

#### Galera Quorum
- **Quorum Calculation**: `sum(node_weights) / 2 + 1`
- **Dynamic Recalculation**: When nodes fail gracefully or with time between failures, quorum recalculates based on remaining nodes
- **Current Simulator Limitation**: Simulates simultaneous failures (worst-case scenario) - does NOT recalculate quorum dynamically
- **Primary Component**: Nodes with quorum form the primary component (can write)
- **Non-Primary Component**: Nodes without quorum become read-only

#### MaxScale Cooperative Monitoring
- **Applies to**: Async replication only (NOT Galera)
- **Lock Modes**:
  - `majority_of_all`: Must acquire locks on majority of ALL configured servers
  - `majority_of_running`: Must acquire locks on majority of RUNNING servers
- **How it works**: Each MaxScale tries to acquire `GET_LOCK()` on database servers; the one holding the most locks becomes ACTIVE
- **Only one ACTIVE**: Only one MaxScale manages failover at a time; others are in MONITORING ONLY mode
- **Failover**: When ACTIVE MaxScale fails, another takes over by acquiring locks

#### Service Co-location
- **Physical Servers**: Can host multiple services (MariaDB + MaxScale)
- **Failure Impact**: Marking a physical server down affects all services on it

## Architecture

### Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **State Management**: Zustand (lightweight, Redux alternative)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Type System**: TypeScript (strict mode)

### Project Structure

```
mariadb-ha-advisor/
├── config/                    # Build and tool configurations
│   ├── eslint.config.js
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.*.json
│   └── vite.config.ts
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md        # This file
│   └── README.md
├── public/                    # Static assets
├── src/
│   ├── components/           # React components (organized by feature)
│   │   ├── analysis/         # Failure scenario analysis UI
│   │   ├── common/           # Shared components (Layout, Tabs)
│   │   ├── settings/         # HA settings editor
│   │   └── topology-editor/  # Topology builder UI
│   ├── engine/              # Core analysis logic
│   │   ├── galeraQuorum.ts  # Galera quorum calculation
│   │   ├── haAnalysis.ts    # Main HA analysis orchestrator
│   │   ├── maxscaleRouting.ts # MaxScale state and routing logic
│   │   └── networkSimulator.ts # Network partition simulation
│   ├── store/               # Zustand state management
│   │   └── topologyStore.ts # Global application state
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/               # Utility functions
│   │   └── fileUtils.ts     # Config save/load
│   ├── App.tsx              # Root component
│   └── main.tsx             # Application entry point
├── index.html               # HTML entry point
└── package.json            # Dependencies and scripts
```

## State Management

### Zustand Store (`topologyStore.ts`)

Single source of truth for application state. Key slices:

#### Topology State
```typescript
{
  name: string                    // Topology name
  clusterType: 'galera' | 'async' // Determines HA behavior
  physicalServers: PhysicalServer[]
  dbNodes: DBNode[]               // MariaDB instances
  maxscaleNodes: MaxScaleNode[]
  subnets: Subnet[]
  networkLinks: NetworkLink[]
}
```

#### Physical Servers
- Container for services (MariaDB, MaxScale)
- Has subnet placement
- Marking down affects all hosted services

#### DB Nodes (MariaDB)
- **Galera Mode**: Has `weight` for quorum calculation
- **Async Mode**: Has `role` (primary/replica)
- Placed on physical server (can share with MaxScale)

#### MaxScale Nodes
- **Galera Mode**: Only routing, no failover
- **Async Mode**: Cooperative monitoring with lock mode
- Placed on physical server (can share with MariaDB)

#### Network Links
- Connect subnets with `type` (LAN/WAN) and `latency`
- Used for reachability calculation in network partitions

## Analysis Engine Architecture

### Main Engine: `HAAnalysisEngine`

Orchestrates analysis by delegating to specialized engines:

```typescript
class HAAnalysisEngine {
  analyzeScenario(topology, failedNodes, failedLinks):
    1. NetworkSimulator → calculate reachability matrix
    2. GaleraQuorumEngine → determine primary/non-primary (Galera only)
    3. MaxScaleRoutingEngine → determine ACTIVE MaxScale and routing
    4. Generate recommendations
    5. Return AnalysisResult
}
```

### Network Simulator (`networkSimulator.ts`)

**Purpose**: Calculate which services can reach which services given failed nodes and network links.

**Algorithm**:
1. Build adjacency matrix of subnets via network links
2. Mark failed physical servers and their services as unreachable
3. For each link marked as failed, disconnect subnets
4. Use graph traversal to determine subnet-to-subnet reachability
5. Services can reach each other if:
   - Both are UP (not on failed physical servers)
   - Their subnets are connected (directly or transitively)

**Output**: `Map<ServiceId, Set<ServiceId>>` - reachability matrix

### Galera Quorum Engine (`galeraQuorum.ts`)

**Purpose**: Determine which Galera nodes are in Primary component.

**Algorithm**:
1. Filter out failed nodes
2. Group running nodes by reachable partition using network simulator
3. For each partition:
   - Calculate total weight: `sum(node.weight for node in partition)`
   - Calculate required quorum: `totalWeight / 2 + 1`
   - Check if partition weight ≥ quorum
4. Partition with quorum → Primary component (can write)
5. Other partitions → Non-primary (read-only)

**Key Limitation**: Does NOT simulate dynamic quorum recalculation (simulates simultaneous failures).

### MaxScale Routing Engine (`maxscaleRouting.ts`)

**Purpose**: Determine which MaxScale is ACTIVE and calculate routing capabilities.

**Algorithm**:

#### Galera Mode:
1. MaxScale can route if it can reach any Primary Galera node
2. No concept of ACTIVE/STANDBY (no cooperative monitoring)
3. All MaxScales route independently

#### Async Replication Mode:
1. Calculate which servers each MaxScale can reach
2. Determine lock holder based on `lockMode`:
   - `majority_of_all`: MaxScale that can reach ≥ (total_servers / 2 + 1)
   - `majority_of_running`: MaxScale that can reach ≥ (running_servers / 2 + 1)
3. MaxScale with most reachable servers → ACTIVE
4. Others → MONITORING ONLY
5. ACTIVE MaxScale can route if it can reach:
   - The primary (for writes)
   - At least one replica (for reads)

**Output**: 
- MaxScale state (ACTIVE/MONITORING ONLY)
- System availability (writes/reads possible)
- Routing destination (which DB nodes)

## Key Design Decisions

### 1. **Separation of Concerns**
- **UI Components**: Only render state, delegate actions to store
- **Store**: Manages state, dispatches to engines for analysis
- **Engines**: Pure functions, no side effects, highly testable

### 2. **Immutable State Updates**
- Zustand with Immer middleware for immutable updates
- Makes state changes predictable and debuggable

### 3. **Type Safety**
- Strict TypeScript for all code
- Discriminated unions for cluster types: `clusterType: 'galera' | 'async'`
- Prevents runtime errors, excellent IDE support

### 4. **Realistic Network Simulation**
- Explicit subnet modeling with network links
- Services communicate only within/between connected subnets
- Supports complex topologies (multi-datacenter, split-brain)

### 5. **Physical Server Abstraction**
- Services are placed ON physical servers IN subnets
- Allows modeling co-location (MariaDB + MaxScale on same hardware)
- Single failure can take down multiple services

### 6. **Worst-Case Analysis**
- Simultaneous failures (no dynamic quorum recalculation)
- Conservative recommendations
- User is informed about this limitation

### 7. **Configuration Persistence**
- JSON export/import for topology configurations
- Human-readable format for sharing and version control
- Includes all topology state (servers, nodes, network, settings)

## Data Flow

### Topology Building Flow
```
User Action (Add Node/Server/Link)
  ↓
Component calls store action
  ↓
Store updates state immutably
  ↓
React re-renders affected components
```

### Analysis Flow
```
User marks nodes/links as failed
  ↓
InteractiveScenarioBuilder updates local state
  ↓
Calls HAAnalysisEngine.analyzeScenario()
  ↓
Engine coordinates:
  - NetworkSimulator (reachability)
  - GaleraQuorumEngine (quorum)
  - MaxScaleRoutingEngine (routing)
  ↓
Returns AnalysisResult
  ↓
UI displays results in multiple panels
```

### Save/Load Flow
```
Save:
  User clicks "Save Configuration"
    ↓
  Extract topology state from store
    ↓
  Serialize to JSON with filename = topology.name
    ↓
  Trigger browser download

Load:
  User selects JSON file
    ↓
  Parse and validate structure
    ↓
  Store.importTopology() replaces state
    ↓
  UI re-renders with new topology
```

## Component Hierarchy

```
App
├── Layout
│   ├── Header
│   ├── TabNavigation
│   └── Main Content (route-based)
│       ├── TopologyView
│       │   ├── TopologyActions (Save/Load/Clear)
│       │   ├── TopologyInfo
│       │   ├── PhysicalServerList
│       │   ├── DBNodeList
│       │   ├── MaxScaleNodeList
│       │   ├── SubnetList
│       │   └── NetworkLinkList
│       ├── SettingsView
│       │   ├── GaleraNodeSettings
│       │   ├── AsyncNodeSettings
│       │   └── MaxScaleSettings
│       └── AnalysisView
│           └── InteractiveScenarioBuilder
│               ├── FailureControls (mark nodes/links down)
│               ├── AnalysisSummary
│               ├── GaleraStateVisualization
│               ├── AsyncReplicaStateVisualization
│               ├── MaxScaleStateVisualization
│               ├── NetworkStateVisualization
│               └── RecommendationsPanel
```

## Critical Algorithm Details

### Network Reachability (Floyd-Warshall inspired)

```typescript
// Build subnet connectivity matrix
for each networkLink:
  if link is not failed:
    matrix[link.subnet1][link.subnet2] = true
    matrix[link.subnet2][link.subnet1] = true

// Transitive closure
for k in subnets:
  for i in subnets:
    for j in subnets:
      if matrix[i][k] && matrix[k][j]:
        matrix[i][j] = true

// Check service reachability
service1 can reach service2 if:
  - Both services are UP
  - matrix[service1.subnet][service2.subnet] == true
```

### Galera Quorum with Partitioning

```typescript
// Group nodes by reachable partition
partitions = []
visited = set()

for each running_node:
  if node in visited: continue
  
  partition = [node]
  visited.add(node)
  
  for each other_node:
    if other_node in visited: continue
    if node.canReach(other_node):
      partition.add(other_node)
      visited.add(other_node)
  
  partitions.add(partition)

// Calculate quorum for each partition
for partition in partitions:
  weight = sum(n.weight for n in partition)
  totalWeight = sum(n.weight for n in all_configured_nodes)
  quorum = totalWeight / 2 + 1
  
  if weight >= quorum:
    partition.status = PRIMARY
  else:
    partition.status = NON_PRIMARY
```

### MaxScale Lock Holder (Async Mode)

```typescript
for each maxscale:
  reachable = count(dbNode where maxscale.canReach(dbNode))
  maxscale.reachableCount = reachable

if lockMode == 'majority_of_all':
  threshold = ceil(total_db_nodes / 2)
else: // majority_of_running
  threshold = ceil(running_db_nodes / 2)

candidates = maxscale where reachableCount >= threshold

if candidates.length == 0:
  all maxscale → MONITORING ONLY
else:
  activeMaxScale = maxOf(candidates, by: reachableCount)
  activeMaxScale.status = ACTIVE
  others.status = MONITORING ONLY
```

## Future Enhancement Paths

### 1. Dynamic Quorum Simulation
Add temporal dimension to simulate sequential failures with quorum recalculation between events.

### 2. Configuration Export
Generate actual MaxScale and Galera configuration files based on topology.

### 3. Advanced Failure Modes
- Slow nodes (high latency, not down)
- Partial connectivity (asymmetric network failures)
- Byzantine failures (corrupted data)

### 4. Performance Metrics
- Estimated query latency based on network topology
- Write throughput based on cluster size
- Read scaling based on replica count

### 5. Real-time Monitoring Integration
Connect to live clusters to visualize actual state vs. predicted behavior.

### 6. Multi-Region Topologies
Explicitly model geographic distribution with WAN latencies and regional failures.

### 7. Automated Testing
Parameterized failure scenario testing (e.g., "test all single-node failures").

## Development Guidelines

### Adding New Features

1. **Types First**: Define TypeScript interfaces in `src/types/index.ts`
2. **Store Actions**: Add state management to `topologyStore.ts`
3. **Engine Logic**: Implement analysis in appropriate engine file
4. **UI Components**: Build React components in relevant feature folder
5. **Integration**: Wire components to store with hooks

### Code Style

- **Functional Components**: Use React hooks, no class components
- **Immutability**: Never mutate state directly, use Immer
- **Pure Functions**: Engines should be pure (no side effects)
- **Naming**: Descriptive names, avoid abbreviations
- **Comments**: Only for complex algorithms or non-obvious decisions

### Testing Strategy

- **Unit Tests**: Engine logic (pure functions, easy to test)
- **Integration Tests**: Store actions and engine coordination
- **E2E Tests**: Critical user flows (create topology, analyze, save/load)

### Performance Considerations

- **Lazy Computation**: Analysis only runs when explicitly triggered
- **Memoization**: Cache analysis results until topology/failures change
- **Large Topologies**: Current design handles ~100 nodes efficiently
- **Future**: Consider Web Workers for heavy computations

## Common Pitfalls

1. **Forgetting Cluster Type**: Always check `clusterType` before accessing Galera-specific or Async-specific properties
2. **Service Co-location**: Remember that failing a physical server fails ALL its services
3. **Network Transitivity**: Two subnets can be connected through a third subnet
4. **Quorum Calculation**: Uses TOTAL weight (all configured nodes), not just running nodes
5. **MaxScale in Galera**: No cooperative monitoring, all MaxScales route independently

## Glossary

- **Primary Component**: Galera partition with quorum (can accept writes)
- **Non-Primary**: Galera partition without quorum (read-only)
- **Quorum**: Minimum weight needed to form primary component (`total_weight/2 + 1`)
- **Cooperative Monitoring**: MaxScale feature for async replication (only one ACTIVE)
- **Lock Mode**: How MaxScale determines which instance should be ACTIVE
- **Physical Server**: Virtual or bare-metal server hosting services
- **Service**: MariaDB or MaxScale instance
- **Subnet**: Network segment containing physical servers
- **Network Link**: Connection between subnets (can fail)
- **Split-Brain**: Network partition where multiple segments think they're primary

## References

- [MaxScale Cooperative Monitoring](https://mariadb.com/docs/maxscale/maxscale-archive/archive/mariadb-maxscale-24-02/maxscale-24-02monitors/mariadb-maxscale-2402-maxscale-2402-mariadb-monitor#cooperative-monitoring)
- [Galera Cluster Documentation](https://galeracluster.com/library/documentation/)
- [MariaDB Replication](https://mariadb.com/kb/en/standard-replication/)

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-04  
**Project Version**: 0.2.0
