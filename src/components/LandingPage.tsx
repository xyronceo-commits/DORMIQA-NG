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
import { ListingCard } from './ListingCard';

interface LandingPageProps {
  universities: University[];
  featuredListings: Listing[];
  recentListings: Listing[];
  onSearchUniversity: (uniId: string) => void;
  onOpenListingDetail: (listing: Listing) => void;
  onBookInspection: (listing: Listing) => void;
  onStartChat?: (agentId: string, listingId: string) => void;
  savedIds: string[];
  onToggleSave: (id: string) => void;
  onOpenAgentPortal: () => void;
  onOpenOnboarding?: () => void;
  onOpenAllUniversities?: () => void;
}

const WAITLIST_BASE_URL = 'https://dormiqa-waitlist.vercel.app';

export const LandingPage: React.FC<LandingPageProps> = ({
  universities,
  featuredListings,
  onSearchUniversity,
  onOpenListingDetail,
  onBookInspection,
  onStartChat,
  savedIds,
  onToggleSave,
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
  
  const featuredUniversities = FEATURED_UNI_IDS
    .map(id => universities.find(u => u.id === id))
    .filter(Boolean) as University[];

  // Fallback if list is smaller than 7
  if (featuredUniversities.length < 7) {
    const remaining = universities.filter(u => !featuredUniversities.some(fu => fu.id === u.id));
    featuredUniversities.push(...remaining.slice(0, 7 - featuredUniversities.length));
  }

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
      <section className="border-b border-neutral-200 bg-neutral-50/50 pt-8 pb-12 sm:pt-12 sm:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Hero Left Column: Headline & Search */}
            <div className="lg:col-span-7 space-y-6">
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 tracking-tight leading-[1.15] text-center lg:text-left">
                Verified Student Housing Near Your Campus Gate.
              </h1>

              <p className="text-sm sm:text-base text-neutral-600 font-normal leading-relaxed max-w-xl mx-auto lg:mx-0 text-center lg:text-left">
                Find student self-contains, single rooms, 1-bedroom flats, and flatmate spaces around UNILAG, UI, OAU, FUTA, LASU, and 30+ institutions. Verified caretakers, real walking distances, zero scam fees.
              </p>

              {/* Primary Search Container */}
              <div className="bg-white p-3 rounded-2xl border border-neutral-300 shadow-sm space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  
                  {/* Select Campus */}
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">1. Campus</label>
                    <select
                      value={heroUniId}
                      onChange={(e) => setHeroUniId(e.target.value)}
                      className="bg-transparent text-xs font-bold text-neutral-900 focus:outline-none w-full cursor-pointer truncate"
                    >
                      {universities.map(u => (
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
                      <option value="bedspace">Bedspace / Roommate</option>
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
                        const targetUni = universities.find(u => u.id === heroUniId);
                        handleJoinWaitlist(targetUni?.name || heroUniId.toUpperCase());
                      } else if (onOpenOnboarding) {
                        onOpenOnboarding();
                      } else {
                        onSearchUniversity('uniosun');
                      }
                    }}
                    className="w-full py-3.5 bg-neutral-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
                  >
                    <Search className="w-4 h-4 text-emerald-400" />
                    <span>
                      {heroUniId !== 'uniosun' ? 'Join Launch Waitlist' : 'Search Verified Accommodation'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Quick Trust Highlights */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-medium text-neutral-500 pt-1">
                <span className="flex items-center gap-1.5"><Footprints className="w-4 h-4 text-neutral-700" /> 3–15 min walk to campus</span>
                <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-500" /> Solar / Inverter details</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Physical inspection verified</span>
              </div>

            </div>

            {/* Hero Right Column: Real-Time Platform Standards */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-neutral-300 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <span className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Physical Property Verification
                  </span>
                  <span className="text-[10px] font-semibold text-neutral-400">Dormiqa NG</span>
                </div>

                <div className="space-y-3 text-xs text-neutral-600">
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Strict Physical Inspection</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 pl-6">
                      Every student lodge listed undergoes location verification to confirm actual walking distance to campus gates.
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Transparent Utilities Audit</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 pl-6">
                      Borehole water pumps, prepaid PHCN meters, and solar inverter specs are explicitly documented before going live.
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Verified Caretakers & Agents</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 pl-6">
                      Direct contact with verified lodge caretakers and property managers — zero ghost agent search fees.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onOpenAgentPortal()}
                  className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>Agent / Caretaker Listing Portal</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 2. FEATURED STUDENT ACCOMMODATION (Live UNIOSUN Lodgings) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-200 pb-4">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">UNIOSUN Live Lodgings</span>
            <h2 className="text-2xl font-extrabold text-neutral-900">Featured Student Accommodation</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Inspected properties around UNIOSUN campuses with verified walking distances.</p>
          </div>

          <button
            onClick={() => onOpenOnboarding ? onOpenOnboarding() : onSearchUniversity('uniosun')}
            className="self-start md:self-auto text-xs font-bold text-neutral-900 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Explore All Accommodation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredListings.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-neutral-200 p-8 max-w-md mx-auto space-y-3 shadow-2xs">
              <Building2 className="w-8 h-8 text-neutral-400 mx-auto" />
              <p className="text-sm font-bold text-slate-900">No active listings uploaded yet</p>
              <p className="text-xs text-neutral-500">Real-time listings uploaded by verified agents will appear here as soon as they are submitted.</p>
              <button
                onClick={() => onOpenAgentPortal()}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                <span>Upload First Listing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            featuredListings.slice(0, 6).map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isSaved={savedIds.includes(listing.id)}
                onToggleSave={() => onOpenOnboarding ? onOpenOnboarding() : onToggleSave(listing.id)}
                onOpenDetail={() => onOpenOnboarding ? onOpenOnboarding() : onOpenListingDetail(listing)}
                onBookInspection={() => onOpenOnboarding ? onOpenOnboarding() : onBookInspection(listing)}
                onStartChat={(agentId, listingId) => {
                  if (onOpenOnboarding) {
                    onOpenOnboarding();
                  } else if (onStartChat) {
                    onStartChat(agentId, listingId);
                  }
                }}
              />
            ))
          )}
        </div>
      </section>

      {/* 3. CORE PILLARS / HOW DORMIQA WORKS */}
      <section className="bg-neutral-900 text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="max-w-2xl">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">Built for Student Peace of Mind</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold">Eliminating the stress of finding campus housing.</h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed">
              We replaced fake street agent claims with physical property verification, transparent utility specs, and direct caretaker booking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-neutral-800/80 p-5 rounded-xl border border-neutral-700/70 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white">Physical Caretaker Verification</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Every caretaker ID and property management claim is checked before publishing. No ghost agents.
              </p>
            </div>

            <div className="bg-neutral-800/80 p-5 rounded-xl border border-neutral-700/70 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Footprints className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white">Pedestrian Gate Distance</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Accurate walking minutes to campus gate or library quad, avoiding unexpected daily transportation costs.
              </p>
            </div>

            <div className="bg-neutral-800/80 p-5 rounded-xl border border-neutral-700/70 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white">Power & Water Specs</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Clear reports on solar inverter backup, PHCN light schedule, and borehole water tap availability.
              </p>
            </div>

            <div className="bg-neutral-800/80 p-5 rounded-xl border border-neutral-700/70 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white">Direct Inspection Scheduling</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Schedule physical tours or live video walkthroughs directly without endless phone tag or hidden search fees.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 4. CURATED UNIVERSITY SECTION (6-7 Featured Universities) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8 bg-neutral-50/70 border-y border-neutral-200">
        
        {/* Section Heading */}
        <div className="max-w-2xl space-y-1.5 text-center sm:text-left">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
            Institutional Expansion
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Find accommodation around universities in Nigeria
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600">
            Discover verified student accommodation around your university.
          </p>
        </div>

        {/* Responsive Grid of 6-7 Featured Universities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredUniversities.map((uni) => {
            const isActive = uni.id === 'uniosun' || uni.status === 'active';

            if (isActive) {
              return (
                <div
                  key={uni.id}
                  className="bg-white rounded-2xl border-2 border-emerald-500 p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-600 transition-all"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 rounded">
                        {uni.code}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        AVAILABLE NOW
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-neutral-900">
                        {uni.name}
                      </h3>
                      <p className="text-xs font-semibold text-emerald-800 mt-0.5">
                        Accommodation around UNIOSUN
                      </p>
                      <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{uni.city}, {uni.state}</span>
                      </p>
                    </div>

                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                      {uni.description}
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => onSearchUniversity(uni.id)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <span>Explore accommodation</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            }

            // Coming Soon Universities
            return (
              <div
                key={uni.id}
                className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-neutral-300 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700 rounded">
                      {uni.code}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" />
                      COMING SOON
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-neutral-900 line-clamp-1">
                      {uni.name}
                    </h3>
                    <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{uni.city}, {uni.state}</span>
                    </p>
                  </div>

                  <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
                    <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                      Be the first to know when Dormiqa launches at <span className="font-extrabold text-neutral-900">{uni.name}</span>.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleJoinWaitlist(uni.name)}
                    className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <span>Join the waitlist</span>
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
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
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-neutral-100 text-neutral-900 font-extrabold text-xs rounded-xl border border-neutral-300 shadow-2xs transition-all cursor-pointer active:scale-98"
          >
            <span>See all universities</span>
            <ArrowRight className="w-4 h-4 text-emerald-600" />
          </button>
        </div>

      </section>

      {/* 5. AGENT & CARETAKER PARTNERSHIP CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-neutral-900 text-white p-6 sm:p-8 rounded-2xl border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">For Property Caretakers & Lettings Agents</span>
            <h2 className="text-xl sm:text-2xl font-bold">List Your Student Property</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Reach verified university students directly. Publish self-contains and hostels, manage inspection schedules, and fill vacancies faster.
            </p>
          </div>

          <button
            onClick={onOpenOnboarding || onOpenAgentPortal}
            className="px-5 py-3 bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer"
          >
            Register as Caretaker / Agent
          </button>
        </div>
      </section>

      {/* 6. FREQUENTLY ASKED QUESTIONS */}
      <section className="max-w-3xl mx-auto px-4 py-12 space-y-6">
        <div className="text-center space-y-1">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Common Questions</span>
          <h2 className="text-2xl font-extrabold text-neutral-900">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <button
                onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                className="w-full text-left p-4 text-xs font-bold text-neutral-900 flex items-center justify-between hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${openFaqIdx === idx ? 'rotate-180' : ''}`} />
              </button>
              {openFaqIdx === idx && (
                <div className="px-4 pb-4 text-xs text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3">
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
