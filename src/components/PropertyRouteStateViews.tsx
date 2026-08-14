import React from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Lock, 
  Building2, 
  ShieldAlert,
  ArrowLeft,
  WifiOff
} from 'lucide-react';

interface PropertyLoadingSkeletonProps {}

export const PropertyLoadingSkeleton: React.FC<PropertyLoadingSkeletonProps> = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      {/* Top Bar Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-9 w-32 bg-neutral-200 dark:bg-slate-800 rounded-xl" />
        <div className="flex gap-2">
          <div className="h-9 w-9 bg-neutral-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-9 w-9 bg-neutral-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>

      {/* Title & Location Skeleton */}
      <div className="space-y-3">
        <div className="h-8 w-3/4 bg-neutral-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-5 w-1/2 bg-neutral-200 dark:bg-slate-800 rounded-xl" />
      </div>

      {/* Main Photo Gallery Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 aspect-[16/10] bg-neutral-200 dark:bg-slate-800 rounded-3xl" />
        <div className="hidden md:grid grid-rows-2 gap-4">
          <div className="bg-neutral-200 dark:bg-slate-800 rounded-3xl" />
          <div className="bg-neutral-200 dark:bg-slate-800 rounded-3xl" />
        </div>
      </div>

      {/* Property Details Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-3">
            <div className="h-8 w-24 bg-neutral-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-8 w-28 bg-neutral-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-8 w-32 bg-neutral-200 dark:bg-slate-800 rounded-xl" />
          </div>
          <div className="h-32 bg-neutral-200 dark:bg-slate-800 rounded-3xl" />
          <div className="h-48 bg-neutral-200 dark:bg-slate-800 rounded-3xl" />
        </div>
        <div className="h-64 bg-neutral-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    </div>
  );
};

interface PropertyErrorViewProps {
  errorMessage: string;
  onRetry: () => void;
  onGoToSearch: () => void;
}

export const PropertyErrorView: React.FC<PropertyErrorViewProps> = ({
  errorMessage,
  onRetry,
  onGoToSearch
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-3xl border border-rose-200 dark:border-rose-950/80 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <WifiOff className="w-8 h-8 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Something went wrong while loading this property
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
            {errorMessage || 'A server connection or network error occurred while retrieving property details.'}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            onClick={onRetry}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <button
            onClick={onGoToSearch}
            className="w-full py-3 rounded-2xl bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-800 dark:text-neutral-200 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Browse Other Lodges</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface PropertyUnavailableViewProps {
  reason: string;
  onGoToSearch: () => void;
}

export const PropertyUnavailableView: React.FC<PropertyUnavailableViewProps> = ({
  reason,
  onGoToSearch
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-3xl border border-amber-200 dark:border-amber-950/80 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Property Currently Unavailable
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {reason}
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onGoToSearch}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Discover Available Campus Lodges</span>
          </button>
        </div>
      </div>
    </div>
  );
};
