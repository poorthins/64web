import React from 'react';

interface ChangeIndicatorProps {
  originalValue: any;
  currentValue: any;
  label: string;
  className?: string;
}

export const ChangeIndicator: React.FC<ChangeIndicatorProps> = ({
  originalValue,
  currentValue,
  label,
  className = ''
}) => {
  const hasChanged = JSON.stringify(originalValue) !== JSON.stringify(currentValue);

  if (!hasChanged) {
    return null;
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(空)';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? '是' : '否';
    return String(value);
  };

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-start space-x-2">
        <span className="text-yellow-600 text-sm">🔄</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-yellow-800 mb-1">
            {label} 已變更
          </div>

          <div className="text-xs space-y-1">
            <div className="flex items-center">
              <span className="text-gray-500 mr-2 w-8">原值:</span>
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs truncate max-w-xs">
                {formatValue(originalValue)}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-500 mr-2 w-8">新值:</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs truncate max-w-xs">
                {formatValue(currentValue)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ChangeSummaryProps {
  changes: { [key: string]: { original: any; current: any; label: string } };
  className?: string;
}

export const ChangeSummary: React.FC<ChangeSummaryProps> = ({
  changes,
  className = ''
}) => {
  const changeCount = Object.keys(changes).length;

  if (changeCount === 0) {
    return null;
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center mb-3">
        <span className="text-blue-600 mr-2">📝</span>
        <h3 className="text-sm font-medium text-blue-900">
          變更摘要 ({changeCount} 項變更)
        </h3>
      </div>

      <div className="space-y-2">
        {Object.entries(changes).map(([key, change]) => (
          <ChangeIndicator
            key={key}
            originalValue={change.original}
            currentValue={change.current}
            label={change.label}
          />
        ))}
      </div>
    </div>
  );
};