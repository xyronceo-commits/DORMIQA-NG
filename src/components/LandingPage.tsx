import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Footprints, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Calendar, 
  MessageSquare, 
  ChevronDown, 
  Star, 
  Building2, 
  Users, 
  Shield, 
  Lock,
  Zap,
  Droplets,
  Check,
  Sparkles,
  SlidersHorizontal,
  PhoneCall
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
  savedIds: string[];
  onToggleSave: (id: string) => void;
  onOpenAgentPortal: () => void;
  onOpenOnboarding?: () => void;
  onOpenAISearch?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  universities,
  featuredListings,
  recentListings,
  onSearchUniversity,
  onOpenListingDetail,
  onBookInspection,
  savedIds,
  onToggleSave,
  onOpenAgentPortal,
  onOpenOnboarding,
  onOpenAISearch
}) => {
  const [heroUniId, setHeroUniId] = useState(universities[0]?.id || 'unilag');
  const [heroPropType, setHeroPropType] = useState<string>('all');
  const [heroMaxBudget, setHeroMaxBudget] = useState<number>(1000000);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [uniSearchQuery, setUniSearchQuery] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'listings' | 'roommates'>('listings');

  const availableStates = ['all', ...Array.from(new Set(universities.map(u => u.state)))];

  const displayedUniversities = universities.filter(u => {
    const matchesState = selectedStateFilter === 'all' || u.state === selectedStateFilter;
    const matchesSearch = !uniSearchQuery || 
      u.name.toLowerCase().includes(uniSearchQuery.toLowerCase()) || 
      u.city.toLowerCase().includes(uniSearchQuery.toLowerCase()) || 
      u.state.toLowerCase().includes(uniSearchQuery.toLowerCase()) ||
      u.code.toLowerCase().includes(uniSearchQuery.toLowerCase());
    return matchesState && matchesSearch;
  });

  const sampleRoommateRequests = [
    {
      id: 'rm-1',
      name: 'Blessing A.',
      dept: '300L Accounting',
      uni: 'UNILAG (Akoka)',
      location: 'Abule Oja Gate',
      budget: '₦250,000/yr',
      lookingFor: 'Female Flatmate',
      details: 'Looking for a tidy, quiet female student to split an executive self-contain with solar inverter setup.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      verifiedStudent: true
    },
    {
      id: 'rm-2',
      name: 'Tobi & Segun',
      dept: '200L Computer Engr',
      uni: 'FUTA (Akure)',
      location: 'South Gate Axis',
      budget: '₦180,000/yr each',
      lookingFor: '3rd Male Flatmate',
      details: 'Spacious 2-bedroom lodge with fenced gate, borehole water, and steady light schedule.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      verifiedStudent: true
    },
    {
      id: 'rm-3',
      name: 'Aminat M.',
      dept: '400L Medicine (MBBS)',
      uni: 'University of Ibadan (UI)',
      location: 'Agbowo Opposite Gate',
      budget: '₦300,000/yr',
      lookingFor: 'Female Roommate',
      details: 'Needs a serious-minded study buddy for a furnished 1-bedroom flat near UCH / UI main gate.',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      verifiedStudent: true
    }
  ];

  const faqs = [
    {
      q: "How does Campora verify caretakers and property agents?",
      a: "Every caretaker or agent provides business details, proof of business (banner, logo, office photo, or CAC), confirms agency or property management authority, and submits verifiable property location details before listings go live."
    },
    {
      q: "Are the campus walking distances accurate?",
      a: "Yes. Walking distances are measured directly from the lodge gate to the university main gate or central library using pedestrian routing, preventing fake claims."
    },
    {
      q: "Does Campora charge agency or inspection search fees?",
      a: "No search fees. You can browse all verified listings and book inspection appointments directly for free. Agent fees, legal agreements, and rent terms are transparently listed upfront."
    },
    {
      q: "How does roommate matching work on Campora?",
      a: "Verified students can post roommate requests specifying budget split, preferred department, and house rules. All roommate profiles undergo student ID verification."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* 1. HERO SECTION - Compact, Purposeful & High-Impact */}
      <section className="border-b border-neutral-200 bg-neutral-50/50 pt-8 pb-12 sm:pt-12 sm:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Hero Left Column: Headline & Search Focal Point */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 tracking-tight leading-[1.15] text-center">
                Verified Student Housing Near Your Campus Gate.
              </h1>

              {/* Supporting Text */}
              <p className="text-sm sm:text-base text-neutral-600 font-normal leading-relaxed max-w-xl mx-auto text-center">
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
                        <option key={u.id} value={u.id}>{u.code} — {u.city}</option>
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
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    onClick={() => onOpenOnboarding ? onOpenOnboarding() : onSearchUniversity(heroUniId)}
                    className="w-full sm:flex-1 py-3 bg-neutral-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <Search className="w-4 h-4 text-emerald-400" />
                    <span>Search Verified Accommodation</span>
                  </button>

                  <button
                    onClick={() => onOpenOnboarding ? onOpenOnboarding() : (onOpenAISearch && onOpenAISearch())}
                    className="w-full sm:w-auto px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>AI Matcher</span>
                  </button>
                </div>
              </div>

              {/* Quick Trust Highlights */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-neutral-500 pt-1">
                <span className="flex items-center gap-1.5"><Footprints className="w-4 h-4 text-neutral-700" /> 3–15 min walk to campus</span>
                <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-500" /> Solar / Inverter details</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Physical inspection verified</span>
              </div>

            </div>

            {/* Hero Right Column: Product Showcase Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-neutral-300 p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Listing Preview
                  </span>
                </div>

                <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                  <img 
                    src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80" 
                    alt="Executive Self Contain" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-neutral-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <Footprints className="w-3 h-3 text-emerald-400" /> 4 min walk to Main Gate
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 bg-white text-neutral-900 font-extrabold text-xs px-2.5 py-1 rounded shadow-xs">
                    ₦450,000 <span className="text-[10px] font-normal text-neutral-500">/ year</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-sm text-neutral-900">Executive Tiled Self-Contain Studio</h3>
                  
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">⚡ 24/7 Solar Backup</span>
                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">💧 Running Water Tap</span>
                    <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded">🔒 Fenced Gate & Security</span>
                  </div>
                </div>

                <button
                  onClick={() => onOpenOnboarding ? onOpenOnboarding() : onSearchUniversity('unilag')}
                  className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                >
                  <span>Explore UNILAG Listings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 2. CAMPUS ACCOMMODATION DIRECTORY (Varying Layout: Filter Tabs + Horizontal / Grid) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-200 pb-4">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">Available Lodgings</span>
            <h2 className="text-2xl font-extrabold text-neutral-900">Featured Student Accommodation</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Inspected properties with clear walking distances and upfront caretaker terms.</p>
          </div>

          <button
            onClick={() => onOpenOnboarding ? onOpenOnboarding() : onSearchUniversity(heroUniId)}
            className="self-start md:self-auto text-xs font-bold text-neutral-900 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>View All Listings</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredListings.slice(0, 6).map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isSaved={savedIds.includes(listing.id)}
              onToggleSave={() => onOpenOnboarding ? onOpenOnboarding() : onToggleSave(listing.id)}
              onOpenDetail={() => onOpenOnboarding ? onOpenOnboarding() : onOpenListingDetail(listing)}
              onBookInspection={() => onOpenOnboarding ? onOpenOnboarding() : onBookInspection(listing)}
            />
          ))}
        </div>
      </section>

      {/* 3. SPLIT FEATURE HIGHLIGHT - "Why Campora Works for Students" */}
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
            
            {/* Feature 1 */}
            <div className="bg-neutral-800/80 p-5 rounded-xl border border-neutral-700/70 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white">Physical Caretaker Verification</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Every caretaker ID and property management claim is checked before publishing. No ghost agents.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-neutral-800/80 p-5 rounded-xl border border-neutral-700/70 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Footprints className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white">Pedestrian Gate Distance</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Accurate walking minutes to campus gate or library quad, avoiding unexpected daily transportation costs.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-neutral-800/80 p-5 rounded-xl border border-neutral-700/70 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white">Power & Water Specs</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Clear reports on solar inverter backup, PHCN light schedule, and borehole water tap availability.
              </p>
            </div>

            {/* Feature 4 */}
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

      {/* 4. VERIFIED ROOMMATE MATCHER (Specialized Student Need) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-200 pb-4">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">Shared Living & Budget Splitting</span>
            <h2 className="text-2xl font-extrabold text-neutral-900">Verified Roommate Requests</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Connect with verified students seeking flatmates to share rent and utility costs.</p>
          </div>

          <button
            onClick={onOpenOnboarding}
            className="px-4 py-2 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-all"
          >
            Post Roommate Request
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sampleRoommateRequests.map((rm) => (
            <div key={rm.id} className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3 hover:border-neutral-300 transition-all shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img src={rm.avatar} alt={rm.name} className="w-10 h-10 rounded-full object-cover border border-neutral-200" />
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900">{rm.name}</h3>
                  </div>
                </div>

                <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 font-medium">Location:</span>
                    <span className="font-bold text-neutral-800">{rm.location}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 font-medium">Budget Share:</span>
                    <span className="font-extrabold text-emerald-700">{rm.budget}</span>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed italic">
                  "{rm.details}"
                </p>
              </div>

              <button
                onClick={onOpenOnboarding}
                className="w-full py-2 mt-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-neutral-600" />
                <span>Connect with {rm.name.split(' ')[0]}</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 5. POPULAR UNIVERSITIES CATALOG */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 bg-neutral-50/60 border-y border-neutral-200">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">National Campus Network</span>
            <h2 className="text-2xl font-extrabold text-neutral-900">Higher Institutions Covered</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Select your campus to view nearby off-campus lodges and student hostelling hubs.</p>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search university..."
              value={uniSearchQuery}
              onChange={(e) => setUniSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 bg-white text-xs font-semibold focus:outline-none focus:border-neutral-900"
            />
          </div>
        </div>

        {/* State Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {availableStates.map(st => (
            <button
              key={st}
              onClick={() => setSelectedStateFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedStateFilter === st
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
              }`}
            >
              {st === 'all' ? 'All States' : st}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayedUniversities.map((uni) => (
            <div
              key={uni.id}
              onClick={() => onOpenOnboarding ? onOpenOnboarding() : onSearchUniversity(uni.id)}
              className="group bg-white p-4 rounded-xl border border-neutral-200 hover:border-neutral-400 cursor-pointer transition-all shadow-xs flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded">
                    {uni.code}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700">
                    {uni.totalListings} Listings
                  </span>
                </div>
                <h3 className="font-extrabold text-sm text-neutral-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
                  {uni.name}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">{uni.city}, {uni.state}</p>
              </div>

              <div className="text-[11px] font-bold text-neutral-900 flex items-center justify-between pt-2 border-t border-neutral-100">
                <span>Explore Lodges</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. REAL STUDENT TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Student Experiences</span>
          <h2 className="text-2xl font-extrabold text-neutral-900">What Students Say</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-3 shadow-xs">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />)}
            </div>
            <p className="text-xs text-neutral-700 leading-relaxed italic">
              "Finding an executive self-contain in Abule Oja, 4 minutes from UNILAG main gate, was quick. The 24/7 solar backup detail was accurate."
            </p>
            <div className="flex items-center gap-3 pt-1">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" alt="" className="w-8 h-8 rounded-full object-cover" />
              <div>
                <h4 className="text-xs font-bold text-neutral-900">Chinedu Okonkwo</h4>
                <p className="text-[10px] text-neutral-500">BSc Computer Science, UNILAG</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-3 shadow-xs">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />)}
            </div>
            <p className="text-xs text-neutral-700 leading-relaxed italic">
              "As a medical student at UI, staying in Agbowo right opposite the gate saves me hours. Inspected and booked online directly."
            </p>
            <div className="flex items-center gap-3 pt-1">
              <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80" alt="" className="w-8 h-8 rounded-full object-cover" />
              <div>
                <h4 className="text-xs font-bold text-neutral-900">Yetunde Bakare</h4>
                <p className="text-[10px] text-neutral-500">MBBS Medicine, University of Ibadan</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-3 shadow-xs">
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />)}
            </div>
            <p className="text-xs text-neutral-700 leading-relaxed italic">
              "Every listing shows exact walking distance to FUTA South Gate with verified borehole water tap status. No surprise agent fees."
            </p>
            <div className="flex items-center gap-3 pt-1">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" alt="" className="w-8 h-8 rounded-full object-cover" />
              <div>
                <h4 className="text-xs font-bold text-neutral-900">Damilola Adeyemi</h4>
                <p className="text-[10px] text-neutral-500">BEng Electrical Engineering, FUTA</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. AGENT & CARETAKER PARTNERSHIP CTA */}
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
            className="px-5 py-3 bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs rounded-xl transition-all shrink-0"
          >
            Register as Caretaker / Agent
          </button>
        </div>
      </section>

      {/* 8. FREQUENTLY ASKED QUESTIONS */}
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
                className="w-full text-left p-4 text-xs font-bold text-neutral-900 flex items-center justify-between hover:bg-neutral-50 transition-colors"
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
