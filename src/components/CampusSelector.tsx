import React from 'react';
import { School, Compass } from 'lucide-react';
import { Campus, University } from '../types';
import { getCampusesByUniversityId } from '../data/campuses';

interface CampusSelectorProps {
  universityId: string;
  selectedCampusId?: string;
  onSelectCampus: (campusId: string) => void;
  universities?: University[];
  className?: string;
  compact?: boolean;
}

export const CampusSelector: React.FC<CampusSelectorProps> = ({
  universityId,
  selectedCampusId,
  onSelectCampus,
  universities,
  className = '',
  compact = false
}) => {
  const campuses = getCampusesByUniversityId(universityId, universities);

  if (campuses.length === 0) return null;

  const activeCampus = campuses.find(c => c.id === selectedCampusId) || campuses[0];
  const isUniLive = universityId === 'uniosun';
  const isCampusLive = isUniLive && !activeCampus.isComingSoon && activeCampus.status !== 'coming_soon';

  // Separate campuses into active/available vs future/coming soon
  const availableCampuses = campuses.filter(c => !c.isComingSoon && c.status !== 'coming_soon');
  const futureCampuses = campuses.filter(c => c.isComingSoon || c.status === 'coming_soon');

  return (
    <div 
      id="search-filter-campus-bar"
      className={`relative flex items-center ${className}`} 
      data-tour="campus-selector"
    >
      <div 
        className="group relative flex items-center gap-2.5 px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800/90 hover:bg-neutral-100/90 dark:hover:bg-neutral-750 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 hover:border-emerald-500/80 dark:hover:border-emerald-500/80 focus-within:border-emerald-600 dark:focus-within:border-emerald-500 transition-all duration-200 w-full shadow-2xs hover:shadow-xs cursor-pointer"
        title="Target campus for property travel distance & routing calculations"
      >
        <div className="relative shrink-0 flex items-center justify-center">
          <School className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-200 shrink-0" />
          {isCampusLive && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-neutral-800 animate-pulse" />
          )}
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          {!compact && (
            <div className="flex items-center justify-between gap-1 -mb-0.5">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400 dark:text-neutral-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-none flex items-center gap-1">
                <Compass className="w-2.5 h-2.5 inline-block text-emerald-500" />
                Target Campus
              </span>
              <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border ${
                isCampusLive
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              }`}>
                {isCampusLive ? 'Active' : 'Future'}
              </span>
            </div>
          )}

          <select
            value={activeCampus.id}
            onChange={(e) => onSelectCampus(e.target.value)}
            className="bg-transparent text-xs font-bold text-neutral-900 dark:text-white focus:outline-none w-full cursor-pointer pr-4 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors"
            aria-label="Select Target Campus"
          >
            {availableCampuses.length > 0 && (
              <optgroup label="📍 Currently Available Campuses" className="dark:bg-neutral-900 font-semibold text-neutral-500">
                {availableCampuses.map((campus) => (
                  <option key={campus.id} value={campus.id} className="dark:bg-neutral-900 text-neutral-900 dark:text-white">
                    {campus.name} ({campus.city}) {isUniLive ? '• 🟢 Live Distance' : '• ⏳ Coming Soon'}
                  </option>
                ))}
              </optgroup>
            )}

            {futureCampuses.length > 0 && (
              <optgroup label="⏳ Expansion / Future Campuses" className="dark:bg-neutral-900 font-semibold text-neutral-400">
                {futureCampuses.map((campus) => (
                  <option key={campus.id} value={campus.id} className="dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
                    {campus.name} ({campus.city}) • ⏳ Coming Soon
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>
    </div>
  );
};
