import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Bell, 
  User as UserIcon, 
  ShieldCheck, 
  Filter, 
  ArrowLeft, 
  Building2, 
  CheckCircle2, 
  X, 
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Footprints,
  MapPin
} from 'lucide-react';
import { Listing, University, Campus, SearchFilters, PropertyType } from '../types';
import { ListingCard } from './ListingCard';
import { ListingGridSkeleton } from './SkeletonLoader';
import { ThemeToggle } from './ThemeToggle';

interface StudentDiscoverPageProps {
  listings: Listing[];
  isListingsLoading: boolean;
  savedIds: string[];
  onToggleSave: (id: string) => void;
  onOpenDetail: (listing: Listing) => void;
  onBookInspection: (listing: Listing) => void;
  onStartChat: (agentId: string, listingId: string) => void;
  universities: University[];
  selectedUniversityId: string;
  onSelectUniversity: (id: string) => void;
  selectedCampus?: Campus;
  notificationCount?: number;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  userAvatar?: string;
  userName?: string;
}

const PROPERTY_TYPES: { id: string; label: string }[] = [
  { id: 'all', label: 'All Room Types' },
  { id: 'self_contain', label: 'Self-Contain' },
  { id: 'single_room', label: 'Single Room' },
  { id: 'one_bedroom', label: '1-Bedroom Flat' },
  { id: 'shared_flat', label: 'Shared Flat' },
  { id: 'bedspace', label: 'Bedspace' },
  { id: 'studio', label: 'Studio / Lodge' },
  { id: 'ensuite', label: 'Ensuite Room' }
];

const AMENITY_OPTIONS = [
  '24/7 Water Supply',
  'Security Guard',
  'Prepaid Meter',
  'Tiled Floor',
  'Pop Ceiling',
  'Fenced Gate'
];

