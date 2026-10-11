import React, { useState, useMemo, useRef } from 'react';
import { 
  Search, 
  Bell, 
  MapPin, 
  SlidersHorizontal, 
  X, 
  Building2, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Check,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Listing, University, Campus, PropertyType } from '../types';
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
  { id: 'studio', label: 'Studio Lodge' },
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
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showUniDropdown, setShowUniDropdown] = useState(false);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000000);
  const [maxWalkMinutes, setMaxWalkMinutes] = useState<number>(30);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [onlyVacant, setOnlyVacant] = useState<boolean>(false);
  const [onlyRecommendedFilter, setOnlyRecommendedFilter] = useState<boolean>(false);

  // Notify Me Modal State
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState<boolean>(false);
  const [notifyEmail, setNotifyEmail] = useState<string>('');
  const [notifySuccess, setNotifySuccess] = useState<boolean>(false);

  // Horizontal scroll container ref for Recommend for You
  const recommendScrollRef = useRef<HTMLDivElement>(null);

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Format student first name cleanly
  const studentFirstName = useMemo(() => {
    if (!userName || userName.trim() === '') return 'Student';
    const first = userName.split(' ')[0].trim();
    return first.charAt(0).toUpperCase() + first.slice(1);
  }, [userName]);

  // Resolve current university context
  const currentUniversity = useMemo(() => {
    return universities.find(u => u.id === selectedUniversityId) || 
           universities.find(u => u.id === 'uniosun') || 
           universities[0] || 
           { id: 'uniosun', name: 'Osun State University', code: 'UNIOSUN', city: 'Osogbo' };
  }, [universities, selectedUniversityId]);

  // Filter legitimate approved listings matching the university
  const legitimateUniversityListings = useMemo(() => {
    return listings.filter(item => {
      const matchUni = item.universityId === currentUniversity.id || 
                       item.universityName?.toLowerCase().includes(currentUniversity.name.toLowerCase()) ||
                       item.universityName?.toLowerCase().includes(currentUniversity.code.toLowerCase());
      
      const isApprovedStatus = (item.status === 'published' || 
                                item.status === 'approved' || 
                                item.verificationStatus === 'published' || 
                                item.verificationStatus === 'approved') &&
                               item.status !== 'draft' &&
                               item.status !== 'uploading' &&
                               item.status !== 'upload_failed' &&
                               item.status !== 'incomplete' &&
                               item.status !== 'rejected' &&
                               item.status !== 'banned' &&
                               item.status !== 'removed';

      // Real listings only
      const hasFrontPhoto = Boolean(item.photos && Array.isArray(item.photos) && item.photos.length > 0 && item.photos[0]);

      return matchUni && isApprovedStatus && hasFrontPhoto;
    });
  }, [listings, currentUniversity]);

  // RECOMMEND FOR YOU: ADMIN CONTROL
  // Admin can promote a published listing (isPromoted === true or featured === true)
  // If Admin has promoted nothing, use legitimate published listings fallback logic (never fake properties!)
  const recommendedListings = useMemo(() => {
    const adminPromoted = legitimateUniversityListings.filter(l => l.isPromoted || l.featured);
    if (adminPromoted.length > 0) {
      return adminPromoted;
    }
    // Defined fallback logic: legitimate published listings (sorted by vacancies or newest)
    return legitimateUniversityListings.slice(0, 6);
  }, [legitimateUniversityListings]);

  // NORMAL LISTINGS: "Nearby Accommodation"
  // Filtered by Search Term & active Filter Modal parameters
  const nearbyAccommodationListings = useMemo(() => {
    return legitimateUniversityListings.filter(item => {
      // "See all" recommended mode filter
      if (onlyRecommendedFilter) {
        if (!item.isPromoted && !item.featured) return false;
      }

      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchHotel = item.hotelName?.toLowerCase().includes(q);
        const matchAddr = item.address?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchType = item.propertyType?.toLowerCase().includes(q);
        if (!matchTitle && !matchHotel && !matchAddr && !matchDesc && !matchType) return false;
      }

      // Room Type filter
      if (selectedPropertyType !== 'all') {
        if (item.propertyType !== selectedPropertyType) return false;
      }

      // Price filter
      const price = item.pricePerYear || 0;
      if (price < minPrice || price > maxPrice) return false;

      // Walking Minutes filter
      if (item.walkingDistanceMinutes && item.walkingDistanceMinutes > maxWalkMinutes) {
        return false;
      }

      // Amenities filter
      if (selectedAmenities.length > 0) {
        const itemFacilities = item.facilities || [];
        const matchesAll = selectedAmenities.every(a => itemFacilities.includes(a));
        if (!matchesAll) return false;
      }

      // Only Vacant
      if (onlyVacant) {
        if (item.unitStatus === 'occupied') return false;
      }

      return true;
    });
  }, [legitimateUniversityListings, onlyRecommendedFilter, searchTerm, selectedPropertyType, minPrice, maxPrice, maxWalkMinutes, selectedAmenities, onlyVacant]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedPropertyType !== 'all') count++;
    if (minPrice > 0 || maxPrice < 1000000) count++;
    if (maxWalkMinutes < 30) count++;
    if (selectedAmenities.length > 0) count += selectedAmenities.length;
    if (onlyVacant) count++;
    return count;
  }, [selectedPropertyType, minPrice, maxPrice, maxWalkMinutes, selectedAmenities, onlyVacant]);

  const handleResetFilters = () => {
    setSelectedPropertyType('all');
    setMinPrice(0);
    setMaxPrice(1000000);
    setMaxWalkMinutes(30);
    setSelectedAmenities([]);
    setOnlyVacant(false);
    setOnlyRecommendedFilter(false);
    setSearchTerm('');
  };

  const handleScrollRecommend = (direction: 'left' | 'right') => {
    if (recommendScrollRef.current) {
      const scrollAmount = 340;
      recommendScrollRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
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
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 pb-28 text-slate-900 dark:text-slate-100">
      
      {/* =========================================================================
          TOP NAV BAR: Brand Logo, Notifications, Theme, User Avatar
          ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="Dormiqa" className="h-8 w-auto object-contain" />
            <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">
              DORMIQA
            </span>
          </div>

          {/* Right Header Icons */}
          <div className="flex items-center gap-2">
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
              className="flex items-center gap-2 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-neutral-200 dark:border-slate-700 ml-1"
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

      {/* =========================================================================
          MAIN CONTAINER
          Structure:
          1. Top Area (Greeting, compact location context, search bar, filter button)
          2. Recommend for You (horizontally scrollable cards)
          3. Normal listings: Nearby Accommodation (vertical / responsive grid)
          ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

        {/* =====================================================================
            1. TOP AREA
            Example:
            Good morning, [Name]   Osun State University, Osogbo
            [ Search accommodation... ] [ Filter ]
            No giant hero banner. Compact location selector.
            ===================================================================== */}
        <section className="space-y-4">
          
          {/* Top greeting + Compact University/Location row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {greeting}, {studentFirstName}
              </h1>
            </div>

            {/* Compact University / Location Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUniDropdown(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 hover:border-neutral-300 dark:hover:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate max-w-[220px]">
                  {currentUniversity.name}, {currentUniversity.city || 'Osogbo'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              </button>

              {/* Compact Dropdown */}
              {showUniDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-20"
                    onClick={() => setShowUniDropdown(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-72 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-lg py-2 z-30">
                    <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 dark:text-slate-500">
                      Select University Location
                    </div>
                    {universities.map((uni) => (
                      <button
                        key={uni.id}
                        onClick={() => {
                          onSelectUniversity(uni.id);
                          setShowUniDropdown(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-bold flex items-center justify-between gap-2 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                          uni.id === currentUniversity.id 
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30' 
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{uni.name} ({uni.code})</span>
                        {uni.id === currentUniversity.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search bar + Filter button Row */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Search Accommodation Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search accommodation..."
                className="w-full pl-10 pr-9 py-3 rounded-2xl border border-neutral-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-slate-500 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <button
              type="button"
              onClick={() => setShowFiltersModal(true)}
              className={`px-4 sm:px-5 py-3 rounded-2xl border font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-2xs cursor-pointer shrink-0 ${
                activeFilterCount > 0
                  ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-neutral-200/90 dark:border-slate-800 hover:border-neutral-300 dark:hover:border-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-emerald-800 text-[10px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Active Filter Chips (if any active) */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
              <span className="text-[11px] font-bold text-neutral-400 dark:text-slate-500">Active Filters:</span>
              {selectedPropertyType !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                  {PROPERTY_TYPES.find(p => p.id === selectedPropertyType)?.label}
                  <button type="button" onClick={() => setSelectedPropertyType('all')} className="cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedAmenities.map(amenity => (
                <span key={amenity} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                  {amenity}
                  <button 
                    type="button" 
                    onClick={() => setSelectedAmenities(prev => prev.filter(a => a !== amenity))}
                    className="cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer ml-1"
              >
                Clear all
              </button>
            </div>
          )}

        </section>

        {/* Loading State Skeleton */}
        {isListingsLoading ? (
          <div className="space-y-6">
            <div className="h-6 w-48 bg-neutral-200 dark:bg-slate-800 rounded-md animate-pulse" />
            <ListingGridSkeleton count={4} />
          </div>
        ) : legitimateUniversityListings.length === 0 ? (
          /* ===================================================================
              EMPTY STATE: When University has no approved hostels yet
              =================================================================== */
          <section className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/90 dark:border-slate-800 p-8 max-w-xl mx-auto space-y-4 shadow-xs">
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                No verified accommodation is available around your university yet.
              </h2>
              <p className="text-xs text-neutral-500 dark:text-slate-400 max-w-md mx-auto">
                We are actively onboarding verified caretakers and lodges around {currentUniversity.name}. Be the first to get notified when listings open!
              </p>
            </div>
            <button
              onClick={() => setIsNotifyModalOpen(true)}
              className="mt-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              <span>Notify me when new hostels are available</span>
            </button>
          </section>
        ) : (
          <>
            {/* ===================================================================
                2. RECOMMEND FOR YOU
                - Appears ABOVE normal listings
                - Heading "Recommend for You" with "See all" on the right
                - Horizontally scrollable property cards
                - Admin promoted listings (or defined legitimate fallback logic)
                =================================================================== */}
            {recommendedListings.length > 0 && (
              <section className="space-y-4">
                
                {/* Header Row: Heading + "See all" */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      Recommend for You
                    </h2>
                    <span className="p-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60" title="Promoted by Platform Administrators">
                      <Sparkles className="w-3.5 h-3.5 fill-amber-500" />
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Horizontal scroll navigation buttons */}
                    <div className="hidden sm:flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleScrollRecommend('left')}
                        className="p-1.5 rounded-full border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Scroll left"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScrollRecommend('right')}
                        className="p-1.5 rounded-full border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Scroll right"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* "See all" link on the right */}
                    <button
                      type="button"
                      onClick={() => setOnlyRecommendedFilter(prev => !prev)}
                      className={`text-xs sm:text-sm font-extrabold transition-colors cursor-pointer flex items-center gap-1 ${
                        onlyRecommendedFilter 
                          ? 'text-emerald-700 dark:text-emerald-300 underline' 
                          : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
                      }`}
                    >
                      <span>{onlyRecommendedFilter ? 'Show all lodges' : 'See all'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Horizontally scrollable property cards container */}
                <div 
                  ref={recommendScrollRef}
                  className="flex gap-4 sm:gap-5 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x snap-mandatory"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {recommendedListings.map(listing => (
                    <div 
                      key={`rec_${listing.id}`} 
                      className="w-[270px] sm:w-[320px] shrink-0 snap-start"
                    >
                      <ListingCard
                        listing={listing}
                        isSaved={savedIds.includes(listing.id)}
                        onToggleSave={onToggleSave}
                        onOpenDetail={onOpenDetail}
                        onBookInspection={onBookInspection}
                        onStartChat={onStartChat}
                        selectedCampus={selectedCampus}
                        isRecommendCard={true}
                      />
                    </div>
                  ))}
                </div>

              </section>
            )}

            {/* ===================================================================
                3. NORMAL LISTINGS: "Nearby Accommodation"
                - Positioned BELOW Recommend for You
                - Clean vertical listing structure on mobile, responsive grid on desktop
                - Clean property card design (Image, Heart, Name, Location, Price, Key Info)
                =================================================================== */}
            <section className="space-y-4 pt-2">
              
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Nearby Accommodation
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 font-medium">
                    {nearbyAccommodationListings.length} {nearbyAccommodationListings.length === 1 ? 'verified lodge' : 'verified lodges'} available around campus
                  </p>
                </div>
              </div>

              {nearbyAccommodationListings.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/90 dark:border-slate-800 p-6 space-y-3">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No accommodation matches your active search or filters.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                /* Responsive Grid: Vertical on mobile, 2-col on tablet, 3-col on desktop */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {nearbyAccommodationListings.map(listing => (
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
              )}

            </section>
          </>
        )}

      </main>

      {/* =========================================================================
          FILTER MODAL / SHEET
          ========================================================================= */}
      {showFiltersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200 dark:border-slate-800 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Filter Accommodation</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Room Type Options */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 dark:text-slate-400">
                Room / Property Type
              </label>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedPropertyType(type.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      selectedPropertyType === type.id
                        ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white'
                        : 'bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 hover:bg-neutral-200'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-extrabold uppercase tracking-wider text-neutral-400 dark:text-slate-400">
                  Maximum Annual Rent
                </label>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  ₦{maxPrice.toLocaleString()} / yr
                </span>
              </div>
              <input
                type="range"
                min="100000"
                max="1000000"
                step="25000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-400 font-bold">
                <span>₦100,000</span>
                <span>₦500,000</span>
                <span>₦1,000,000+</span>
              </div>
            </div>

            {/* Walking Distance to Campus */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-extrabold uppercase tracking-wider text-neutral-400 dark:text-slate-400">
                  Max Walking Distance to Campus
                </label>
                <span className="font-black text-slate-800 dark:text-slate-200">
                  {maxWalkMinutes} mins walk
                </span>
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
              <div className="flex justify-between text-[10px] text-neutral-400 font-bold">
                <span>5 mins</span>
                <span>15 mins</span>
                <span>30 mins</span>
              </div>
            </div>

            {/* Key Amenities Checkboxes */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 dark:text-slate-400">
                Key Amenities
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AMENITY_OPTIONS.map(amenity => {
                  const isChecked = selectedAmenities.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => {
                        setSelectedAmenities(prev => 
                          isChecked ? prev.filter(a => a !== amenity) : [...prev, amenity]
                        );
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        isChecked
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                          : 'border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{amenity}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="pt-2 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Show vacant rooms only
              </span>
              <button
                type="button"
                onClick={() => setOnlyVacant(prev => !prev)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  onlyVacant ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-slate-700'
                }`}
              >
                <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  onlyVacant ? 'left-6' : 'left-1'
                }`} />
              </button>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Reset All
              </button>

              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Apply Filters
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          NOTIFY ME MODAL (Empty state notification subscription)
          ========================================================================= */}
      {isNotifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200 dark:border-slate-800 shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Hostel Availability Alert</h3>
              <button onClick={() => setIsNotifyModalOpen(false)} className="text-neutral-400 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-500 dark:text-slate-400">
              Get notified immediately when verified caretakers publish new lodges near {currentUniversity.name}.
            </p>
            {notifySuccess ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center text-xs font-bold text-emerald-800 dark:text-emerald-300">
                You're subscribed! We'll alert you once verified accommodation opens.
              </div>
            ) : (
              <form onSubmit={handleSubscribeNotification} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="Enter your student email..."
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
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
