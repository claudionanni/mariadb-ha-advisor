import { useState } from 'react';
import type { GaleraNode } from '../../types';
import { useTopologyStore } from '../../store/topologyStore';

interface GaleraNodeSettingsProps {
  node: GaleraNode;
}

export function GaleraNodeSettings({ node }: GaleraNodeSettingsProps) {
  const updateGaleraNode = useTopologyStore((state) => state.updateGaleraNode);
  const clusterType = useTopologyStore((state) => state.topology.clusterType);
  const [isEditing, setIsEditing] = useState(false);
  const [weight, setWeight] = useState(node.settings.pcWeight.toString());

  const handleSave = () => {
    const newWeight = parseInt(weight);
    if (isNaN(newWeight) || newWeight < 0) {
      alert('Weight must be a positive number');
      return;
    }

    updateGaleraNode(node.id, {
      ...node,
      settings: {
        ...node.settings,
        pcWeight: newWeight,
      },
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setWeight(node.settings.pcWeight.toString());
    setIsEditing(false);
  };

  // For async replica clusters, weight is not relevant (only 1 primary + N replicas)
  if (clusterType === 'async_replica') {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
        <span className="italic">
          Primary/Replica (no quorum weight)
        </span>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
        <span>Weight: <span className="font-medium text-gray-900">{node.settings.pcWeight}</span></span>
        <button
          onClick={() => setIsEditing(true)}
          className="text-blue-600 hover:text-blue-700"
          title="Edit settings"
        >
          ⚙️
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded space-y-2">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Quorum Weight (pc.weight)
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
          />
          <input
            type="range"
            min="0"
            max="10"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="flex-1"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Higher weight = more influence in quorum
        </p>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
