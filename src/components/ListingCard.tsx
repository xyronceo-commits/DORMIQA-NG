import React, { useState } from 'react';
import { 
  Heart, 
  MapPin, 
  Footprints, 
  ShieldCheck, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Eye, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { Listing } from '../types';

interface ListingCardProps {
  listing: Listing;
  isSaved: boolean;
  onToggleSave: (listingId: string) => void;
  onOpenDetail: (listing: Listing) => void;
  onBookInspection: (listing: Listing) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  isSaved,
  onToggleSave,
  onOpenDetail,
  onBookInspection
}) => {
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIdx((prev) => (prev + 1) % listing.photos.length);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIdx((prev) => (prev - 1 + listing.photos.length) % listing.photos.length);
  };

  // Property type badge label
  const typeLabel = {
    self_contain: 'Self-Contain Studio',
    single_room: 'Single Room',
    one_bedroom: '1 Bedroom Flat',
    shared_flat: 'Shared Flat',
    bedspace: 'Bedspace',
    studio: 'Private Lodge',
    ensuite: 'Ensuite Room',
    duplex_flat: 'Duplex Flat'
  }[listing.propertyType] || listing.propertyType;

  return (
    <div 
      onClick={() => onOpenDetail(listing)}
      className="group bg-white rounded-md border border-neutral-200 hover:border-neutral-300 hover:shadow-xs transition-all duration-150 overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Photo carousel container */}
      <div className="relative aspect-[4/3] w-full bg-neutral-100 overflow-hidden">
        <img
          src={listing.photos[currentPhotoIdx] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 ease-out"
        />

        {/* Carousel controls */}
        {listing.photos.length > 1 && (
          <>
            <button
              onClick={prevPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded bg-white/90 hover:bg-white text-neutral-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-neutral-200 shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={nextPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded bg-white/90 hover:bg-white text-neutral-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-neutral-200 shadow-xs"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
              {listing.photos.slice(0, 5).map((_, idx) => (
                <span
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentPhotoIdx ? 'bg-white w-2.5' : 'bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {/* Walking Distance Badge */}
          <div className="pointer-events-auto bg-neutral-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-xs">
            <Footprints className="w-3 h-3 text-emerald-400" />
            <span>{listing.walkingDistanceMinutes} min walk</span>
          </div>

          {/* Save Heart Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(listing.id);
            }}
            className={`pointer-events-auto p-1.5 rounded-md backdrop-blur-sm transition-transform active:scale-95 border ${
              isSaved
                ? 'bg-rose-500 border-rose-500 text-white'
                : 'bg-white/90 border-neutral-200 hover:bg-white text-neutral-700'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-white' : ''}`} />
          </button>
        </div>

        {/* Bottom Property Type Pill & Unit Status Badge */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none gap-1">
          <span className="bg-white/95 text-neutral-900 text-[10px] font-bold px-2 py-0.5 rounded border border-neutral-200 shadow-xs uppercase tracking-wider">
            {typeLabel}
          </span>
          {listing.unitStatus === 'occupied' ? (
            <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow-xs">
              🔴 Fully Rented
            </span>
          ) : listing.unitStatus === 'under_renovation' ? (
            <span className="bg-orange-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow-xs">
              🟠 Under Renovation
            </span>
          ) : listing.unitStatus === 'remaining' || listing.vacanciesCount ? (
            <span className="bg-amber-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow-xs">
              🟡 {listing.vacanciesCount || 1} Rooms Left
            </span>
          ) : (
            <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow-xs">
              🟢 Vacant & Available
            </span>
          )}
        </div>
      </div>

      {/* Content body */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        
        <div>
          {listing.hotelName && (
            <span className="text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded mb-1 inline-block">
              🏨 {listing.hotelName}
            </span>
          )}

          {/* Header Row: Title & Agent Shield */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-neutral-900 text-sm leading-snug line-clamp-1 group-hover:text-black transition-colors">
              {listing.title}
            </h3>
            {listing.agent.isVerified && (
              <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title="Verified Agent Listing">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Verified
              </span>
            )}
          </div>

          {/* Campus Distance & Address */}
          <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1 truncate">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
            <span className="truncate">{listing.address}</span>
          </p>

          {/* Facilities pills snippet */}
          <div className="flex flex-wrap gap-1 mt-2">
            {listing.facilities.slice(0, 3).map((facility, i) => (
              <span 
                key={i}
                className="text-[10px] font-medium bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200/60"
              >
                {facility}
              </span>
            ))}
            {listing.facilities.length > 3 && (
              <span className="text-[10px] text-neutral-400 font-semibold px-1 py-0.5">
                +{listing.facilities.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Pricing & Inspection CTA Row */}
        <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between mt-auto">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-extrabold text-neutral-900 text-base">
                ₦{(listing.pricePerYear || (listing.pricePerWeek ? listing.pricePerWeek * 52 : 300000)).toLocaleString()}
              </span>
              <span className="text-xs text-neutral-500 font-normal">/ yr</span>
            </div>
            <div className="text-[10px] text-neutral-400 flex items-center gap-1 flex-wrap">
              <span>₦{(listing.pricePerMonth || Math.round((listing.pricePerYear || 300000) / 12)).toLocaleString()}/mo</span>
              {listing.billsIncluded && (
                <span className="text-emerald-700 font-bold">• Power Inc.</span>
              )}
            </div>
            {listing.promoDiscount && (
              <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded mt-1 inline-block">
                🎉 {listing.promoDiscount}
              </span>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBookInspection(listing);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-black hover:bg-neutral-800 transition-colors rounded-md flex items-center gap-1 shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5" />
              Book Tour
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
