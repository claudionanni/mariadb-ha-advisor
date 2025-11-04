import type { AnalysisResult } from '../../types';

interface AnalysisResultCardProps {
  result: AnalysisResult;
}

export function AnalysisResultCard({ result }: AnalysisResultCardProps) {
  const { systemAvailability, summary } = result;
  
  const isOperational = systemAvailability.canAcceptWrites;
  const canRead = systemAvailability.canAcceptReads;

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`p-4 ${
        isOperational 
          ? 'bg-green-50 border-b-2 border-green-200' 
          : 'bg-red-50 border-b-2 border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`text-3xl ${isOperational ? 'text-green-600' : 'text-red-600'}`}>
              {isOperational ? '✅' : '❌'}
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${
                isOperational ? 'text-green-900' : 'text-red-900'
              }`}>
                {isOperational ? 'System Operational' : 'System Degraded'}
              </h3>
              <p className={`text-sm ${
                isOperational ? 'text-green-700' : 'text-red-700'
              }`}>
                {isOperational 
                  ? 'Cluster can accept writes and reads' 
                  : canRead 
                    ? 'Read-only mode - writes unavailable'
                    : 'System unavailable - no reads or writes'}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {new Date(result.timestamp).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 border-b border-gray-200">
        <div className="text-center">
          <div className={`text-2xl font-bold ${
            systemAvailability.canAcceptWrites ? 'text-green-600' : 'text-red-600'
          }`}>
            {systemAvailability.canAcceptWrites ? '✓' : '✗'}
          </div>
          <div className="text-xs text-gray-600 mt-1">Writes</div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl font-bold ${
            systemAvailability.canAcceptReads ? 'text-green-600' : 'text-red-600'
          }`}>
            {systemAvailability.canAcceptReads ? '✓' : '✗'}
          </div>
          <div className="text-xs text-gray-600 mt-1">Reads</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {systemAvailability.operationalGaleraNodes}
          </div>
          <div className="text-xs text-gray-600 mt-1">Galera Nodes</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {systemAvailability.operationalMaxScales}
          </div>
          <div className="text-xs text-gray-600 mt-1">MaxScale Nodes</div>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4">
        <h4 className="font-medium text-gray-900 mb-2">Analysis Summary</h4>
        <div className="text-sm text-gray-700 whitespace-pre-line font-mono bg-gray-50 p-3 rounded">
          {summary}
        </div>
      </div>
    </div>
  );
}
