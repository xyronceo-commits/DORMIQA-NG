import React from 'react';

/**
 * Single Listing Card Skeleton - Matches exact proportions of ListingCard
 */
export const ListingCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 overflow-hidden flex flex-col shadow-xs animate-pulse">
      {/* Photo carousel aspect ratio skeleton */}
      <div className="relative aspect-[4/3] w-full bg-neutral-200 dark:bg-slate-800 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-neutral-300 dark:bg-slate-700/60" />
        
        {/* Top badge placeholders */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <div className="h-6 w-20 bg-neutral-300/80 dark:bg-slate-700/80 rounded-full" />
        </div>
        <div className="absolute top-3 right-3 flex gap-1.5">
          <div className="h-8 w-8 bg-neutral-300/80 dark:bg-slate-700/80 rounded-lg" />
          <div className="h-8 w-8 bg-neutral-300/80 dark:bg-slate-700/80 rounded-lg" />
        </div>
        {/* Bottom price badge placeholder */}
        <div className="absolute bottom-3 left-3">
          <div className="h-7 w-28 bg-neutral-300/80 dark:bg-slate-700/80 rounded-xl" />
        </div>
      </div>

      {/* Card Content Skeleton */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
        <div className="space-y-2">
          {/* Title */}
          <div className="h-4 bg-neutral-200 dark:bg-slate-800 rounded-lg w-5/6" />
          
          {/* Location / Address */}
          <div className="h-3 bg-neutral-200 dark:bg-slate-800 rounded-lg w-3/4" />
        </div>

        {/* Distance & Travel Mode Bar Skeleton */}
        <div className="h-9 bg-neutral-100 dark:bg-slate-800/60 rounded-xl w-full" />

        {/* Action Buttons Skeleton */}
        <div className="pt-2 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="h-9 bg-neutral-200 dark:bg-slate-800 rounded-xl flex-1" />
          <div className="h-9 bg-neutral-200 dark:bg-slate-800 rounded-xl flex-1" />
        </div>
      </div>
    </div>
  );
};

/**
 * Responsive Grid of Listing Card Skeletons
 */
interface ListingGridSkeletonProps {
  count?: number;
}

export const ListingGridSkeleton: React.FC<ListingGridSkeletonProps> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6 lg:gap-8 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
};

/**
 * Compact Map View List Item Skeleton
 */
export const ListItemRowSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-neutral-200 dark:border-slate-800 flex gap-3 animate-pulse shadow-2xs">
      <div className="w-24 h-24 rounded-xl bg-neutral-200 dark:bg-slate-800 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2 py-1">
        <div className="flex items-center justify-between gap-2">
          <div className="h-4 bg-neutral-200 dark:bg-slate-800 rounded-md w-3/5" />
          <div className="h-4 bg-neutral-200 dark:bg-slate-800 rounded-md w-1/4" />
        </div>
        <div className="h-3 bg-neutral-200 dark:bg-slate-800 rounded-md w-4/5" />
        <div className="h-6 bg-neutral-100 dark:bg-slate-800/60 rounded-lg w-full" />
      </div>
    </div>
  );
};

/**
 * Dashboard Overview & Stats Skeleton
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse w-full">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 bg-neutral-200 dark:bg-slate-800 rounded-md w-24" />
              <div className="w-8 h-8 rounded-xl bg-neutral-200 dark:bg-slate-800" />
            </div>
            <div className="h-7 bg-neutral-200 dark:bg-slate-800 rounded-lg w-20" />
            <div className="h-3 bg-neutral-200 dark:bg-slate-800 rounded-md w-32" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-slate-800">
          <div className="h-5 bg-neutral-200 dark:bg-slate-800 rounded-lg w-48" />
          <div className="h-8 bg-neutral-200 dark:bg-slate-800 rounded-xl w-28" />
        </div>
        <div className="space-y-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-neutral-100 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between px-4">
              <div className="flex items-center gap-3 w-1/2">
                <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-slate-800 shrink-0" />
                <div className="h-4 bg-neutral-200 dark:bg-slate-800 rounded-md w-full" />
              </div>
              <div className="h-4 bg-neutral-200 dark:bg-slate-800 rounded-md w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Chat Conversation Drawer Skeleton
 */
export const ChatDrawerSkeleton: React.FC = () => {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-slate-800/50">
          <div className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-slate-700 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3.5 bg-neutral-200 dark:bg-slate-700 rounded-md w-28" />
              <div className="h-2.5 bg-neutral-200 dark:bg-slate-700 rounded-md w-12" />
            </div>
            <div className="h-3 bg-neutral-200 dark:bg-slate-700 rounded-md w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
};
