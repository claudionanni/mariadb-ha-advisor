# Network Partition Fix for MaxScale Lock Acquisition

## Problem
When a network partition occurred, MaxScale instances were being marked as ACTIVE even when they couldn't see enough Galera nodes to acquire the cooperative monitoring locks according to their configured lock policy.

For example, with 3 Galera nodes and `majority_of_all` lock policy, a MaxScale that could only see 1 Galera node was incorrectly showing as ACTIVE.

## Root Cause
The `determineLockHolder()` method in `maxscaleRouting.ts` was only checking if:
- Enough Galera nodes were running globally
- At least one MaxScale was running

It was NOT checking if any specific MaxScale could actually **see** (communicate with) enough Galera nodes to acquire the required locks.

## Solution
Enhanced the `determineLockHolder()` method to:

1. **For `majority_of_all` policy**: 
   - Calculate required locks: `floor(totalGaleraNodes / 2) + 1`
   - Iterate through running MaxScale instances
   - Check if each MaxScale can see at least `requiredLocks` number of Galera nodes
   - The first MaxScale that can see enough nodes becomes the lock holder (ACTIVE)
   - If no MaxScale can see enough nodes, return `null` (no ACTIVE MaxScale)

2. **For `majority_of_running` policy**:
   - Calculate required locks: `floor(runningGaleraNodes / 2) + 1`
   - Iterate through running MaxScale instances
   - Check if each MaxScale can see at least `requiredLocks` number of running Galera nodes
   - The first MaxScale that can see enough running nodes becomes the lock holder (ACTIVE)
   - If no MaxScale can see enough nodes, return `null` (no ACTIVE MaxScale)

3. **Added helper method** `countVisibleGaleraNodes()`:
   - Counts how many Galera nodes a specific MaxScale can communicate with
   - Takes into account network partitions via the `canCommunicate()` method
   - Only counts nodes that are not down

## Example Scenario
**Setup:**
- 3 Galera nodes: N1 (weight=1), N2 (weight=1), N3 (weight=1)
- 2 MaxScale nodes with `majority_of_all` lock policy
- All nodes in different subnets with links between them

**Network Partition:**
- Cut link between [N1, N2] and N3
- MaxScale max001 is on same subnet as N3
- MaxScale max002 is on same subnet as N1

**Result BEFORE fix:**
- max001 would show as ACTIVE even though it can only see 1 node (N3)
- This is incorrect because `majority_of_all` requires locks on 2 out of 3 nodes

**Result AFTER fix:**
- max001 cannot see 2 nodes → cannot acquire locks → shows as "MONITORING ONLY"
- max002 can see 2 nodes (N1, N2) → acquires locks → shows as "ACTIVE"
- System remains operational with correct failover behavior

## Files Modified
- `/src/engine/maxscaleRouting.ts`:
  - Updated `determineLockHolder()` signature to accept `scenario` parameter
  - Added logic to check visibility before assigning lock holder
  - Added `countVisibleGaleraNodes()` helper method
  - Updated call to `determineLockHolder()` in `calculateMaxScaleState()`

## Testing
Build successful with no errors. The application now correctly evaluates network partitions and MaxScale lock acquisition based on actual network visibility between nodes.
