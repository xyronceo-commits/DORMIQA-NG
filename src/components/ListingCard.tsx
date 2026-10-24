import React, { useState } from 'react';
import { Heart, ChevronLeft, ChevronRight, MapPin, Phone } from 'lucide-react';
import { Listing, Campus } from '../types';

interface ListingCardProps {
  listing: Listing;
  isSaved: boolean;
  onToggleSave: (listingId: string) => void;
  onOpenDetail: (listing: Listing) => void;
  onBookInspection?: (listing: Listing) => void;
  onStartChat?: (agentId: string, listingId: string) => void;
  onContactClick?: (listing: Listing) => void;
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

  const walkingText = listing.walkingDistanceMinutes 
    ? `${listing.walkingDistanceMinutes} mins walk to gate` 
    : 'Near campus gate';

  const priceDisplay = `₦${Number(listing.pricePerYear || 180000).toLocaleString()} / year`;

  const photos = Array.isArray(listing.photos) && listing.photos.length > 0 
    ? listing.photos 
    : [];
  const currentPhoto = photos[currentPhotoIdx] || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80";

  return (
    <div
      onClick={() => onOpenDetail(listing)}
      className={`group bg-white rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors overflow-hidden flex flex-col cursor-pointer ${className}`}
    >
      {/* Property Photo */}
      <div className="relative aspect-[4/3] w-full bg-neutral-100 overflow-hidden">
        <img
          src={currentPhoto}
          alt={listing.title}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80";
          }}
        />

        {/* Multi-photo controls */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
              title="Previous photo"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={nextPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
              title="Next photo"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {/* Favorite Icon */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(listing.id);
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full border cursor-pointer z-10 transition-colors ${
            isSaved
              ? 'bg-red-600 border-red-600 text-white'
              : 'bg-white/90 hover:bg-white border-neutral-200 text-neutral-700'
          }`}
          title={isSaved ? "Saved" : "Save lodge"}
        >
          <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-white stroke-white' : 'stroke-current'}`} />
        </button>
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex flex-col justify-between space-y-2 flex-1">
        <div className="space-y-1">
          <h3 className="font-bold text-neutral-900 text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-emerald-700 transition-colors">
            {listing.hotelName || listing.title}
          </h3>

          <p className="text-xs text-neutral-500 truncate flex items-center gap-1 font-normal">
            <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
            <span className="truncate">{listing.address || `${listing.city || 'Osogbo'}`}</span>
          </p>
        </div>

        <div className="pt-2 border-t border-neutral-100 space-y-0.5">
          <p className="font-extrabold text-neutral-900 text-sm sm:text-base tracking-tight">
            {priceDisplay}
          </p>

          <p className="text-[11px] text-neutral-500 font-medium truncate">
            <span>{typeLabel}</span>
            <span className="mx-1.5 text-neutral-300">·</span>
            <span>{walkingText}</span>
          </p>
        </div>

        {/* Agent Phone Contact Line */}
        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-800 truncate">
            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{listing.agent?.phone || (listing as any).agentPhone || (listing as any).phone || 'Agent: Available'}</span>
          </div>
          {(listing.agent?.phone || (listing as any).agentPhone || (listing as any).phone) && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
              Call / WhatsApp
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
