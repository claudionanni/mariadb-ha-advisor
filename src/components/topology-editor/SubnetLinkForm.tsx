import { useState } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import type { SubnetLink, LinkType } from '../../types';

interface SubnetLinkFormProps {
  onCancel?: () => void;
  editingLink?: SubnetLink;
}

export function SubnetLinkForm({ onCancel, editingLink }: SubnetLinkFormProps) {
  const subnets = useTopologyStore((state) => state.topology.subnets);
  const subnetLinks = useTopologyStore((state) => state.topology.subnetLinks);
  const addSubnetLink = useTopologyStore((state) => state.addSubnetLink);
  const updateSubnetLink = useTopologyStore((state) => state.updateSubnetLink);
  
  const [subnet1Id, setSubnet1Id] = useState(editingLink?.subnet1Id || '');
  const [subnet2Id, setSubnet2Id] = useState(editingLink?.subnet2Id || '');
  const [linkType, setLinkType] = useState<LinkType>(editingLink?.linkType || 'lan');
  const [latency, setLatency] = useState(editingLink?.latencyMs?.toString() || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!subnet1Id || !subnet2Id) {
      setError('Please select both subnets');
      return;
    }

    if (subnet1Id === subnet2Id) {
      setError('Cannot link a subnet to itself');
      return;
    }

    // Check for duplicate link
    const linkExists = subnetLinks.some(link => 
      link.id !== editingLink?.id &&
      ((link.subnet1Id === subnet1Id && link.subnet2Id === subnet2Id) ||
       (link.subnet1Id === subnet2Id && link.subnet2Id === subnet1Id))
    );

    if (linkExists) {
      setError('A link between these subnets already exists');
      return;
    }

    if (latency) {
      const latencyNum = parseInt(latency, 10);
      if (isNaN(latencyNum) || latencyNum < 0) {
        setError('Latency must be a non-negative number');
        return;
      }
    }

    const linkData: SubnetLink = {
      id: editingLink?.id || `link-${Date.now()}`,
      subnet1Id,
      subnet2Id,
      linkType,
      latencyMs: latency ? parseInt(latency, 10) : undefined,
    };

    if (editingLink) {
      updateSubnetLink(editingLink.id, linkData);
    } else {
      addSubnetLink(linkData);
    }

    // Reset form
    setSubnet1Id('');
    setSubnet2Id('');
    setLinkType('lan');
    setLatency('');
    
    if (onCancel) onCancel();
  };

  if (subnets.length < 2) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          ⚠️ You need at least 2 subnets to create links between them.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium mb-4">
        {editingLink ? 'Edit Subnet Link' : 'Add Subnet Link'}
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="link-subnet1" className="block text-sm font-medium text-gray-700 mb-1">
            First Subnet *
          </label>
          <select
            id="link-subnet1"
            value={subnet1Id}
            onChange={(e) => setSubnet1Id(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select first subnet...</option>
            {subnets.map((subnet) => (
              <option key={subnet.id} value={subnet.id}>
                {subnet.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="link-subnet2" className="block text-sm font-medium text-gray-700 mb-1">
            Second Subnet *
          </label>
          <select
            id="link-subnet2"
            value={subnet2Id}
            onChange={(e) => setSubnet2Id(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select second subnet...</option>
            {subnets.filter(s => s.id !== subnet1Id).map((subnet) => (
              <option key={subnet.id} value={subnet.id}>
                {subnet.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="link-type" className="block text-sm font-medium text-gray-700 mb-1">
            Link Type *
          </label>
          <select
            id="link-type"
            value={linkType}
            onChange={(e) => setLinkType(e.target.value as LinkType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="lan">LAN (Local Network)</option>
            <option value="wan">WAN (Wide Area Network)</option>
          </select>
        </div>

        <div>
          <label htmlFor="link-latency" className="block text-sm font-medium text-gray-700 mb-1">
            Latency (ms)
          </label>
          <input
            id="link-latency"
            type="number"
            value={latency}
            onChange={(e) => setLatency(e.target.value)}
            placeholder={linkType === 'wan' ? 'e.g., 50' : 'e.g., 1'}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            {linkType === 'wan' 
              ? 'Typical WAN latency: 10-100ms+ depending on distance' 
              : 'Typical LAN latency: <1ms (leave empty for default)'}
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {editingLink ? 'Update Link' : 'Add Link'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
