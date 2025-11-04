import { useState } from 'react';
import type { MaxScaleNode } from '../../types';
import { useTopologyStore } from '../../store/topologyStore';

interface MaxScaleNodeSettingsProps {
  node: MaxScaleNode;
}

export function MaxScaleNodeSettings({ node }: MaxScaleNodeSettingsProps) {
  const updateMaxScaleNode = useTopologyStore((state) => state.updateMaxScaleNode);
  const [isEditing, setIsEditing] = useState(false);
  const [lockType, setLockType] = useState(node.settings.cooperativeMonitoringLocks || 'none');

  const handleSave = () => {
    updateMaxScaleNode(node.id, {
      ...node,
      settings: {
        ...node.settings,
        cooperativeMonitoringLocks: lockType === 'none' ? undefined : lockType as 'majority_of_all' | 'majority_of_running',
      },
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLockType(node.settings.cooperativeMonitoringLocks || 'none');
    setIsEditing(false);
  };

  const getLockLabel = (type: string) => {
    switch (type) {
      case 'majority_of_all': return 'Majority of All';
      case 'majority_of_running': return 'Majority of Running';
      case 'none': return 'None (independent)';
      default: return type;
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
        <span>
          Locks: <span className="font-medium text-gray-900">
            {getLockLabel(node.settings.cooperativeMonitoringLocks || 'none')}
          </span>
        </span>
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
    <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded space-y-2">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Cooperative Monitoring Locks
        </label>
        <select
          value={lockType}
          onChange={(e) => setLockType(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
        >
          <option value="none">None (independent monitoring)</option>
          <option value="majority_of_all">Majority of All</option>
          <option value="majority_of_running">Majority of Running</option>
        </select>
        
        <div className="mt-2 text-xs text-gray-600 space-y-1">
          {lockType === 'none' && (
            <p>• All MaxScale instances monitor independently</p>
          )}
          {lockType === 'majority_of_all' && (
            <>
              <p>• Requires majority of ALL instances running</p>
              <p>• One instance gets lock to manage cluster</p>
            </>
          )}
          {lockType === 'majority_of_running' && (
            <>
              <p>• Always has majority (by definition)</p>
              <p>• One instance gets lock to manage cluster</p>
            </>
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
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
