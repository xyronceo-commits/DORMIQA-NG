import React, { useState } from 'react';
import { 
  Heart, 
  MapPin, 
  Footprints, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Building2,
  MessageSquare,
  Share2
} from 'lucide-react';
import { Listing, Campus } from '../types';
import { getPropertyDistanceToCampus } from '../utils/distance';
import { TravelModeBar } from './TravelModeBar';
import { sharePropertyListing } from '../utils/routing';

interface ListingCardProps {
  listing: Listing;
  isSaved: boolean;
  onToggleSave: (listingId: string) => void;
  onOpenDetail: (listing: Listing) => void;
  onBookInspection: (listing: Listing) => void;
  onStartChat?: (agentId: string, listingId: string) => void;
  selectedCampus?: Campus;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  isSaved,
  onToggleSave,
  onOpenDetail,
  onBookInspection,
  onStartChat,
  selectedCampus
}) => {
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  const distanceInfo = selectedCampus 
    ? getPropertyDistanceToCampus(listing.lat, listing.lng, selectedCampus, listing.walkingDistanceMinutes)
    : null;

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
    self_contain: 'Self-Contain',
    single_room: 'Single Room',
    one_bedroom: '1 Bed Flat',
    shared_flat: 'Shared Flat',
    bedspace: 'Bedspace',
    studio: 'Private Lodge',
    ensuite: 'Ensuite Room',
    duplex_flat: 'Duplex Flat'
  }[listing.propertyType] || listing.propertyType;

  return (
    <div 
      data-tour="listing-card"
      onClick={() => onOpenDetail(listing)}
      className="group bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 hover:border-neutral-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Photo carousel container */}
      <div className="relative aspect-[4/3] w-full bg-neutral-100 dark:bg-slate-800 overflow-hidden">
        <img
          src={listing.photos[currentPhotoIdx] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
        />

        {/* Carousel controls */}
        {listing.photos.length > 1 && (
          <>
            <button
              onClick={prevPhoto}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900 text-neutral-800 dark:text-neutral-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-neutral-200 dark:border-slate-700 shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextPhoto}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900 text-neutral-800 dark:text-neutral-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-neutral-200 dark:border-slate-700 shadow-xs cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
              {listing.photos.slice(0, 5).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-xs transition-all ${
                    idx === currentPhotoIdx ? 'bg-white w-3' : 'bg-white/60 w-1.5'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-none">
          {/* Share Link Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              sharePropertyListing(listing);
            }}
            className="pointer-events-auto p-2 rounded-lg backdrop-blur-md transition-all active:scale-90 border cursor-pointer bg-white/90 dark:bg-slate-900/80 border-neutral-200 dark:border-slate-700 hover:bg-white text-neutral-700 dark:text-neutral-200 shadow-xs"
            title="Share property link"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Save Heart Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(listing.id);
            }}
            className={`pointer-events-auto p-2 rounded-lg backdrop-blur-md transition-all active:scale-90 border cursor-pointer ${
              isSaved
                ? 'bg-rose-500 border-rose-500 text-white shadow-xs'
                : 'bg-white/90 dark:bg-slate-900/80 border-neutral-200 dark:border-slate-700 hover:bg-white text-neutral-700 dark:text-neutral-200 shadow-xs'
            }`}
            title={isSaved ? "Remove from saved" : "Save accommodation"}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} />
          </button>
        </div>

      </div>

      {/* Content body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
        
        <div className="space-y-2">
          {/* Property Type & Availability Metadata */}
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="uppercase tracking-wider text-[10px] text-neutral-500 dark:text-slate-400 font-extrabold">
              {typeLabel}
            </span>
            {listing.unitStatus === 'occupied' ? (
              <span className="text-rose-600 dark:text-rose-400 text-[10px] font-extrabold flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200/60 dark:border-rose-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400 inline-block"></span>
                Fully Rented
              </span>
            ) : listing.unitStatus === 'remaining' || listing.vacanciesCount ? (
              <span className="text-amber-700 dark:text-amber-300 text-[10px] font-extrabold flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                {listing.vacanciesCount || 1} Left
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                Available
              </span>
            )}
          </div>

          {/* Title & Verified Shield */}
          <div className="flex items-start justify-between gap-2 pt-0.5">
            <h3 className="font-bold text-neutral-900 dark:text-white text-base leading-snug line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {listing.title}
            </h3>
            {listing.agent.isVerified && (
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/80" title="Verified Caretaker/Agent">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Verified
              </span>
            )}
          </div>

          {/* Location & Address */}
          <div className="flex items-center text-xs text-neutral-500 dark:text-slate-400 gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-neutral-400 dark:text-slate-500" />
            <span className="truncate">{listing.address}</span>
          </div>

          {/* 3-Travel Mode Real-Time Routing Bar */}
          <div className="py-1">
            <TravelModeBar
              propertyId={listing.id}
              propertyLat={listing.lat}
              propertyLng={listing.lng}
              selectedCampus={selectedCampus}
              compact={true}
            />
          </div>

          {/* Key Facilities snippet (Streamlined to max 2 for visual breathing room) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {listing.facilities.slice(0, 2).map((facility, i) => (
              <span 
                key={i}
                className="text-[10px] font-medium bg-neutral-100/80 dark:bg-slate-800/80 text-neutral-600 dark:text-slate-300 px-2 py-0.5 rounded-md border border-neutral-200/60 dark:border-slate-700/60"
              >
                {facility}
              </span>
            ))}
            {listing.facilities.length > 2 && (
              <span className="text-[10px] text-neutral-400 dark:text-slate-500 font-semibold px-1 py-0.5">
                +{listing.facilities.length - 2} more
              </span>
            )}
          </div>
        </div>

        {/* Pricing & Inspection CTA Row */}
        <div className="pt-3.5 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between mt-auto">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-extrabold text-neutral-900 dark:text-white text-base sm:text-lg">
                ₦{(listing.pricePerYear || (listing.pricePerWeek ? listing.pricePerWeek * 52 : 300000)).toLocaleString()}
              </span>
              <span className="text-xs text-neutral-500 dark:text-slate-400 font-medium">/yr</span>
            </div>
            <div className="text-[11px] text-neutral-400 dark:text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
              <span>₦{(listing.pricePerMonth || Math.round((listing.pricePerYear || 300000) / 12)).toLocaleString()}/mo</span>
              {listing.billsIncluded && (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">• Utilities Inc.</span>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onStartChat && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartChat(listing.agentId || listing.agent?.id || 'agent_1', listing.id);
                }}
                className="p-2.5 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950 dark:hover:text-emerald-400 border border-neutral-200/80 dark:border-slate-700 transition-colors rounded-xl flex items-center justify-center cursor-pointer active:scale-95"
                title="Message Caretaker Directly"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}

            <button
              data-tour="book-inspection-btn"
              onClick={(e) => {
                e.stopPropagation();
                onBookInspection(listing);
              }}
              className="px-3.5 py-2.5 text-xs font-bold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 transition-colors rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
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

