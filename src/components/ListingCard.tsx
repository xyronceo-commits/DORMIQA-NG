import React, { useState } from 'react';
import { Heart, Building2, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { Listing, Campus } from '../types';

interface ListingCardProps {
  listing: Listing;
  isSaved: boolean;
  onToggleSave: (listingId: string) => void;
  onOpenDetail: (listing: Listing) => void;
  onBookInspection?: (listing: Listing) => void;
  onStartChat?: (agentId: string, listingId: string) => void;
  selectedCampus?: Campus;
  className?: string;
  isRecommendCard?: boolean;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  isSaved,
  onToggleSave,
  onOpenDetail,
  className = '',
  isRecommendCard = false
}) => {
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!listing.photos || listing.photos.length <= 1) return;
    setCurrentPhotoIdx((prev) => (prev + 1) % listing.photos.length);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!listing.photos || listing.photos.length <= 1) return;
    setCurrentPhotoIdx((prev) => (prev - 1 + listing.photos.length) % listing.photos.length);
  };

  // Property type badge label
  const typeLabel = {
    self_contain: 'Self-Contain',
    single_room: 'Single Room',
    one_bedroom: '1-Bedroom Flat',
    shared_flat: 'Shared Flat',
    bedspace: 'Bedspace',
    studio: 'Studio Lodge',
    ensuite: 'Ensuite Room',
    duplex_flat: 'Duplex Flat'
  }[listing.propertyType] || 'Self-Contain';

  // Room count info
  const roomCount = listing.totalBedrooms || listing.vacanciesCount || 1;
  const roomInfo = `${roomCount} ${roomCount === 1 ? 'Room' : 'Rooms'}  •  ${typeLabel}`;

  // Formatted price
  const priceDisplay = `₦${Number(listing.pricePerYear || 350000).toLocaleString()} / year`;

  // Display photo
  const photos = Array.isArray(listing.photos) && listing.photos.length > 0 
    ? listing.photos 
    : [];
  const currentPhoto = photos[currentPhotoIdx] || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80";

  return (
    <div
      onClick={() => onOpenDetail(listing)}
      className={`group bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 hover:border-neutral-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col cursor-pointer ${className}`}
    >
      {/* 1. REAL PROPERTY IMAGE with SAVE/FAVOURITE ICON */}
      <div className="relative aspect-[4/3] w-full bg-neutral-100 dark:bg-slate-800 overflow-hidden">
        <img
          src={currentPhoto}
          alt={listing.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80";
          }}
        />

        {/* Multi-photo carousel controls if available */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevPhoto}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
              title="Previous photo"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextPhoto}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
              title="Next photo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
              {photos.slice(0, 5).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentPhotoIdx ? 'bg-white w-3' : 'bg-white/60 w-1.5'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* 2. SAVE / FAVOURITE ICON (Heart) in TOP-RIGHT */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(listing.id);
          }}
          className={`absolute top-3 right-3 p-2.5 rounded-full transition-all active:scale-90 border cursor-pointer z-10 shadow-xs ${
            isSaved
              ? 'bg-rose-500 border-rose-500 text-white'
              : 'bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 border-neutral-200/80 dark:border-slate-700 text-neutral-700 dark:text-neutral-200'
          }`}
          title={isSaved ? "Remove from saved" : "Save accommodation"}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-white stroke-white' : 'stroke-current'}`} />
        </button>
      </div>

      {/* CARD BODY: STRICT PRIORITY ORDER
          3. Property name
          4. Location
          5. Price
          6. Key property information
      */}
      <div className="p-4 sm:p-5 flex flex-col justify-between space-y-2 flex-1">
        <div className="space-y-1">
          {/* 3. Property Name */}
          <h3 className="font-extrabold text-neutral-900 dark:text-white text-base sm:text-lg leading-snug line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {listing.hotelName || listing.title}
          </h3>

          {/* 4. Location */}
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-slate-400 font-medium truncate flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-neutral-400 dark:text-slate-500 shrink-0" />
            <span className="truncate">{listing.address || `${listing.city || 'Osogbo'}`}</span>
          </p>
        </div>

        <div className="pt-2 border-t border-neutral-100 dark:border-slate-800 space-y-1">
          {/* 5. Price */}
          <p className="font-black text-neutral-900 dark:text-white text-base sm:text-lg tracking-tight">
            {priceDisplay}
          </p>

          {/* 6. Key Property Information */}
          <p className="text-xs text-neutral-500 dark:text-slate-400 font-medium tracking-normal">
            {roomInfo}
          </p>
        </div>
      </div>
    </div>
  );
};
