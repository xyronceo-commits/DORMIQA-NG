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
  ArrowRight
} from 'lucide-react';
import { Listing, University, Campus, PropertyType } from '../types';
import { ListingCard } from './ListingCard';
import { ListingGridSkeleton } from './SkeletonLoader';
import { DormiqaLogo } from './DormiqaLogo';
import { UserAvatar } from './UserAvatar';

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
      
      // Consistent single source of truth for listing visibility:
      // Real listings that are published/valid, and not rejected, removed, banned, or draft.
      const isVisibleListing = 
        item.status !== 'rejected' &&
        item.status !== 'banned' &&
        item.status !== 'removed' &&
        item.status !== 'draft' &&
        item.status !== 'uploading' &&
        item.status !== 'upload_failed' &&
        item.status !== 'incomplete' &&
        item.verificationStatus !== 'rejected' &&
        item.verificationStatus !== 'banned' &&
        item.verificationStatus !== 'removed';

      // Real listings only (compulsory front photo)
      const hasFrontPhoto = Boolean(item.photos && Array.isArray(item.photos) && item.photos.length > 0 && item.photos[0]);

      return matchUni && isVisibleListing && hasFrontPhoto;
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
    <div className="min-h-screen bg-white pb-24 text-neutral-900 font-sans">
      
      {/* =========================================================================
          TOP NAV BAR: Brand, Notifications, Profile
          ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2">
            <DormiqaLogo className="w-6 h-6 shrink-0" />
            <span className="font-black text-lg tracking-tight text-neutral-900">
              DORMIQA
            </span>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-md hover:bg-neutral-100 text-neutral-700 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[10px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-neutral-200 transition-all cursor-pointer border border-neutral-200"
              title={userName}
            >
              <UserAvatar
                user={{ name: userName, avatarUrl: userAvatar }}
                name={userName}
                size="xs"
                className="w-7 h-7"
              />
            </button>
          </div>

        </div>
      </header>

      {/* =========================================================================
          MAIN CONTAINER
          ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Top Search & Filter Bar */}
        <section className="space-y-3">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
                {greeting}, {studentFirstName}
              </h1>
            </div>

            {/* University Location Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUniDropdown(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-neutral-200 hover:border-neutral-300 text-xs font-medium text-neutral-800 transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate max-w-[220px]">
                  {currentUniversity.name}, {currentUniversity.city || 'Osogbo'}
                </span>
                <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
              </button>

              {showUniDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-20"
                    onClick={() => setShowUniDropdown(false)}
                  />
                  <div className="absolute right-0 mt-1 w-72 bg-white rounded-lg border border-neutral-200 shadow-lg py-1.5 z-30">
                    <div className="px-3 py-1 text-[11px] font-semibold text-neutral-400">
                      Select University Location
                    </div>
                    {universities.map((uni) => (
                      <button
                        key={uni.id}
                        onClick={() => {
                          onSelectUniversity(uni.id);
                          setShowUniDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-medium flex items-center justify-between gap-2 hover:bg-neutral-50 transition-colors cursor-pointer ${
                          uni.id === currentUniversity.id 
                            ? 'text-emerald-700 font-semibold bg-emerald-50/50' 
                            : 'text-neutral-800'
                        }`}
                      >
                        <span className="truncate">{uni.name} ({uni.code})</span>
                        {uni.id === currentUniversity.id && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search bar + Filter button Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by lodge name, area (e.g. Oke-Baale), or property type..."
                className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 text-xs sm:text-sm font-normal focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowFiltersModal(true)}
              className={`px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeFilterCount > 0
                  ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                  : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 text-xs font-bold text-white">
                  ({activeFilterCount})
                </span>
              )}
            </button>
          </div>

          {/* Active Filter Indicators */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs text-neutral-600">
              <span className="text-[11px] text-neutral-400">Filters:</span>
              {selectedPropertyType !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 text-xs font-medium border border-neutral-200">
                  {PROPERTY_TYPES.find(p => p.id === selectedPropertyType)?.label}
                  <button type="button" onClick={() => setSelectedPropertyType('all')} className="cursor-pointer text-neutral-400 hover:text-neutral-700">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedAmenities.map(amenity => (
                <span key={amenity} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 text-xs font-medium border border-neutral-200">
                  {amenity}
                  <button 
                    type="button" 
                    onClick={() => setSelectedAmenities(prev => prev.filter(a => a !== amenity))}
                    className="cursor-pointer text-neutral-400 hover:text-neutral-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-medium text-red-600 hover:underline cursor-pointer ml-1"
              >
                Clear all
              </button>
            </div>
          )}

        </section>

        {/* Loading State */}
        {isListingsLoading ? (
          <div className="space-y-4">
            <div className="h-5 w-40 bg-neutral-200 rounded animate-pulse" />
            <ListingGridSkeleton count={4} />
          </div>
        ) : legitimateUniversityListings.length === 0 ? (
          /* Empty State */
          <section className="text-center py-12 bg-white rounded-lg border border-neutral-200 p-6 max-w-md mx-auto space-y-3">
            <div className="w-10 h-10 bg-neutral-100 rounded-md flex items-center justify-center mx-auto text-neutral-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-neutral-900">
                No verified lodges for this university yet
              </h2>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                We are actively onboarding verified property managers near {currentUniversity.name}. You can switch to Osun State University (UNIOSUN) to explore live campus lodges.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectUniversity('uniosun')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              Explore UNIOSUN Lodges
            </button>
          </section>
        ) : (
          <>
            {/* Recommended Lodges */}
            {recommendedListings.length > 0 && (
              <section className="space-y-3">
                
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                    Recommended Accommodation
                  </h2>

                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleScrollRecommend('left')}
                        className="p-1 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer"
                        title="Scroll left"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScrollRecommend('right')}
                        className="p-1 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer"
                        title="Scroll right"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOnlyRecommendedFilter(prev => !prev)}
                      className={`text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                        onlyRecommendedFilter 
                          ? 'text-emerald-800 underline' 
                          : 'text-emerald-700 hover:text-emerald-800'
                      }`}
                    >
                      <span>{onlyRecommendedFilter ? 'Show all' : 'See all'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div 
                  ref={recommendScrollRef}
                  className="flex gap-4 overflow-x-auto pb-2 pt-0.5 scrollbar-none snap-x snap-mandatory"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {recommendedListings.map(listing => (
                    <div 
                      key={`rec_${listing.id}`} 
                      className="w-[260px] sm:w-[300px] shrink-0 snap-start"
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

            {/* Normal Listings: Nearby Accommodation */}
            <section className="space-y-3 pt-1">
              
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                    Nearby Campus Lodges
                  </h2>
                  <p className="text-xs text-neutral-500 font-normal">
                    {nearbyAccommodationListings.length} {nearbyAccommodationListings.length === 1 ? 'verified listing' : 'verified listings'} around campus gates
                  </p>
                </div>
              </div>

              {nearbyAccommodationListings.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg border border-neutral-200 p-6 space-y-3">
                  <p className="text-sm font-semibold text-neutral-800">
                    No accommodation matches your active search or filters.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                /* Responsive Grid: 1-col mobile, 2-col tablet, 3-col desktop */
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
          FILTER MODAL / SHEET (Clean, Zero-Pill Design)
          ========================================================================= */}
      {showFiltersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
                <h3 className="text-base font-bold text-neutral-900">Filter Accommodation</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Room Type Options: Clean Segmented Buttons, Zero-Pills */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700">
                Room / Property Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PROPERTY_TYPES.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedPropertyType(type.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                      selectedPropertyType === type.id
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
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
                <label className="font-semibold text-neutral-700">
                  Maximum Annual Rent
                </label>
                <span className="font-bold text-neutral-900 text-sm">
                  ₦{maxPrice.toLocaleString()} / year
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
              <div className="flex justify-between text-[11px] text-neutral-400 font-medium">
                <span>₦100,000</span>
                <span>₦500,000</span>
                <span>₦1,000,000+</span>
              </div>
            </div>

            {/* Walking Distance to Campus */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-neutral-700">
                  Maximum Walking Distance to Campus Gate
                </label>
                <span className="font-bold text-neutral-900">
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
              <div className="flex justify-between text-[11px] text-neutral-400 font-medium">
                <span>5 mins</span>
                <span>15 mins</span>
                <span>30 mins</span>
              </div>
            </div>

            {/* Key Amenities Checkboxes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700">
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
                      className={`p-2.5 rounded-md border text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isChecked
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-semibold'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="truncate">{amenity}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-700">
                Show vacant rooms only
              </span>
              <button
                type="button"
                onClick={() => setOnlyVacant(prev => !prev)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  onlyVacant ? 'bg-emerald-600' : 'bg-neutral-300'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  onlyVacant ? 'left-5.5' : 'left-1'
                }`} />
              </button>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 cursor-pointer"
              >
                Reset All
              </button>

              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900">Hostel Availability Alert</h3>
              <button onClick={() => setIsNotifyModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Receive an email as soon as verified caretakers publish new lodges near {currentUniversity.name}.
            </p>
            {notifySuccess ? (
              <div className="p-3 bg-emerald-50 rounded-md border border-emerald-200 text-center text-xs font-medium text-emerald-800">
                Subscription confirmed. We will notify you when new lodges become available.
              </div>
            ) : (
              <form onSubmit={handleSubscribeNotification} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="Enter your student email..."
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-md border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:border-emerald-600 font-medium"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
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
