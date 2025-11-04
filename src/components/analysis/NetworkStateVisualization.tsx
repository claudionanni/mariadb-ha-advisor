import { useTopologyStore } from '../../store/topologyStore';

interface NetworkStateVisualizationProps {
  failedNodes: Set<string>;
  failedLinks: Set<string>;
  onToggleLinkFailure: (linkId: string) => void;
}

export function NetworkStateVisualization({ 
  failedNodes, 
  failedLinks,
  onToggleLinkFailure 
}: NetworkStateVisualizationProps) {
  const topology = useTopologyStore((state) => state.topology);
  const { subnets, subnetLinks, servers } = topology;

  // Count servers per subnet
  const getSubnetServerCount = (subnetId: string) => {
    return servers.filter(s => s.subnetId === subnetId).length;
  };

  // Count failed servers per subnet
  const getSubnetFailedCount = (subnetId: string) => {
    const subnetServers = servers.filter(s => s.subnetId === subnetId);
    const galeraNodes = topology.galeraNodes.filter(n => 
      subnetServers.some(s => s.id === n.serverId) && failedNodes.has(n.id)
    );
    const maxscaleNodes = topology.maxscaleNodes.filter(n => 
      subnetServers.some(s => s.id === n.serverId) && failedNodes.has(n.id)
    );
    return galeraNodes.length + maxscaleNodes.length;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">🌐 Network Topology</h3>
      
      {/* Subnets */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Subnets</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {subnets.map((subnet) => {
            const totalServers = getSubnetServerCount(subnet.id);
            const failedServers = getSubnetFailedCount(subnet.id);
            const isHealthy = failedServers === 0;
            const isDegraded = failedServers > 0 && failedServers < totalServers;
            const isFailed = failedServers === totalServers;
            
            return (
              <div
                key={subnet.id}
                className={`p-3 rounded-lg border-2 ${
                  isFailed
                    ? 'border-red-300 bg-red-50'
                    : isDegraded
                    ? 'border-yellow-300 bg-yellow-50'
                    : 'border-blue-300 bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">
                    {isFailed ? '🔴' : isDegraded ? '🟡' : '🔵'}
                  </span>
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {subnet.name}
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  Servers: {totalServers - failedServers}/{totalServers} up
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subnet Links */}
      {subnetLinks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Subnet Links</h4>
          <div className="space-y-2">
            {subnetLinks.map((link) => {
              const subnet1 = subnets.find(s => s.id === link.subnet1Id);
              const subnet2 = subnets.find(s => s.id === link.subnet2Id);
              const isDown = failedLinks.has(link.id);
              
              return (
                <div
                  key={link.id}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                    isDown
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-lg">{isDown ? '🔴' : '🔗'}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {subnet1?.name} ↔ {subnet2?.name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {link.linkType.toUpperCase()}
                        {link.latencyMs && ` • ${link.latencyMs}ms latency`}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onToggleLinkFailure(link.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      isDown
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {isDown ? 'Restore' : 'Cut'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subnetLinks.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <p className="text-sm">No subnet links configured</p>
          <p className="text-xs mt-1">All subnets are isolated</p>
        </div>
      )}
    </div>
  );
}
