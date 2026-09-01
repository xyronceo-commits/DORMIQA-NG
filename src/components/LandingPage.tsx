import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Footprints, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Calendar, 
  ChevronDown, 
  Building2, 
  Shield, 
  Zap,
  ExternalLink,
  Clock
} from 'lucide-react';
import { University, Listing } from '../types';

interface LandingPageProps {
  universities: University[];
  featuredListings?: Listing[];
  recentListings?: Listing[];
  onSearchUniversity: (uniId: string) => void;
  onOpenListingDetail?: (listing: Listing) => void;
  onBookInspection?: (listing: Listing) => void;
  onStartChat?: (agentId: string, listingId: string) => void;
  savedIds?: string[];
  onToggleSave?: (id: string) => void;
  onOpenAgentPortal: () => void;
  onOpenOnboarding?: () => void;
  onOpenAllUniversities?: () => void;
}

const WAITLIST_BASE_URL = 'https://dormiqa-waitlist.vercel.app';

const DEFAULT_CURATED_UNIVERSITIES: University[] = [
  { id: 'uniosun', name: 'Osun State University', code: 'UNIOSUN', country: 'Nigeria', type: 'state', lat: 7.771, lng: 4.56, popularAreas: ['Oke Baale', 'Kelebe', 'Isale Osun'], totalListings: 0, imageUrl: '', city: 'Osogbo', state: 'Osun State', status: 'active', description: 'Main campus, Osogbo & satellite campuses' },
  { id: 'ui', name: 'University of Ibadan', code: 'UI', country: 'Nigeria', type: 'federal', lat: 7.443, lng: 3.899, popularAreas: ['Agbowo', 'Bodija', 'Samonda'], totalListings: 0, imageUrl: '', city: 'Ibadan', state: 'Oyo State', status: 'coming_soon', description: 'Premier University' },
  { id: 'futa', name: 'Fed. Univ. of Tech, Akure', code: 'FUTA', country: 'Nigeria', type: 'federal', lat: 7.302, lng: 5.137, popularAreas: ['South Gate', 'North Gate', 'Obanla'], totalListings: 0, imageUrl: '', city: 'Akure', state: 'Ondo State', status: 'coming_soon', description: 'Federal University of Technology' },
  { id: 'fuoye', name: 'Federal University, Oye-Ekiti', code: 'FUOYE', country: 'Nigeria', type: 'federal', lat: 7.798, lng: 5.335, popularAreas: ['Oye Campus', 'Ikole Campus'], totalListings: 0, imageUrl: '', city: 'Oye-Ekiti', state: 'Ekiti State', status: 'coming_soon', description: 'Oye & Ikole Campuses' },
  { id: 'lasu', name: 'Lagos State University', code: 'LASU', country: 'Nigeria', type: 'state', lat: 6.465, lng: 3.197, popularAreas: ['Ojo Gate', 'Iyana Iba'], totalListings: 0, imageUrl: '', city: 'Ojo', state: 'Lagos State', status: 'coming_soon', description: 'Main Campus, Ojo' },
  { id: 'yabatech', name: 'Yaba College of Technology', code: 'YABATECH', country: 'Nigeria', type: 'polytechnic', lat: 6.518, lng: 3.372, popularAreas: ['Yaba', 'Akoka', 'Onike'], totalListings: 0, imageUrl: '', city: 'Yaba', state: 'Lagos State', status: 'coming_soon', description: 'Yaba Campus' },
  { id: 'oau', name: 'Obafemi Awolowo University', code: 'OAU', country: 'Nigeria', type: 'federal', lat: 7.518, lng: 4.527, popularAreas: ['Asherifa', 'Mayfair', 'Ede Road'], totalListings: 0, imageUrl: '', city: 'Ile-Ife', state: 'Osun State', status: 'coming_soon', description: 'Main Campus, Ile-Ife' },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  universities,
  onSearchUniversity,
  onOpenAgentPortal,
  onOpenOnboarding,
  onOpenAllUniversities
}) => {
  const [heroUniId, setHeroUniId] = useState('uniosun');
  const [heroPropType, setHeroPropType] = useState<string>('all');
  const [heroMaxBudget, setHeroMaxBudget] = useState<number>(1000000);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  // Curate 7 featured universities with UNIOSUN strictly FIRST
  const FEATURED_UNI_IDS = ['uniosun', 'ui', 'futa', 'fuoye', 'lasu', 'yabatech', 'oau'];
  
  const featuredUniversities = FEATURED_UNI_IDS.map(id => {
    const found = universities.find(u => u.id === id);
    if (found) return found;
    return DEFAULT_CURATED_UNIVERSITIES.find(u => u.id === id)!;
  }).filter(Boolean) as University[];

  const handleJoinWaitlist = (uniName: string) => {
    const targetUrl = `${WAITLIST_BASE_URL}?university=${encodeURIComponent(uniName)}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const faqs = [
    {
      q: "How does Dormiqa verify caretakers and property agents?",
      a: "Every caretaker or agent provides business details, proof of business (banner, logo, office photo, or CAC), confirms agency or property management authority, and submits verifiable property location details before listings go live."
    },
    {
      q: "Are the campus walking distances accurate?",
      a: "Yes. Walking distances are measured directly from the lodge gate to the university main gate or central library using pedestrian routing, preventing fake claims."
    },
    {
      q: "Does Dormiqa charge agency or inspection search fees?",
      a: "No search fees. You can browse all verified listings and book inspection appointments directly for free. Agent fees, legal agreements, and rent terms are transparently listed upfront."
    },
    {
      q: "How does university waitlisting work?",
      a: "Students can join the waitlist for upcoming campus expansions to receive priority notifications and early access as soon as verified hostels and caretakers are onboarded at their university."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* 1. HERO SECTION */}
      <section className="border-b border-neutral-200 bg-neutral-50/50 pt-8 pb-10 sm:pt-12 sm:pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Hero Left Column: Headline & Search */}
            <div className="lg:col-span-7 space-y-5">
              
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 tracking-tight leading-[1.15] text-center lg:text-left">
                Verified Student Housing Near Your Campus Gate.
              </h1>

              <p className="text-xs sm:text-base text-neutral-600 font-normal leading-relaxed max-w-xl mx-auto lg:mx-0 text-center lg:text-left">
                Find student self-contains, single rooms, 1-bedroom flats, and flatmate spaces around UNIOSUN, UI, FUTA, FUOYE, LASU, and top institutions. Verified caretakers, real walking distances, zero scam fees.
              </p>

              {/* Primary Search Container */}
              <div className="bg-white p-3 rounded-2xl border border-neutral-300 shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  
                  {/* Select Campus */}
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">1. Campus</label>
                    <select
                      value={heroUniId}
                      onChange={(e) => setHeroUniId(e.target.value)}
                      className="bg-transparent text-xs font-bold text-neutral-900 focus:outline-none w-full cursor-pointer truncate"
                    >
                      {featuredUniversities.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.code} — {u.city} {u.id !== 'uniosun' ? '• Coming Soon' : '• LIVE'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Accommodation Type */}
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">2. House Type</label>
                    <select
                      value={heroPropType}
                      onChange={(e) => setHeroPropType(e.target.value)}
                      className="bg-transparent text-xs font-bold text-neutral-900 focus:outline-none w-full cursor-pointer"
                    >
                      <option value="all">All Types</option>
                      <option value="self_contain">Self-Contain Studio</option>
                      <option value="single_room">Single Room</option>
                      <option value="one_bedroom">1-Bedroom Flat</option>
                    </select>
                  </div>

                  {/* Max Annual Rent */}
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">3. Max Budget</label>
                    <select
                      value={heroMaxBudget}
                      onChange={(e) => setHeroMaxBudget(Number(e.target.value))}
                      className="bg-transparent text-xs font-bold text-neutral-900 focus:outline-none w-full cursor-pointer"
                    >
                      <option value={300000}>Under ₦300k/yr</option>
                      <option value={500000}>Under ₦500k/yr</option>
                      <option value={800000}>Under ₦800k/yr</option>
                      <option value={1500000}>Under ₦1.5M/yr</option>
                      <option value={3000000}>Any Budget</option>
                    </select>
                  </div>

                </div>

                {/* Search CTA Buttons */}
                <div className="pt-1">
                  <button
                    onClick={() => {
                      if (heroUniId !== 'uniosun') {
                        const targetUni = featuredUniversities.find(u => u.id === heroUniId);
                        handleJoinWaitlist(targetUni?.name || heroUniId.toUpperCase());
                      } else if (onOpenOnboarding) {
                        onOpenOnboarding();
                      } else {
                        onSearchUniversity('uniosun');
                      }
                    }}
                    className="w-full py-3 bg-neutral-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
                  >
                    <Search className="w-4 h-4 text-emerald-400" />
                    <span>
                      {heroUniId !== 'uniosun' ? 'Join Launch Waitlist' : 'Explore Accommodation'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Quick Trust Highlights */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 text-[11px] sm:text-xs font-medium text-neutral-500 pt-1">
                <span className="flex items-center gap-1.5"><Footprints className="w-3.5 h-3.5 text-neutral-700" /> 3–15 min walk to gate</span>
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-emerald-600" /> Solar & Light specs</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified caretakers</span>
              </div>

            </div>

            {/* Hero Right Column: Platform Standards */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-neutral-300 p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                  <span className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Physical Property Verification
                  </span>
                  <span className="text-[10px] font-semibold text-neutral-400">Dormiqa NG</span>
                </div>

                <div className="space-y-2.5 text-xs text-neutral-600">
                  <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-0.5">
                    <div className="flex items-center gap-2 text-black font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Strict Physical Inspection</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 pl-5 leading-relaxed">
                      Every lodge listed undergoes location verification to confirm actual walking distance to campus gates.
                    </p>
                  </div>

                  <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-0.5">
                    <div className="flex items-center gap-2 text-black font-bold text-xs">
                      <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Transparent Utilities Audit</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 pl-5 leading-relaxed">
                      Borehole water pumps, prepaid PHCN meters, and solar inverter specs are explicitly documented before going live.
                    </p>
                  </div>

                  <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-0.5">
                    <div className="flex items-center gap-2 text-black font-bold text-xs">
                      <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Verified Caretakers & Agents</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 pl-5 leading-relaxed">
                      Direct contact with verified lodge caretakers and property managers — zero ghost agent search fees.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onOpenAgentPortal()}
                  className="w-full py-2.5 bg-black hover:bg-neutral-900 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>Agent / Caretaker Listing Portal</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 2. CORE PILLARS / HOW DORMIQA WORKS */}
      <section className="bg-neutral-900 text-white py-12 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="max-w-2xl space-y-1">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">Built for Student Peace of Mind</span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold">How Dormiqa Works</h2>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              We replaced fake street agent claims with physical property verification, transparent utility specs, and direct caretaker booking.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            
            <div className="bg-neutral-800/80 p-4 rounded-xl border border-neutral-700/70 space-y-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-white">Physical Caretaker Verification</h3>
              <p className="text-[11px] sm:text-xs text-neutral-400 leading-relaxed">
                Every caretaker ID and property management claim is checked before publishing. No ghost agents.
              </p>
            </div>

            <div className="bg-neutral-800/80 p-4 rounded-xl border border-neutral-700/70 space-y-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Footprints className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-white">Pedestrian Gate Distance</h3>
              <p className="text-[11px] sm:text-xs text-neutral-400 leading-relaxed">
                Accurate walking minutes to campus gate or library quad, avoiding unexpected daily transportation costs.
              </p>
            </div>

            <div className="bg-neutral-800/80 p-4 rounded-xl border border-neutral-700/70 space-y-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-white">Power & Water Specs</h3>
              <p className="text-[11px] sm:text-xs text-neutral-400 leading-relaxed">
                Clear reports on solar inverter backup, PHCN light schedule, and borehole water tap availability.
              </p>
            </div>

            <div className="bg-neutral-800/80 p-4 rounded-xl border border-neutral-700/70 space-y-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-white">Direct Inspection Scheduling</h3>
              <p className="text-[11px] sm:text-xs text-neutral-400 leading-relaxed">
                Schedule physical tours or live video walkthroughs directly without endless phone tag or search fees.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 3. UNIVERSITY AVAILABILITY SECTION (Compact 2-Column Mobile Grid) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-6 sm:space-y-8 bg-neutral-50/70 border-y border-neutral-200">
        
        {/* Section Heading */}
        <div className="max-w-2xl space-y-1 text-left">
          <span className="text-[10px] sm:text-xs font-extrabold text-emerald-700 uppercase tracking-wider block">
            Institutional Availability
          </span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Find accommodation around universities in Nigeria
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600">
            Discover verified student accommodation around your university.
          </p>
        </div>

        {/* Compact Responsive Grid: 2 columns on mobile, 3 on tablet/desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-5">
          {featuredUniversities.map((uni) => {
            const isActive = uni.id === 'uniosun' || uni.status === 'active';

            if (isActive) {
              return (
                <div
                  key={uni.id}
                  className="bg-white rounded-xl sm:rounded-2xl border-2 border-emerald-500 p-2.5 sm:p-3.5 md:p-4 shadow-2xs flex flex-col justify-between space-y-2.5 sm:space-y-3 hover:border-emerald-600 transition-all min-w-0"
                >
                  <div className="space-y-1 sm:space-y-2 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 rounded shrink-0">
                        {uni.code}
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 shrink-0" />
                        <span className="hidden xs:inline">AVAILABLE NOW</span>
                        <span className="xs:hidden">AVAILABLE</span>
                      </span>
                    </div>

                    <div className="min-w-0 pt-0.5">
                      <h3 className="font-extrabold text-xs sm:text-sm md:text-base text-neutral-900 truncate leading-snug">
                        {uni.name}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-neutral-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate">{uni.city}, {uni.state}</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => onSearchUniversity(uni.id)}
                      className="w-full py-1.5 sm:py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] sm:text-xs rounded-lg sm:rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer active:scale-98"
                    >
                      <span className="truncate">Explore accommodation</span>
                      <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    </button>
                  </div>
                </div>
              );
            }

            // Coming Soon Universities
            return (
              <div
                key={uni.id}
                className="bg-white rounded-xl sm:rounded-2xl border border-neutral-200 p-2.5 sm:p-3.5 md:p-4 shadow-2xs flex flex-col justify-between space-y-2.5 sm:space-y-3 hover:border-neutral-300 transition-all min-w-0"
              >
                <div className="space-y-1 sm:space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700 rounded shrink-0">
                      {uni.code}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-wider bg-black text-white shrink-0">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 shrink-0" />
                      <span>COMING SOON</span>
                    </span>
                  </div>

                  <div className="min-w-0 pt-0.5">
                    <h3 className="font-extrabold text-xs sm:text-sm md:text-base text-neutral-900 truncate leading-snug">
                      {uni.name}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-neutral-500 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                      <span className="truncate">{uni.city}, {uni.state}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => handleJoinWaitlist(uni.name)}
                    className="w-full py-1.5 sm:py-2 px-2 bg-neutral-900 hover:bg-black text-white font-bold text-[10px] sm:text-xs rounded-lg sm:rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer active:scale-98"
                  >
                    <span className="truncate">Join the waitlist</span>
                    <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-400 shrink-0" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* See All Universities CTA */}
        <div className="text-center pt-2">
          <button
            onClick={() => onOpenAllUniversities ? onOpenAllUniversities() : null}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-white hover:bg-neutral-100 text-neutral-900 font-extrabold text-xs rounded-xl border border-neutral-300 shadow-2xs transition-all cursor-pointer active:scale-98"
          >
            <span>See all universities</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
          </button>
        </div>

      </section>

      {/* 4. AGENT & CARETAKER PARTNERSHIP CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-neutral-900 text-white p-5 sm:p-8 rounded-2xl border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="space-y-1 max-w-xl text-center md:text-left">
            <span className="text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-widest block">For Property Caretakers & Lettings Agents</span>
            <h2 className="text-lg sm:text-2xl font-bold">List Your Student Property</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Reach verified university students directly. Publish self-contains and hostels, manage inspection schedules, and fill vacancies faster.
            </p>
          </div>

          <button
            onClick={onOpenOnboarding || onOpenAgentPortal}
            className="w-full md:w-auto px-5 py-2.5 sm:py-3 bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer text-center"
          >
            Register as Caretaker / Agent
          </button>
        </div>
      </section>

      {/* 5. FREQUENTLY ASKED QUESTIONS */}
      <section className="max-w-3xl mx-auto px-4 py-10 sm:py-12 space-y-6">
        <div className="text-center space-y-1">
          <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider block">Common Questions</span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <button
                onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                className="w-full text-left p-3.5 sm:p-4 text-xs font-bold text-neutral-900 flex items-center justify-between hover:bg-neutral-50 transition-colors cursor-pointer gap-2"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${openFaqIdx === idx ? 'rotate-180' : ''}`} />
              </button>
              {openFaqIdx === idx && (
                <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 text-xs text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
