import React from 'react';
import { 
  Building2, 
  Search, 
  Home, 
  ArrowLeft, 
  MapPin, 
  Compass, 
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface NotFoundPageProps {
  onGoHome: () => void;
  onGoToSearch: () => void;
  requestedPath?: string;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onGoHome,
  onGoToSearch,
  requestedPath
}) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full text-center space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-3xl border border-neutral-200/80 dark:border-slate-800 shadow-xl relative overflow-hidden">
        {/* Subtle Background Glow Accent */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 404 Badge & Visual Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-24 h-24 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shadow-inner">
            <Building2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          </div>
          <span className="absolute -top-2 -right-3 px-3 py-1 bg-emerald-600 text-white text-xs font-black rounded-full shadow-md">
            404
          </span>
        </div>

        {/* Headline & Description */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Looks like you've taken a wrong turn.
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 max-w-md mx-auto leading-relaxed">
            The hostel, property, or page you're looking for doesn't exist, may have been relocated, or was removed by the lodge caretaker.
          </p>
          {requestedPath && (
            <div className="inline-block px-3 py-1 bg-neutral-100 dark:bg-slate-800 rounded-lg text-xs font-mono text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-slate-700">
              Path: {requestedPath}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            onClick={onGoToSearch}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Back to Discover Lodges</span>
          </button>

          <button
            onClick={onGoHome}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-800 dark:text-neutral-200 font-bold text-sm border border-neutral-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Go to Homepage</span>
          </button>
        </div>

        {/* Popular Campus Destinations Quick Links */}
        <div className="pt-8 border-t border-neutral-100 dark:border-slate-800/80">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center justify-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-emerald-500" />
            <span>Search Accommodation by Campus</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {['UNILAG', 'University of Ibadan', 'FUTA Akure', 'OAU Ile-Ife', 'LASU Ojo'].map((campus) => (
              <button
                key={campus}
                onClick={onGoToSearch}
                className="px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-neutral-200/60 dark:border-slate-700/60 transition-colors cursor-pointer"
              >
                {campus}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
