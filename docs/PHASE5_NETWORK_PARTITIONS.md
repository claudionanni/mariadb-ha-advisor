# Phase 5 Updates: Network Partition Analysis Implementation

## Summary
Implemented comprehensive network partition analysis that correctly models:
1. Galera cluster behavior during network splits (quorum calculation, primary component selection)
2. MaxScale routing and failover behavior during network partitions
3. Cooperative monitoring lock mechanism for MaxScale instances
4. Visual representation of network topology and link failures

## Key Features Implemented

### 1. Network Partition Detection
- **Link-based partitioning**: When subnet links are cut, nodes are grouped into separate partitions
- **Connectivity graph**: Built using DFS to identify which nodes can communicate with each other
- **Multi-subnet support**: Handles complex topologies with multiple datacenters/subnets

### 2. Galera Cluster Analysis
- **Quorum calculation**: Correctly calculates total weight and required quorum (floor(total/2) + 1)
- **Primary component selection**: Only one partition with majority weight becomes primary
- **Split-brain detection**: Identifies when multiple partitions incorrectly think they have quorum
- **Node states**:
  - `primary`: Node in primary component, can accept writes and reads
  - `non-primary`: Node in minority partition, can only serve reads (stale data)
  - `down`: Node explicitly failed

### 3. MaxScale Routing Engine
- **Cooperative monitoring locks**: 
  - `majority_of_all`: MaxScale must acquire locks on majority of ALL configured Galera nodes
  - `majority_of_running`: MaxScale must acquire locks on majority of RUNNING Galera nodes
  - Only ONE MaxScale holds locks at any time (prevents conflicts)
  - Automatic failover: When active MaxScale goes down, another running instance automatically acquires locks

- **Visibility tracking**: Each MaxScale tracks which Galera nodes it can see across the network
- **Routing decisions**: 
  - Can route if: (1) has cooperative lock OR no locking configured, AND (2) can see Galera nodes
  - Active MaxScale is marked with `ACTIVE` badge and lock indicator

### 4. Server-Level Failures
- **Physical/Virtual server abstraction**: Servers can host multiple services (Galera + MaxScale)
- **Cascade failures**: Marking a server as down automatically marks all services on it as down
- **Service co-location**: Supports MaxScale and Galera running on the same physical server

### 5. Interactive Scenario Builder
Enhanced with:
- **Network topology visualization**: Shows subnets, servers, and inter-subnet links
- **Link failure simulation**: Click to cut/restore network links between subnets
- **Server failure simulation**: Mark entire servers down (affects all services on them)
- **Node failure simulation**: Individual service failures
- **Real-time analysis**: Updates automatically as you change the failure state
- **Visual feedback**: Color-coded states (green=healthy, yellow=degraded, red=failed)

### 6. Analysis Results Display
- **Galera State Visualization**:
  - Total/quorum/running weight display
  - Primary component identification
  - Partition information
  - Individual node states with W (write) and R (read) indicators
  - Split-brain warnings

- **MaxScale State Visualization**:
  - Active instance identification with `ACTIVE` badge and lock icon
  - Cooperative monitoring mode display
  - Visible Galera nodes per MaxScale
  - ROUTING vs MONITORING ONLY states

- **Recommendations Panel**: Context-aware suggestions for HA improvements

## Engine Architecture

### GaleraQuorumEngine
```
calculateClusterState(scenario)
  → identifyPartitions(scenario)
    → buildConnectivityGraph(scenario)
      → canCommunicate(node1, node2, scenario)
        → hasNetworkPath(subnet1, subnet2, scenario)
  → selectPrimaryPartition(partitions, totalWeight)
  → detectSplitBrain(partitions, totalWeight)
```

### MaxScaleRoutingEngine
```
calculateMaxScaleState(scenario, galeraState)
  → determineLockHolder(runningMaxScale, totalMaxScale, galeraState)
  → getVisibleGaleraNodes(maxscaleNode, scenario, galeraState)
    → canCommunicate(maxscaleNode, galeraNode, scenario)
      → hasNetworkPath(subnet1, subnet2, scenario)
```

### HAAnalysisEngine
```
analyzeScenario(scenario)
  → galeraEngine.calculateClusterState(scenario)
  → maxscaleEngine.calculateMaxScaleState(scenario, galeraState)
  → maxscaleEngine.calculateSystemAvailability(galeraState, maxscaleStates)
  → generateSummary()
  → generateRecommendations()
```

## Test Coverage

Created comprehensive test suite (`tests/networkPartition.test.ts`) covering:

1. **Basic network partition**: 3-node cluster split 2+1, verifies quorum behavior
2. **MaxScale partition behavior**: MaxScale connectivity and routing during network splits
3. **MaxScale failover**: Automatic takeover when active instance fails
4. **Split-brain scenario**: Equal weight partitions (2+2) - no quorum for either side

All tests pass ✅

## Example Scenarios

### Scenario 1: WAN Link Failure
**Setup**: 3 Galera nodes (2 in DC1, 1 in DC2), weights 1-1-1
**Failure**: Cut WAN link between DC1 and DC2
**Result**:
- Partition 1 (DC1): N1+N2, weight=2, **PRIMARY** ✅
- Partition 2 (DC2): N3, weight=1, **NON-PRIMARY** ❌
- System can accept writes via DC1 nodes

