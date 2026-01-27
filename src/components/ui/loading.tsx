'use client';

import { memo } from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LoadingSpinner = memo(function LoadingSpinner({ 
  size = 'md', 
  text 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-primary border-t-transparent`}
      />
      {text && <p className="text-sm text-muted-foreground animate-pulse">{text}</p>}
    </div>
  );
});

export const PageLoader = memo(function PageLoader() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <LoadingSpinner size="lg" text="Cargando..." />
    </div>
  );
});

export const TableSkeleton = memo(function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header skeleton */}
      <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 bg-muted rounded animate-pulse flex-1" />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border rounded-lg">
          {[1, 2, 3, 4].map((j) => (
            <div 
              key={j} 
              className="h-4 bg-muted/50 rounded animate-pulse flex-1"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
});

export const CardSkeleton = memo(function CardSkeleton() {
  return (
    <div className="p-6 border rounded-lg space-y-4">
      <div className="h-6 w-1/3 bg-muted rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-muted/50 rounded animate-pulse" />
      </div>
    </div>
  );
});
