import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  MapPin, 
  ArrowRight, 
  ExternalLink, 
  ChevronLeft, 
  CheckCircle2, 
  Clock,
  Sparkles
} from 'lucide-react';
import { University } from '../types';

interface UniversitiesPageProps {
  universities: University[];
  onSearchUniversity: (uniId: string) => void;
  onBackToLanding: () => void;
}

const WAITLIST_BASE_URL = 'https://dormiqa-waitlist.vercel.app';

export const UniversitiesPage: React.FC<UniversitiesPageProps> = ({
  universities,
  onSearchUniversity,
  onBackToLanding,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('all');

  const availableStates = ['all', ...Array.from(new Set(universities.map((u) => u.state)))];

  const filteredUniversities = universities.filter((u) => {
    const matchesState = selectedState === 'all' || u.state === selectedState;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.code.toLowerCase().includes(q) ||
      u.city.toLowerCase().includes(q) ||
      u.state.toLowerCase().includes(q);
    return matchesState && matchesQuery;
  });

  // UNIOSUN is the active launch university
  const activeUniversities = filteredUniversities.filter(
    (u) => u.id === 'uniosun' || u.status === 'active'
  );
  const comingSoonUniversities = filteredUniversities.filter(
    (u) => u.id !== 'uniosun' && u.status !== 'active'
  );

  const handleJoinWaitlist = (uniName: string) => {
    const targetUrl = `${WAITLIST_BASE_URL}?university=${encodeURIComponent(uniName)}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans">
      {/* Top Header / Navigation Bar */}
      <div className="border-b border-neutral-200 bg-neutral-50/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <button
            onClick={onBackToLanding}
            className="inline-flex items-center gap-2 text-xs font-bold text-neutral-700 hover:text-black transition-colors cursor-pointer group px-3 py-1.5 rounded-xl bg-white border border-neutral-200 shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-neutral-500" />
            <span>Back to Home</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
              Universities Directory
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Title Header Section */}
        <div className="max-w-3xl space-y-3 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight leading-tight">
            Universities on Dormiqa
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-normal">
            Discover verified student accommodation around active university campuses or join the waitlist for upcoming launch locations across Nigeria.
          </p>
        </div>

        {/* Search & State Filter Controls */}
        <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search university name, code, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 bg-white text-xs font-semibold text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 transition-all shadow-2xs"
              />
            </div>

            {/* Total Results Count */}
            <div className="text-xs font-semibold text-neutral-500 self-end sm:self-center">
              Showing <span className="font-extrabold text-neutral-900">{filteredUniversities.length}</span> higher institutions
            </div>
          </div>

          {/* State Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-neutral-200/60">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 mr-1">
              Filter State:
            </span>
            {availableStates.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedState === st
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-white text-neutral-700 hover:bg-neutral-200/70 border border-neutral-200'
                }`}
              >
                {st === 'all' ? 'All States' : st}
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 1: AVAILABLE NOW */}
        {activeUniversities.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">
                AVAILABLE NOW
              </h2>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Live Campus Network
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeUniversities.map((uni) => (
                <div
                  key={uni.id}
                  className="bg-white rounded-2xl border-2 border-emerald-500/80 p-6 shadow-sm flex flex-col justify-between space-y-5 hover:border-emerald-600 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 rounded-lg">
                        {uni.code}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        AVAILABLE NOW
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-extrabold text-neutral-900 leading-snug">
                        {uni.name}
                      </h3>
                      <p className="text-xs text-neutral-500 font-medium flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>Accommodation around UNIOSUN</span> • <span>{uni.city}, {uni.state}</span>
                      </p>
                    </div>

                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {uni.description}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-xs font-bold text-neutral-700">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <span>{uni.totalListings} Verified Hostel Listings Available</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-100">
                    <button
                      onClick={() => onSearchUniversity(uni.id)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <span>Explore accommodation</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 2: COMING SOON */}
        {comingSoonUniversities.length > 0 && (
          <section className="space-y-4 pt-4">
            <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
              <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">
                COMING SOON
              </h2>
              <span className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-200">
                Upcoming Expansion ({comingSoonUniversities.length})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {comingSoonUniversities.map((uni) => (
                <div
                  key={uni.id}
                  className="bg-neutral-50/70 rounded-2xl border border-neutral-200 p-6 shadow-2xs flex flex-col justify-between space-y-4 hover:border-neutral-300 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-white text-neutral-700 border border-neutral-200 rounded-lg">
                        {uni.code}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        COMING SOON
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-neutral-900 leading-snug">
                        {uni.name}
                      </h3>
                      <p className="text-xs text-neutral-500 font-medium flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{uni.city}, {uni.state}</span>
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-neutral-200/80">
                      <p className="text-xs text-neutral-700 font-medium leading-relaxed">
                        Be the first to know when Dormiqa launches at <span className="font-extrabold text-neutral-900">{uni.name}</span>.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => handleJoinWaitlist(uni.name)}
                      className="w-full py-3 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <span>Join the waitlist</span>
                      <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
