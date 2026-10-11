import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  GraduationCap, 
  Search, 
  ChevronDown, 
  Check, 
  X, 
  ExternalLink,
  Building2,
  Clock,
  CheckCircle2,
  BellRing,
  Sparkles,
  Send
} from 'lucide-react';
import { University } from '../types';
import { UNIVERSITIES } from '../data/mockData';

interface UniversitySelectorProps {
  universities?: University[];
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
  universities = [],
  selectedUniversityId,
  onSelectUniversity,
  label = 'Preferred School',
  placeholder = 'Select Osun State University (UNIOSUN)',
  required = false,
  disabled = false,
  className = '',
  error = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [comingSoonUni, setComingSoonUni] = useState<University | null>(null);
  const [waitlistContact, setWaitlistContact] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalized list guaranteeing Osun State University (UNIOSUN) is first and active, and all others are coming_soon
  const effectiveUniversities = useMemo(() => {
    const list = universities && universities.length > 0 ? universities : UNIVERSITIES;

    const uniosun = list.find(u => u.id === 'uniosun') || {
      id: 'uniosun',
      name: 'Osun State University (UNIOSUN)',
      shortName: 'UNIOSUN',
      city: 'Osogbo / Ejigbo / Okuku',
      state: 'Osun State',
      country: 'Nigeria',
      code: 'UNIOSUN',
      type: 'state',
      lat: 7.7821,
      lng: 4.5621,
      popularAreas: ['Osogbo Main Campus Axis', 'Oke-Baale', 'Ejigbo Town', 'Okuku Road', 'Ifetedo Campus', 'Ikire Campus'],
      totalListings: 10,
      imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
      description: 'Multi-campus state university with campuses in Osogbo, Ejigbo, Okuku, Ikire, Ifetedo, and Ipetu-Ijesha.',
      status: 'active',
      isActive: true,
      waitlistUrl: 'https://dormiqa-waitlist.vercel.app'
    } as University;

    const normalizedUniosun: University = {
      ...uniosun,
      status: 'active',
      isActive: true,
      waitlistUrl: 'https://dormiqa-waitlist.vercel.app'
    };

    const comingSoonList = list
      .filter(u => u.id !== 'uniosun')
      .map(u => ({
        ...u,
        status: 'coming_soon' as const,
        isActive: false,
        waitlistUrl: u.waitlistUrl || `https://dormiqa-waitlist.vercel.app?university=${encodeURIComponent(u.code || u.name)}`
      }));

    return [normalizedUniosun, ...comingSoonList];
  }, [universities]);

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

  // Currently selected university object - defaults to UNIOSUN if uniosun or unselected
  const currentSelectedUni = useMemo(() => {
    if (!selectedUniversityId || selectedUniversityId === 'uniosun') {
      return effectiveUniversities.find(u => u.id === 'uniosun') || effectiveUniversities[0];
    }
    return effectiveUniversities.find(u => u.id === selectedUniversityId) || 
           effectiveUniversities.find(u => u.id === 'uniosun') || 
           effectiveUniversities[0];
  }, [effectiveUniversities, selectedUniversityId]);

  // Split universities into ONLY UNIOSUN (active) and all others (coming soon)
  const { activeUniversities, comingSoonUniversities } = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const filtered = effectiveUniversities.filter(u => {
      if (!term) return true;
      const matchName = u.name.toLowerCase().includes(term);
      const matchCode = (u.code || u.shortName || '').toLowerCase().includes(term);
      const matchState = (u.state || u.city || '').toLowerCase().includes(term);
      return matchName || matchCode || matchState;
    });

    // ONLY Osun State University (UNIOSUN) is active and available right now
    const active = filtered.filter(u => u.id === 'uniosun');

    // All other universities are coming soon
    const comingSoon = filtered.filter(u => u.id !== 'uniosun');