### Scenario 2: MaxScale Failover
**Setup**: 2 MaxScale (both in DC1), 3 Galera nodes, `majority_of_all` locking
**Failure**: MaxScale1 goes down
**Result**:
- MaxScale1: **DOWN** ❌
- MaxScale2: Automatically acquires locks, becomes **ACTIVE** ✅
- System remains fully operational for reads and writes

### Scenario 3: Split Brain (Misconfigured)
**Setup**: 4 Galera nodes (2 in DC1, 2 in DC2), weights 1-1-1-1
**Failure**: Cut WAN link
**Result**:
- Partition 1 (DC1): weight=2, **NO QUORUM** ❌
- Partition 2 (DC2): weight=2, **NO QUORUM** ❌
- Total weight=4, quorum needed=3
- **System unavailable for writes**
- Recommendation: Adjust weights to 2-1-1-1 or add arbiter node

## Technical Details

### Network Connectivity Algorithm
1. Build adjacency graph of all nodes
2. For each node pair, check if they can communicate:
   - Same subnet: Connected unless subnet has network failure
   - Different subnets: Check if direct link exists and is not failed
3. Use DFS to find connected components (partitions)
4. Calculate weight per partition
5. Select primary partition based on quorum rules

### Cooperative Monitoring
- MaxScale uses `SELECT GET_LOCK('maxscale_lock_N', timeout)` on each Galera backend
- The instance that successfully acquires locks on the majority becomes ACTIVE
- Lock holder actively manages cluster (sets server states, handles failover)
- Other instances remain in MONITORING ONLY mode
- When active instance fails, locks are automatically released and another instance takes over

### Weight-Based Quorum
- Quorum = floor(total_weight / 2) + 1
- Example: weights [1,1,1] → total=3, quorum=2
- Example: weights [1,1,1,1] → total=4, quorum=3
- Example: weights [2,1,1] → total=4, quorum=3 (DC1 with weight=2 needs one more node)

## UI Components Modified

1. **InteractiveScenarioBuilder.tsx**: 
   - Added server-level failure handling
   - Integrated network link failures
   - Automatic cascade of failures (server down → services down)

2. **NetworkStateVisualization.tsx**: 
   - Displays subnets with server counts
   - Shows inter-subnet links with Cut/Restore buttons
   - Visual health indicators

3. **GaleraStateVisualization.tsx**: 
   - Added null-safety checks
   - Enhanced partition display
   - Improved node state indicators

4. **MaxScaleStateVisualization.tsx**:
   - Added null-safety checks
   - Prominent ACTIVE badge for lock holder
   - Visible Galera nodes display

## Configuration Storage

The topology including subnets, servers, nodes, and links can be saved/loaded via:
- **Save**: Exports complete topology to JSON file
- **Load**: Imports previously saved configuration
- **Format**: Standard JSON with all relationships preserved

## Next Steps (Future Phases)

### Option A: Advanced Failure Modes
- [ ] Node unresponsive (responds to ping but not Galera protocol)
- [ ] Partial network failure (asymmetric reachability)
- [ ] Slow network (high latency impact on quorum decisions)
- [ ] Flapping nodes (intermittent failures)

### Option B: Configuration Generation
- [ ] Generate MaxScale configuration files
- [ ] Generate Galera configuration snippets
- [ ] Docker compose files for testing
- [ ] Ansible playbooks for deployment

### Option C: Advanced Analysis
- [ ] Batch scenario testing (all single-node failures, all link failures, etc.)
- [ ] Resilience scoring (percentage of scenarios that maintain HA)
- [ ] MTTR calculation (mean time to recovery)
- [ ] Availability SLA calculation (9s of availability)
- [ ] Cost analysis (resources needed for desired HA level)

## Files Changed

### Modified
- `src/engine/galeraQuorum.ts` - Enhanced partition detection and quorum logic
- `src/engine/maxscaleRouting.ts` - Cooperative monitoring implementation
- `src/engine/haAnalysis.ts` - Integrated analysis with better recommendations
- `src/components/analysis/InteractiveScenarioBuilder.tsx` - Server failures and link cutting
- `src/components/analysis/GaleraStateVisualization.tsx` - Null-safety and display improvements
- `src/components/analysis/MaxScaleStateVisualization.tsx` - Lock holder display
- `src/components/topology-editor/MaxScaleNodeForm.tsx` - Lock mode selection
- `src/types/index.ts` - Enhanced type definitions

### Created
- `src/components/analysis/NetworkStateVisualization.tsx` - Network topology display
- `tests/networkPartition.test.ts` - Comprehensive test suite

## Verification

✅ All tests pass (4/4 network partition scenarios)
✅ Dev server runs without errors
✅ Interactive UI allows real-time failure simulation
✅ Analysis correctly models Galera and MaxScale behavior
✅ Recommendations provide actionable insights

## Known Limitations

1. **No asymmetric failures**: Currently assumes if A can reach B, then B can reach A
2. **No latency impact**: Link latency is tracked but doesn't affect quorum timing
3. **Simplified lock model**: Real MaxScale lock acquisition is more complex
4. **No write-set replication**: Doesn't model Galera's flow control or certification failures
5. **No load balancing**: Doesn't model query distribution across nodes

These limitations are acceptable for a high-level HA analysis tool focused on topology and failure scenarios.
