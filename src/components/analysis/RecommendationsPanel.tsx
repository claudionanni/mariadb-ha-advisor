interface RecommendationsPanelProps {
  recommendations?: string[];
}

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  const getSeverity = (text: string): 'critical' | 'warning' | 'info' | 'success' => {
    const lower = text.toLowerCase();
    if (lower.includes('critical') || lower.includes('split-brain')) return 'critical';
    if (lower.includes('down') || lower.includes('cannot') || lower.includes('no ')) return 'warning';
    if (lower.includes('monitor') || lower.includes('review')) return 'info';
    return 'success';
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      default: return '💡';
    }
  };

  const getColorClasses = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-300 text-red-900';
      case 'warning': return 'bg-yellow-50 border-yellow-300 text-yellow-900';
      case 'info': return 'bg-blue-50 border-blue-300 text-blue-900';
      case 'success': return 'bg-green-50 border-green-300 text-green-900';
      default: return 'bg-gray-50 border-gray-300 text-gray-900';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
        <span>💡</span>
        Recommendations
      </h4>

      <div className="space-y-2">
        {recommendations?.map((rec, index) => {
          const severity = getSeverity(rec);
          const icon = getIcon(severity);
          const colorClasses = getColorClasses(severity);

          return (
            <div
              key={index}
              className={`p-3 rounded-lg border ${colorClasses}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg flex-shrink-0">{icon}</span>
                <div className="flex-1 text-sm">{rec}</div>
              </div>
            </div>
          );
        })}
      </div>

      {(!recommendations || recommendations.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No recommendations at this time</p>
        </div>
      )}
    </div>
  );
}
