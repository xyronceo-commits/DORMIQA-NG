import React from 'react';
import { ArrowLeft, Heart, Building2 } from 'lucide-react';
import { Listing, Campus } from '../types';
import { ListingCard } from './ListingCard';

interface SavedPageProps {
  savedListings: Listing[];
  savedIds: string[];
  onToggleSave: (id: string) => void;
  onOpenDetail: (listing: Listing) => void;
  onBookInspection: (listing: Listing) => void;
  onStartChat: (agentId: string, listingId: string) => void;
  onGoBack: () => void;
  selectedCampus?: Campus;
}

export const SavedPage: React.FC<SavedPageProps> = ({
  savedListings,
  savedIds,
  onToggleSave,
  onOpenDetail,
  onBookInspection,
  onStartChat,
  onGoBack,
  selectedCampus
}) => {
  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-24 text-slate-900 dark:text-slate-100">
      
      {/* HEADER WITH GO BACK ICON */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onGoBack}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Saved Hostels</span>
                <span className="text-xs bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-extrabold px-2 py-0.5 rounded-full">
                  {savedListings.length}
                </span>
              </h1>
              <p className="text-xs text-neutral-500 dark:text-slate-400">Your shortlisted student accommodations</p>
            </div>
          </div>

        </div>
      </header>

      {/* CONTENT BODY */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {savedListings.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200 dark:border-slate-800 p-8 max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/50 rounded-full flex items-center justify-center mx-auto text-rose-500">
              <Heart className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Your wishlist is empty</h2>
              <p className="text-xs text-neutral-500 dark:text-slate-400">
                Tap the heart icon on any property in Discover to save it here for quick access later.
              </p>
            </div>
            <button
              onClick={onGoBack}
              className="px-5 py-2.5 bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            >
              Explore Hostels
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isSaved={true}
                onToggleSave={onToggleSave}
                onOpenDetail={onOpenDetail}
                onBookInspection={onBookInspection}
                onStartChat={onStartChat}
                selectedCampus={selectedCampus}
              />
            ))}
          </div>
        )}
      </main>

    </div>
  );
};
