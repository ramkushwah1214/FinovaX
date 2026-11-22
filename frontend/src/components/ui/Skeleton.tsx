import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height
}) => {
  const variantClass =
    variant === 'circular'
      ? 'rounded-full'
      : variant === 'text'
      ? 'rounded-md h-4'
      : 'rounded-xl';

  return (
    <div
      className={`animate-pulse bg-slate-200/80 dark:bg-slate-800/80 ${variantClass} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
      aria-hidden="true"
    />
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-5 rounded-2xl bg-white dark:bg-[#101A2D] border border-slate-200/80 dark:border-slate-800/80 space-y-3 ${className}`}>
    <div className="flex items-center justify-between">
      <Skeleton variant="text" className="w-24 h-4" />
      <Skeleton variant="circular" className="w-8 h-8" />
    </div>
    <Skeleton variant="text" className="w-36 h-7" />
    <Skeleton variant="text" className="w-28 h-3.5" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-3 p-4">
    <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
      <Skeleton variant="text" className="w-1/4 h-4" />
      <Skeleton variant="text" className="w-1/6 h-4" />
      <Skeleton variant="text" className="w-1/6 h-4" />
      <Skeleton variant="text" className="w-1/6 h-4" />
      <Skeleton variant="text" className="w-1/6 h-4" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center justify-between gap-4 py-2.5">
        <div className="w-1/4 flex items-center gap-2">
          <Skeleton variant="circular" className="w-6 h-6 flex-shrink-0" />
          <Skeleton variant="text" className="w-3/4 h-3.5" />
        </div>
        <Skeleton variant="text" className="w-1/6 h-3.5" />
        <Skeleton variant="text" className="w-1/6 h-3.5" />
        <Skeleton variant="text" className="w-1/6 h-3.5" />
        <Skeleton variant="text" className="w-1/6 h-3.5" />
      </div>
    ))}
  </div>
);