export const StudentDiscoverPage: React.FC<StudentDiscoverPageProps> = ({
  listings,
  isListingsLoading,
  savedIds,
  onToggleSave,
  onOpenDetail,
  onBookInspection,
  onStartChat,
  universities,
  selectedUniversityId,
  onSelectUniversity,
  selectedCampus,
  notificationCount = 0,
  onOpenNotifications,
  onOpenProfile,
  userAvatar,
  userName = 'Student'
}) => {
  // Navigation view mode: 'initial' (10 cards) vs 'full' (all cards + search & filters)
  const [viewMode, setViewMode] = useState<'initial' | 'full'>('initial');
  const [fullVisibleCount, setFullVisibleCount] = useState<number>(10);

  // Search & Filter States for Full Discovery Page
  const [searchTerm, setSearchTerm] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000000);
  const [maxWalkMinutes, setMaxWalkMinutes] = useState<number>(30);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [onlyVacant, setOnlyVacant] = useState<boolean>(false);

  // Notify Me Modal State
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState<boolean>(false);
  const [notifyEmail, setNotifyEmail] = useState<string>('');
  const [notifySuccess, setNotifySuccess] = useState<boolean>(false);

  // Resolve current university context from student profile / props
  const currentUniversity = useMemo(() => {
    return universities.find(u => u.id === selectedUniversityId) || 
           universities.find(u => u.id === 'uniosun') || 
           universities[0] || 
           { id: 'uniosun', name: 'Osun State University', code: 'UNIOSUN' };
  }, [universities, selectedUniversityId]);

  // STRICT REQUIREMENT 4: Only show hostels where universityId matches AND status/verification is approved
  const verifiedUniversityListings = useMemo(() => {
    return listings.filter(item => {
      const matchUni = item.universityId === currentUniversity.id || 
                       item.universityName?.toLowerCase().includes(currentUniversity.name.toLowerCase()) ||
                       item.universityName?.toLowerCase().includes(currentUniversity.code.toLowerCase());
      
      const isApproved = item.status === 'approved' || 
                         item.verificationStatus === 'approved' || 
                         item.isVerified === true;

      return matchUni && isApproved;
    });
  }, [listings, currentUniversity]);

  // Initial 10 Listings for the primary Discover View
  const initialTenListings = useMemo(() => {
    return verifiedUniversityListings.slice(0, 10);
  }, [verifiedUniversityListings]);

  // Filtered Listings for the Full Discovery Page
  const fullFilteredListings = useMemo(() => {
    return verifiedUniversityListings.filter(item => {
      // 1. Search term filter (title, address, description, propertyType)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchAddr = item.address.toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        const matchType = item.propertyType.toLowerCase().includes(q);
        if (!matchTitle && !matchAddr && !matchDesc && !matchType) return false;
      }

      // 2. Room Type filter
      if (selectedPropertyType !== 'all') {
        if (item.propertyType !== selectedPropertyType) return false;
      }

      // 3. Price filter
      const price = item.pricePerYear || 0;
      if (price < minPrice || price > maxPrice) return false;

      // 4. Max Walking Minutes filter
      if (item.walkingDistanceMinutes && item.walkingDistanceMinutes > maxWalkMinutes) {
        return false;
      }

      // 5. Amenities filter
      if (selectedAmenities.length > 0) {
        const itemFacilities = item.facilities || [];
        const matchesAllAmenities = selectedAmenities.every(a => itemFacilities.includes(a));
        if (!matchesAllAmenities) return false;
      }

      // 6. Availability filter
      if (onlyVacant) {
        if (item.unitStatus === 'occupied') return false;
      }

      return true;
    });
  }, [verifiedUniversityListings, searchTerm, selectedPropertyType, minPrice, maxPrice, maxWalkMinutes, selectedAmenities, onlyVacant]);

  // Paginated listings for Full Discovery view (10 per batch = 5 rows x 2 columns on mobile)
  const displayedFullListings = useMemo(() => {
    return fullFilteredListings.slice(0, fullVisibleCount);
  }, [fullFilteredListings, fullVisibleCount]);

  // Active filter count calculation
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedPropertyType !== 'all') count++;
    if (minPrice > 0 || maxPrice < 1000000) count++;
    if (maxWalkMinutes < 30) count++;
    if (selectedAmenities.length > 0) count += selectedAmenities.length;
    if (onlyVacant) count++;
    return count;
  }, [selectedPropertyType, minPrice, maxPrice, maxWalkMinutes, selectedAmenities, onlyVacant]);

  const handleToggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleResetFilters = () => {
    setSelectedPropertyType('all');
    setMinPrice(0);
    setMaxPrice(1000000);
    setMaxWalkMinutes(30);
    setSelectedAmenities([]);
    setOnlyVacant(false);
    setSearchTerm('');
    setFullVisibleCount(10);
  };

  const handleSubscribeNotification = (e: React.FormEvent) => {
    e.preventDefault();
    setNotifySuccess(true);
    setTimeout(() => {
      setIsNotifyModalOpen(false);
      setNotifySuccess(false);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-24 text-slate-900 dark:text-slate-100">
      
      {/* HEADER ZONE */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Top-Left: Logo & Brand */}
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="Dormiqa" className="h-8 w-auto object-contain" />
            <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">
              DORMIQA
            </span>
          </div>

          {/* Top-Right: Theme Toggle, Notifications & Profile Avatar */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle variant="dropdown" />

            <button
              onClick={onOpenNotifications}
              className="relative p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-neutral-200 dark:border-slate-700"
              title={userName}
            >
              <img
                src={userAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
            </button>
          </div>

        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ========================================================= */}
        {/* MODE A: INITIAL DISCOVER VIEW (10 LISTINGS, 2-COLUMN GRID) */}
        {/* ========================================================= */}
        {viewMode === 'initial' && (
          <div className="space-y-8">
            
            {/* 1. UNIVERSITY CONTEXT HEADER */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-500 dark:text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Student Housing
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Accommodation around {currentUniversity.code || currentUniversity.name}
                </h1>
                <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium">
                  Showing verified off-campus accommodation for {currentUniversity.name}
                </p>
              </div>

              {/* Quick Full Discovery Shortcut CTA */}
              <button
                onClick={() => setViewMode('full')}
                className="px-5 py-3 bg-slate-900 hover:bg-emerald-600 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 font-bold text-xs rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>Search & Filter All</span>
              </button>
            </div>

            {/* 2. LOADING STATE / CONTENT GRID */}
            {isListingsLoading ? (
              <div className="space-y-4">
                <p className="text-xs font-bold text-neutral-400 dark:text-slate-500">Loading verified accommodation...</p>
                <ListingGridSkeleton count={6} />
              </div>
            ) : verifiedUniversityListings.length === 0 ? (
              /* EMPTY STATE FOR UNIVERSITY WITH NO APPROVED LISTINGS */
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200 dark:border-slate-800 p-8 max-w-xl mx-auto space-y-4 shadow-xs">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                  <Building2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    No verified accommodation is available around your university yet.
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 max-w-md mx-auto">
                    We are actively onboarding verified caretakers and lodges around {currentUniversity.name}. Be the first to get notified when listings open!
                  </p>
                </div>
                <button
                  onClick={() => setIsNotifyModalOpen(true)}
                  className="mt-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  <span>Notify me when new hostels are available</span>
                </button>
              </div>
            ) : (
              /* INITIAL 10 LISTINGS - RESPONSIVE 2-COLUMN GRID LAYOUT */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Verified Listings</span>
                    <span className="text-xs font-bold text-neutral-400 dark:text-slate-500 font-normal">
                      (Showing {initialTenListings.length} of {verifiedUniversityListings.length})
                    </span>
                  </h2>
                </div>

                {/* DESKTOP 2-COLUMN (5 Left, 5 Right) / MOBILE 2-COLUMN GRID (5 Rows of 2 Cards) */}
                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-6">
                  {initialTenListings.map(listing => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      isSaved={savedIds.includes(listing.id)}
                      onToggleSave={onToggleSave}
                      onOpenDetail={onOpenDetail}
                      onBookInspection={onBookInspection}
                      onStartChat={onStartChat}
                      selectedCampus={selectedCampus}
                    />
                  ))}
                </div>

                {/* 3. SEE MORE HOSTELS BUTTON */}
                {verifiedUniversityListings.length > 10 && (
                  <div className="pt-6 text-center">
                    <button
                      onClick={() => setViewMode('full')}
                      className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 hover:bg-slate-900 hover:text-white dark:hover:bg-emerald-600 text-slate-900 dark:text-white border-2 border-slate-900 dark:border-emerald-500 rounded-2xl font-black text-sm transition-all shadow-xs cursor-pointer inline-flex items-center justify-center gap-2 group"
                    >
                      <span>See more hostels →</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* MODE B: FULL DISCOVERY PAGE (SEARCH, FILTERS, ALL RESULTS) */}
        {/* ========================================================= */}
        {viewMode === 'full' && (
          <div className="space-y-6">
            
            {/* TOP BAR: BACK BUTTON & UNIVERSITY TITLE */}
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-neutral-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode('initial')}
                  className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800 text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Back to Discover"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    All hostels around {currentUniversity.code || currentUniversity.name}
                  </h1>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 font-medium">
                    {fullFilteredListings.length} {fullFilteredListings.length === 1 ? 'verified hostel' : 'verified hostels'} found
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewMode('initial')}
                className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
              >
                Close Full Discovery
              </button>
            </div>

            {/* SEARCH BAR & FILTERS TRIGGER */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Field */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search hostels by title, area, lodge name..."
                  className="w-full pl-11 pr-10 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium shadow-xs"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Filters Panel Toggle Button */}
              <button
                onClick={() => setShowFiltersPanel(prev => !prev)}
                className={`px-4 py-3.5 rounded-2xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                  showFiltersPanel || activeFilterCount > 0
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white border-slate-900 dark:border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-neutral-700 dark:text-slate-200 border-neutral-200 dark:border-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* EXPANDABLE FILTERS PANEL */}
            {showFiltersPanel && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-neutral-200 dark:border-slate-800 space-y-6 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-slate-800">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Filter className="w-4 h-4 text-emerald-600" />
                    <span>Filter Accommodation Criteria</span>
                  </h3>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={handleResetFilters}
                      className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 1. Room Type Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-700 dark:text-slate-300">
                      Room / Property Type
                    </label>
                    <select
                      value={selectedPropertyType}
                      onChange={(e) => setSelectedPropertyType(e.target.value)}
                      className="w-full p-3 bg-neutral-50 dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {PROPERTY_TYPES.map(pt => (
                        <option key={pt.id} value={pt.id}>{pt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Maximum Rent Filter */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <label className="text-neutral-700 dark:text-slate-300">Max Annual Rent</label>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ₦{maxPrice.toLocaleString()} / yr
                      </span>
                    </div>
                    <input
                      type="range"
                      min="100000"
                      max="1200000"
                      step="50000"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* 3. Max Walk Time Filter */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <label className="text-neutral-700 dark:text-slate-300">Max Walk to Gate</label>
                      <span className="text-emerald-600 dark:text-emerald-400">{maxWalkMinutes} mins</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="5"
                      value={maxWalkMinutes}
                      onChange={(e) => setMaxWalkMinutes(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 4. Amenities & Vacancy Toggles */}
                <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-slate-800">
                  <label className="text-xs font-bold text-neutral-700 dark:text-slate-300">
                    Hostel Facilities / Amenities
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {AMENITY_OPTIONS.map(amenity => {
                      const active = selectedAmenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => handleToggleAmenity(amenity)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            active
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-neutral-50 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 border-neutral-200 dark:border-slate-700 hover:border-emerald-500'
                          }`}
                        >
                          {amenity}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={onlyVacant}
                        onChange={(e) => setOnlyVacant(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                      />
                      <span>Only show hostels with vacant units</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* FULL RESULTS GRID / EMPTY STATE */}
            {isListingsLoading ? (
              <ListingGridSkeleton count={6} />
            ) : fullFilteredListings.length === 0 ? (
              /* EMPTY STATE WHEN NO HOSTELS MATCH SEARCH / FILTERS */
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200 dark:border-slate-800 p-8 max-w-md mx-auto space-y-4 shadow-xs">
                <Building2 className="w-10 h-10 text-neutral-300 dark:text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    No verified accommodation matches your search criteria
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-slate-400">
                    Try clearing search terms or resetting filters to see more hostels around {currentUniversity.code}.
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-slate-900 text-white dark:bg-emerald-600 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Reset Filters
                  </button>
                  <button
                    onClick={() => setIsNotifyModalOpen(true)}
                    className="px-4 py-2 border border-neutral-200 dark:border-slate-700 text-xs font-bold rounded-xl hover:bg-neutral-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Notify Me
                  </button>
                </div>
              </div>
            ) : (
              /* FULL RESULTS LISTING GRID (2-COLUMNS ON MOBILE: 5 ROWS PER PAGE) */
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {displayedFullListings.map(listing => (
                    <ListingCard
                      key={`full-${listing.id}`}
                      listing={listing}
                      isSaved={savedIds.includes(listing.id)}
                      onToggleSave={onToggleSave}
                      onOpenDetail={onOpenDetail}
                      onBookInspection={onBookInspection}
                      onStartChat={onStartChat}
                      selectedCampus={selectedCampus}
                    />
                  ))}
                </div>

                {/* LOAD MORE HOSTELS BUTTON IN FULL DISCOVERY MODE */}
                {fullFilteredListings.length > fullVisibleCount && (
                  <div className="pt-6 text-center">
                    <button
                      onClick={() => setFullVisibleCount(prev => prev + 10)}
                      className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-emerald-600 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-2xl font-black text-xs transition-all shadow-xs cursor-pointer inline-flex items-center justify-center gap-2"
                    >
                      <span>Load 10 More Hostels ({fullFilteredListings.length - fullVisibleCount} remaining) ↓</span>
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {/* ========================================================= */}
      {/* NOTIFY ME WAITLIST / NOTIFICATION MODAL */}
      {/* ========================================================= */}
      {isNotifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-neutral-200 dark:border-slate-800 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsNotifyModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {notifySuccess ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">You're on the list!</h3>
                <p className="text-xs text-neutral-500 dark:text-slate-400">
                  We'll send an email alert as soon as new verified accommodation is approved around {currentUniversity.name}.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubscribeNotification} className="space-y-4">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Bell className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Get Notified for {currentUniversity.code || currentUniversity.name}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 font-medium">
                    Receive instant alerts when new verified off-campus student accommodation becomes available near campus.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-slate-300">Email Address</label>
                  <input
                    type="email"
                    required
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Notify Me
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
