import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  height?: string;
  width?: string;
  rounded?: boolean;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  height = 'h-4',
  width = 'w-full',
  rounded = true
}) => {
  return (
    <div
      className={`
        ${height} ${width} ${rounded ? 'rounded' : ''}
        bg-gray-200 animate-pulse
        ${className}
      `}
    />
  );
};

export const StatsCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <LoadingSkeleton height="h-5" width="w-20" className="mb-2" />
        <LoadingSkeleton height="h-8" width="w-16" />
      </div>
      <LoadingSkeleton height="h-10" width="w-10" rounded={false} />
    </div>
  </div>
);

export const UserCardSkeleton: React.FC = () => (
  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center">
        <LoadingSkeleton height="h-10" width="w-10" rounded={false} className="mr-3" />
        <div>
          <LoadingSkeleton height="h-5" width="w-24" className="mb-1" />
          <LoadingSkeleton height="h-4" width="w-32" />
        </div>
      </div>
      <LoadingSkeleton height="h-6" width="w-16" />
    </div>

    <div className="space-y-2 mb-4">
      <div className="flex items-center">
        <LoadingSkeleton height="h-4" width="w-4" className="mr-2" />
        <LoadingSkeleton height="h-4" width="w-28" />
      </div>
      <div className="flex items-center">
        <LoadingSkeleton height="h-4" width="w-4" className="mr-2" />
        <LoadingSkeleton height="h-4" width="w-20" />
      </div>
      <div className="flex items-center">
        <LoadingSkeleton height="h-4" width="w-4" className="mr-2" />
        <LoadingSkeleton height="h-4" width="w-24" />
      </div>
    </div>

    <div className="flex space-x-2">
      <LoadingSkeleton height="h-8" width="w-16" />
      <LoadingSkeleton height="h-8" width="w-16" />
    </div>
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50 p-6">
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <LoadingSkeleton height="h-8" width="w-64" className="mb-2" />
        <LoadingSkeleton height="h-5" width="w-48" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <LoadingSkeleton height="h-6" width="w-32" />
            <LoadingSkeleton height="h-10" width="w-24" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-4">
            <div className="lg:col-span-3">
              <LoadingSkeleton height="h-10" />
            </div>
            <div className="lg:col-span-1">
              <LoadingSkeleton height="h-10" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <UserCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`inline-block ${sizeClasses[size]} ${className}`}>
      <div className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 h-full w-full"></div>
    </div>
  );
};