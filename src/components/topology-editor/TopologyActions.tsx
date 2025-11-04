import { useState } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import { exportTopologyToFile, importTopologyFromFile, generateFilename } from '../../utils/fileUtils';

export function TopologyActions() {
  const topology = useTopologyStore((state) => state.topology);
  const loadTopology = useTopologyStore((state) => state.loadTopology);
  const resetTopology = useTopologyStore((state) => state.resetTopology);
  const [error, setError] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleExport = () => {
    try {
      const filename = generateFilename(topology.name);
      exportTopologyToFile(topology, filename);
      setError('');
    } catch (err) {
      setError('Failed to export topology');
      console.error(err);
    }
  };

  const handleImport = async () => {
    try {
      const importedTopology = await importTopologyFromFile();
      loadTopology(importedTopology);
      setError('');
      alert('Topology loaded successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import topology');
      console.error(err);
    }
  };

  const handleReset = () => {
    if (showConfirmReset) {
      resetTopology();
      setShowConfirmReset(false);
      setError('');
    } else {
      setShowConfirmReset(true);
      setTimeout(() => setShowConfirmReset(false), 3000);
    }
  };

  const hasContent = 
    (topology?.subnets?.length || 0) > 0 || 
    (topology?.servers?.length || 0) > 0 || 
    (topology?.databaseNodes?.length || 0) > 0 || 
    (topology?.maxscaleNodes?.length || 0) > 0;

  return (
    <div className="flex items-center gap-2">
      {error && (
        <div className="mr-2 px-3 py-1 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <button
        onClick={handleImport}
        className="px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Load
      </button>

      <button
        onClick={handleExport}
        disabled={!hasContent}
        className="px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
        Save
      </button>

      {hasContent && (
        <button
          onClick={handleReset}
          className={`px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 text-sm ${
            showConfirmReset
              ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500'
          }`}
        >
          {showConfirmReset ? 'Confirm Reset' : 'Reset'}
        </button>
      )}
    </div>
  );
}
