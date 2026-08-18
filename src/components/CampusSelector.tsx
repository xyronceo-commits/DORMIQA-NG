import React from 'react';
import { School, ChevronDown } from 'lucide-react';
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

  return (
    <div className={`relative flex items-center ${className}`} data-tour="campus-selector">
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 focus-within:border-emerald-600 dark:focus-within:border-emerald-500 transition-colors w-full shadow-2xs">
        <School className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div className="flex flex-col flex-1 min-w-0">
          {!compact && (
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400 dark:text-neutral-500 -mb-0.5 leading-none">
              Target Campus
            </span>
          )}
          <select
            value={activeCampus.id}
            onChange={(e) => onSelectCampus(e.target.value)}
            className="bg-transparent text-xs font-bold text-neutral-900 dark:text-white focus:outline-none w-full cursor-pointer pr-4 truncate"
            aria-label="Select Target Campus"
          >
            {campuses.map((campus) => (
              <option key={campus.id} value={campus.id} className="dark:bg-neutral-900 text-neutral-900 dark:text-white">
                {campus.name} ({campus.city})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
