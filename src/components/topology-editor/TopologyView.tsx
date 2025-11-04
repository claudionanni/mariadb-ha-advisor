export function TopologyView() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Topology Builder</h2>
      <div className="text-gray-600">
        <p className="mb-4">Define your infrastructure topology:</p>
        <ol className="list-decimal list-inside space-y-2">
          <li>Define subnets and network segments (LAN/WAN)</li>
          <li>Add servers (physical or virtual)</li>
          <li>Place Galera database nodes</li>
          <li>Place MaxScale proxy nodes</li>
        </ol>
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            🚧 Topology editor will be implemented here
          </p>
        </div>
      </div>
    </div>
  );
}