    return {
      activeUniversities: active,
      comingSoonUniversities: comingSoon
    };
  }, [effectiveUniversities, searchTerm]);

  const handleSelectActive = (uni: University) => {
    onSelectUniversity(uni);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleSelectComingSoon = (uni: University) => {
    setComingSoonUni(uni);
    setWaitlistSubmitted(false);
    setWaitlistContact('');
    setIsOpen(false);
  };

  const handleJoinWaitlistSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!waitlistContact.trim() || !comingSoonUni) return;

    setIsSubmittingWaitlist(true);
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universityId: comingSoonUni.id,
          universityName: comingSoonUni.name,
          contact: waitlistContact.trim(),
          role: 'student'
        })
      });
    } catch (err) {
      console.warn('Waitlist submission notice:', err);
    } finally {
      setIsSubmittingWaitlist(false);
      setWaitlistSubmitted(true);
    }
  };

  const uniosunUni = useMemo(() => {
    return effectiveUniversities.find(u => u.id === 'uniosun') || effectiveUniversities[0];
  }, [effectiveUniversities]);

  return (
    <div className={`space-y-1.5 relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
          {label} {required && <span className="text-emerald-500">*</span>}
        </label>
      )}

      {/* SELECT TRIGGER BUTTON */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-neutral-50 dark:bg-black border rounded-xl text-xs font-semibold transition-all cursor-pointer ${
          error 
            ? 'border-red-400 dark:border-red-600 focus:ring-2 focus:ring-red-500' 
            : isOpen 
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white dark:bg-black' 
              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          {currentSelectedUni ? (
            <div className="text-left truncate flex items-center gap-1.5">
              <span className="font-bold text-black dark:text-white">
                {currentSelectedUni.code || currentSelectedUni.shortName || currentSelectedUni.name}
              </span>
              <span className="text-neutral-500 dark:text-neutral-400 text-[11px] font-normal truncate hidden sm:inline">
                ({currentSelectedUni.name})
              </span>
              {currentSelectedUni.id === 'uniosun' ? (
                <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded">
                  Active Now
                </span>
              ) : (
                <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded">
                  Coming Soon
                </span>
              )}
            </div>
          ) : (
            <span className="text-neutral-400 dark:text-neutral-500 font-normal">
              {placeholder}
            </span>
          )}
        </div>

        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {error && (
        <p className="text-[11px] font-bold text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* SEARCHABLE DROPDOWN PANEL */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden max-h-80 flex flex-col animate-in fade-in zoom-in-95 duration-150">
          
          {/* SEARCH INPUT HEADER */}
          <div className="p-2.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-black/50 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search university by name, code or city..."
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
          <div className="overflow-y-auto p-1.5 space-y-3 divide-y divide-neutral-100 dark:divide-neutral-800">
            
            {/* SECTION 1: AVAILABLE NOW (ONLY OSUN STATE UNIVERSITY) */}
            <div className="space-y-1">
              <div className="px-2.5 pt-1 pb-1 flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Available Now (Active Campus)
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded">
                  Live
                </span>
              </div>

              {activeUniversities.length === 0 ? (
                <div className="p-2.5 text-center">
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Osun State University (UNIOSUN) is the only active school.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSelectActive(uniosunUni)}
                    className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 underline hover:text-emerald-700"
                  >
                    Select Osun State University (UNIOSUN)
                  </button>
                </div>
              ) : (
                activeUniversities.map(uni => {
                  const isSelected = currentSelectedUni?.id === uni.id;
                  return (
                    <button
                      key={uni.id}
                      type="button"
                      onClick={() => handleSelectActive(uni)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer border ${
                        isSelected 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold' 
                          : 'bg-emerald-50/40 dark:bg-neutral-900/40 border-emerald-200/50 dark:border-emerald-900/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-black dark:text-white font-medium'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm">{uni.code || uni.shortName || uni.name}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-600 text-white font-extrabold rounded-md shadow-2xs">
                            Active & Available Now
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-300 truncate mt-0.5 font-medium">
                          {uni.name} ({uni.state || uni.city})
                        </p>
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                          Osogbo Main Campus & Satellites (Ejigbo, Okuku, Ikire, Ifetedo)
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {isSelected && (
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-black px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          Select →
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* SECTION 2: COMING SOON (ALL OTHER UNIVERSITIES) */}
            <div className="space-y-1 pt-2">
              <div className="px-2.5 pt-1 pb-1 flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-amber-500" />
                  Coming Soon ({comingSoonUniversities.length})
                </span>
                <span className="text-[10px] font-semibold text-neutral-400">
                  Join Waitlist
                </span>
              </div>

              {comingSoonUniversities.length === 0 ? (
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 px-3 py-2 italic">
                  No upcoming universities match "{searchTerm}".
                </p>
              ) : (
                comingSoonUniversities.map(uni => (
                  <button
                    key={uni.id}
                    type="button"
                    onClick={() => handleSelectComingSoon(uni)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-neutral-700 dark:text-neutral-300 cursor-pointer group border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-black dark:text-white">
                          {uni.code || uni.shortName || uni.name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300 font-bold rounded">
                          Coming Soon
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                        {uni.name} ({uni.state || uni.city})
                      </p>
                    </div>

                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
                      Waitlist →
                    </span>
                  </button>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* FULLY WORKING COMING SOON / WAITLIST MODAL */}
      {comingSoonUni && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-black rounded-3xl max-w-sm w-full p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            <button
              type="button"
              onClick={() => {
                setComingSoonUni(null);
                setWaitlistSubmitted(false);
                setWaitlistContact('');
              }}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                  Coming Soon
                </span>
                <span className="text-[10px] font-semibold text-neutral-400">
                  {comingSoonUni.city}, {comingSoonUni.state}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-black dark:text-white pt-1">
                Dormiqa is coming to {comingSoonUni.name} ({comingSoonUni.code || 'Campus'})!
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                Verified accommodation is currently live exclusively at <strong className="text-black dark:text-white">Osun State University (UNIOSUN)</strong>. Join our official waitlist below to get notified as soon as verified hostels launch around {comingSoonUni.code || comingSoonUni.name}!
              </p>
            </div>

            {/* DIRECT IN-APP WAITLIST NOTIFICATION FORM */}
            {!waitlistSubmitted ? (
              <form onSubmit={handleJoinWaitlistSubmit} className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block flex items-center gap-1">
                  <BellRing className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Get priority launch alert:</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Email or WhatsApp (+234...)"
                    value={waitlistContact}
                    onChange={(e) => setWaitlistContact(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingWaitlist || !waitlistContact.trim()}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    <span>{isSubmittingWaitlist ? 'Saving...' : 'Notify Me'}</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-1 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  You're on the priority waitlist!
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  We'll message {waitlistContact} as soon as verified caretakers launch at {comingSoonUni.code || comingSoonUni.name}.
                </p>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="pt-2 space-y-2">
              {/* PRIMARY ACTION: Select UNIOSUN */}
              <button
                type="button"
                onClick={() => {
                  onSelectUniversity(uniosunUni);
                  setComingSoonUni(null);
                  setWaitlistSubmitted(false);
                  setWaitlistContact('');
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Select Osun State University (UNIOSUN) — Active Now</span>
                <Check className="w-4 h-4" />
              </button>

              {/* SECONDARY ACTION: External full waitlist portal */}
              <a
                href={comingSoonUni.waitlistUrl || `https://dormiqa-waitlist.vercel.app?university=${encodeURIComponent(comingSoonUni.code || comingSoonUni.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 border border-neutral-200 dark:border-neutral-700"
              >
                <span>Open Full Waitlist Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {/* TERTIARY ACTION: Keep as preference */}
              <button
                type="button"
                onClick={() => {
                  onSelectUniversity(comingSoonUni);
                  setComingSoonUni(null);
                  setWaitlistSubmitted(false);
                  setWaitlistContact('');
                }}
                className="w-full py-1.5 text-center text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-semibold cursor-pointer"
              >
                Keep {comingSoonUni.code || comingSoonUni.name} as preferred upcoming school
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
