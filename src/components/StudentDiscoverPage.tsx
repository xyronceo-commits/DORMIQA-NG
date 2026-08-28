import React, { useState, useMemo } from 'react';
import { Search, Bell, User as UserIcon, ShieldCheck, Filter, ArrowLeft, Building2 } from 'lucide-react';
import { Listing, University, Campus, SearchFilters } from '../types';
import { ListingCard } from './ListingCard';
import { ListingGridSkeleton } from './SkeletonLoader';

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

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'hostel', label: 'Hostels' },
  { id: 'apartment', label: 'Apartments' },
  { id: 'self_contain', label: 'Self-Contain' },
  { id: 'shared', label: 'Shared Rooms' },
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
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Filter listings based on category & search term
  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesAddr = item.address.toLowerCase().includes(query);
        const matchesType = item.propertyType.toLowerCase().includes(query);
        if (!matchesTitle && !matchesAddr && !matchesType) return false;
      }

      // Category filter
      if (activeCategory === 'hostel') {
        return item.propertyType === 'studio' || item.propertyType === 'single_room' || item.title.toLowerCase().includes('hostel');
      }
      if (activeCategory === 'apartment') {
        return item.propertyType === 'one_bedroom' || item.propertyType === 'duplex_flat' || item.title.toLowerCase().includes('flat') || item.title.toLowerCase().includes('apartment');
      }
      if (activeCategory === 'self_contain') {
        return item.propertyType === 'self_contain' || item.propertyType === 'ensuite';
      }
      if (activeCategory === 'shared') {
        return item.propertyType === 'shared_flat' || item.propertyType === 'bedspace';
      }

      return true;
    });
  }, [listings, searchTerm, activeCategory]);

  // Categorize for Discovery Sections when 'All' is active and no search term is entered
  const recommendedListings = useMemo(() => {
    return filteredListings.filter(l => l.agent?.isVerified || l.isFeatured).slice(0, 6);
  }, [filteredListings]);

  const nearCampusListings = useMemo(() => {
    return [...filteredListings].sort((a, b) => (a.walkingDistanceMinutes || 10) - (b.walkingDistanceMinutes || 10)).slice(0, 6);
  }, [filteredListings]);

  const recentlyAddedListings = useMemo(() => {
    return [...filteredListings].slice(0, 6);
  }, [filteredListings]);

  const isDefaultView = activeCategory === 'all' && !searchTerm.trim();

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-24 text-slate-900 dark:text-slate-100">
      
      {/* HEADER ZONE */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Top-Left: Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="Dormiqa" className="h-8 w-auto object-contain" />
            <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">
              DORMIQA
            </span>
          </div>

          {/* Top-Right: Notifications & Profile Avatar */}
          <div className="flex items-center gap-3">
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
        
        {/* HERO SECTION */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Find your next home.
            </h1>
            <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium">
              Near your campus • {selectedCampus ? selectedCampus.name : 'All Campuses'}
            </p>
          </div>

          {/* Search Field (NO MAP toggle, NO map button) */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search hostels, areas, lodges..."
              className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium shadow-xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 hover:text-neutral-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* CATEGORIES (Horizontally Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* LOADING STATE */}
        {isListingsLoading ? (
          <ListingGridSkeleton count={6} />
        ) : isDefaultView ? (
          /* SECTIONED PROPERTY DISCOVERY VIEW */
          <div className="space-y-10">
            
            {/* 1. Recommended for You */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Recommended for You</span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                      Verified
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-slate-400">Top-rated verified hostels near campus</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {recommendedListings.map(listing => (
                  <ListingCard
                    key={`rec-${listing.id}`}
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
            </section>

            {/* 2. Near Your Campus */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Near Your Campus
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-slate-400">Within walking or quick shuttle distance</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {nearCampusListings.map(listing => (
                  <ListingCard
                    key={`near-${listing.id}`}
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
            </section>

            {/* 3. Recently Added */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Recently Added
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-slate-400">Fresh listings added by verified caretakers</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {recentlyAddedListings.map(listing => (
                  <ListingCard
                    key={`recent-${listing.id}`}
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
            </section>

          </div>
        ) : (
          /* FILTERED / SEARCH RESULTS VIEW */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {filteredListings.length} {filteredListings.length === 1 ? 'Hostel' : 'Hostels'} Available
              </h2>
            </div>

            {filteredListings.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200 dark:border-slate-800 p-8 max-w-md mx-auto space-y-3">
                <Building2 className="w-10 h-10 text-neutral-300 dark:text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">No properties match your search</p>
                <p className="text-xs text-neutral-500 dark:text-slate-400">Try searching a different location, hostel name, or selecting 'All' categories.</p>
                <button
                  onClick={() => { setSearchTerm(''); setActiveCategory('all'); }}
                  className="mt-2 px-4 py-2 bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 text-xs font-bold rounded-xl"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredListings.map(listing => (
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
          </div>
        )}

      </main>

    </div>
  );
};
