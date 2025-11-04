import { useTopologyStore } from '../../store/topologyStore';

export function TopologyMetadataForm() {
  const topology = useTopologyStore((state) => state.topology);
  const setTopologyName = useTopologyStore((state) => state.setTopologyName);
  const setClusterType = useTopologyStore((state) => state.setClusterType);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Configuration Metadata</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configuration Name */}
        <div>
          <label htmlFor="config-name" className="block text-sm font-medium text-gray-700 mb-2">
            Configuration Name
          </label>
          <input
            id="config-name"
            type="text"
            value={topology.name}
            onChange={(e) => setTopologyName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter configuration name"
          />
        </div>

        {/* Cluster Type */}
        <div>
          <label htmlFor="cluster-type" className="block text-sm font-medium text-gray-700 mb-2">
            Cluster Type
          </label>
          <select
            id="cluster-type"
            value={topology.clusterType}
            onChange={(e) => setClusterType(e.target.value as 'galera' | 'async_replica')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="galera">Galera Cluster (Multi-Master)</option>
            <option value="async_replica">Async Replication (Primary-Replica)</option>
          </select>
          
          {/* Explanation */}
          <p className="mt-2 text-xs text-gray-600">
            {topology.clusterType === 'galera' ? (
              <>
                <strong>Galera Cluster:</strong> All nodes replicate from each other (multi-master). 
                MaxScale only performs routing. No cooperative monitoring needed - Galera handles quorum internally via node weights.
              </>
            ) : (
              <>
                <strong>Async Replication:</strong> One primary node with multiple replicas. 
                MaxScale uses cooperative monitoring to manage failover between primary and replicas.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
