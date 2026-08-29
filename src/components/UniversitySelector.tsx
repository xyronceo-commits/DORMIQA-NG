import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  GraduationCap, 
  Search, 
  ChevronDown, 
  Check, 
  Sparkles, 
  X, 
  ExternalLink,
  Building2,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { University } from '../types';

interface UniversitySelectorProps {
  universities: University[];
  selectedUniversityId?: string;
  onSelectUniversity: (university: University) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string | null;
}

export const UniversitySelector: React.FC<UniversitySelectorProps> = ({
  universities,
  selectedUniversityId,
  onSelectUniversity,
  label = 'University',
  placeholder = 'Select your university',
  required = false,
  disabled = false,
  className = '',
  error = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [comingSoonUni, setComingSoonUni] = useState<University | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Currently selected university object
  const currentSelectedUni = useMemo(() => {
    return universities.find(u => u.id === selectedUniversityId);
  }, [universities, selectedUniversityId]);

  // Split universities into "Available now" (active) and "Coming soon" (coming_soon)
  const { activeUniversities, comingSoonUniversities } = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const filtered = universities.filter(u => {
      if (!term) return true;
      const matchName = u.name.toLowerCase().includes(term);
      const matchCode = (u.code || u.shortName || '').toLowerCase().includes(term);
      const matchState = (u.state || u.city || '').toLowerCase().includes(term);
      return matchName || matchCode || matchState;
    });

    const active = filtered.filter(u => u.status === 'active' || u.isActive === true);
    const comingSoon = filtered.filter(u => u.status === 'coming_soon' && u.isActive !== true);

    return {
      activeUniversities: active,
      comingSoonUniversities: comingSoon
    };
  }, [universities, searchTerm]);

  const handleSelectActive = (uni: University) => {
    onSelectUniversity(uni);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleSelectComingSoon = (uni: University) => {
    setComingSoonUni(uni);
    setIsOpen(false);
  };

  const handleOpenWaitlist = (url?: string) => {
    const targetUrl = url || 'https://dormiqa-waitlist.vercel.app';
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`space-y-1.5 relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="text-xs font-bold text-neutral-800 dark:text-slate-200 block">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* SELECT TRIGGER BUTTON */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-neutral-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold transition-all cursor-pointer ${
          error 
            ? 'border-rose-300 dark:border-rose-700 focus:ring-2 focus:ring-rose-500' 
            : isOpen 
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white dark:bg-slate-900' 
              : 'border-neutral-200 dark:border-slate-700 hover:border-neutral-300 dark:hover:border-slate-600'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          {currentSelectedUni ? (
            <div className="text-left truncate">
              <span className="font-bold text-slate-900 dark:text-white">
                {currentSelectedUni.code || currentSelectedUni.shortName || currentSelectedUni.name}
              </span>
              <span className="text-neutral-500 dark:text-slate-400 ml-1.5 text-[11px] font-normal truncate">
                ({currentSelectedUni.name})
              </span>
            </div>
          ) : (
            <span className="text-neutral-400 dark:text-slate-500 font-normal">
              {placeholder}
            </span>
          )}
        </div>

        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {error && (
        <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">{error}</p>
      )}

      {/* SEARCHABLE DROPDOWN PANEL */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-80 flex flex-col animate-in fade-in zoom-in-95 duration-150">
          
          {/* SEARCH INPUT HEADER */}
          <div className="p-2.5 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-900/50 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search universities..."
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* LIST OF UNIVERSITIES */}
          <div className="overflow-y-auto p-1.5 space-y-3 divide-y divide-neutral-100 dark:divide-slate-800">
            
            {/* SECTION 1: AVAILABLE NOW */}
            <div className="space-y-1">
              <div className="px-2.5 pt-1 pb-1 flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Available now
                </span>
                <span className="text-[10px] font-bold text-neutral-400 dark:text-slate-500">
                  {activeUniversities.length}
                </span>
              </div>

              {activeUniversities.length === 0 ? (
                <p className="text-[11px] text-neutral-400 dark:text-slate-500 px-3 py-2 italic">
                  No active universities match search.
                </p>
              ) : (
                activeUniversities.map(uni => {
                  const isSelected = uni.id === selectedUniversityId;
                  return (
                    <button
                      key={uni.id}
                      type="button"
                      onClick={() => handleSelectActive(uni)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold' 
                          : 'hover:bg-neutral-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{uni.code || uni.shortName || uni.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 font-extrabold rounded-md">
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-slate-400 truncate mt-0.5">
                          {uni.name} ({uni.state || uni.city})
                        </p>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* SECTION 2: COMING SOON */}
            <div className="space-y-1 pt-2">
              <div className="px-2.5 pt-1 pb-1 flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Coming soon
                </span>
                <span className="text-[10px] font-bold text-neutral-400 dark:text-slate-500">
                  {comingSoonUniversities.length}
                </span>
              </div>

              {comingSoonUniversities.length === 0 ? (
                <p className="text-[11px] text-neutral-400 dark:text-slate-500 px-3 py-2 italic">
                  No upcoming universities match search.
                </p>
              ) : (
                comingSoonUniversities.map(uni => (
                  <button
                    key={uni.id}
                    type="button"
                    onClick={() => handleSelectComingSoon(uni)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors text-neutral-600 dark:text-slate-400 cursor-pointer group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {uni.code || uni.shortName || uni.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 font-bold rounded-md">
                          Coming soon
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 dark:text-slate-500 truncate mt-0.5">
                        {uni.name}
                      </p>
                    </div>

                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Waitlist →
                    </span>
                  </button>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* COMING SOON MODAL / WAITLIST PROMPT */}
      {comingSoonUni && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-neutral-200 dark:border-slate-800 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            <button
              type="button"
              onClick={() => setComingSoonUni(null)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/60 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Building2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-md border border-amber-200/80 dark:border-amber-800/80">
                Coming soon
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white pt-1">
                Dormiqa isn't available at {comingSoonUni.name} yet.
              </h3>
              <p className="text-xs text-neutral-500 dark:text-slate-400 leading-relaxed font-medium">
                We are currently active at <strong className="text-slate-900 dark:text-white">Osun State University (UNIOSUN)</strong> and onboarding verified caretakers. Join our official waitlist to get early access when we launch at {comingSoonUni.code || comingSoonUni.name}!
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => handleOpenWaitlist(comingSoonUni.waitlistUrl)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Join the waitlist →</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const uniosun = universities.find(u => u.id === 'uniosun') || universities[0];
                  if (uniosun) onSelectUniversity(uniosun);
                  setComingSoonUni(null);
                }}
                className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Continue with UNIOSUN instead
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
