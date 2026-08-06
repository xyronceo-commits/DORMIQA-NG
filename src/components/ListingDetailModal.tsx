import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Footprints, 
  ShieldCheck, 
  Star, 
  Check, 
  Calendar, 
  MessageSquare, 
  Heart, 
  Flag, 
  CheckCircle2, 
  Clock, 
  Phone, 
  Mail, 
  Video, 
  Share2, 
  ChevronLeft, 
  ChevronRight,
  Info,
  PenTool,
  Send,
  ThumbsUp,
  Tag,
  Copy,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Listing, ListingReview } from '../types';
import { submitListingReview } from '../services/api';
import { sendNotification } from '../services/notificationService';

interface ListingDetailModalProps {
  listing: Listing | null;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (listingId: string) => void;
  onBookInspection: (listing: Listing) => void;
  onStartChat: (agentId: string, listingId: string) => void;
  onReportListing: (listing: Listing) => void;
  relatedListings: Listing[];
  onSelectRelated: (listing: Listing) => void;
  onListingUpdated?: (updatedListing: Listing) => void;
  onOpenAskAI?: (listing: Listing) => void;
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  listing: initialListing,
  onClose,
  isSaved,
  onToggleSave,
  onBookInspection,
  onStartChat,
  onReportListing,
  relatedListings,
  onSelectRelated,
  onListingUpdated,
  onOpenAskAI
}) => {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [currentListing, setCurrentListing] = useState<Listing | null>(initialListing);

  // Review Submission Form State
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [authorName, setAuthorName] = useState('Alex Chen (Student)');
  const [universityCourse, setUniversityCourse] = useState('UNILAG Computer Science 300L');
  const [reviewTag, setReviewTag] = useState<'Verified Tour Visitor' | 'Current Resident Student' | 'Inspection Completed'>('Inspection Completed');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Share Modal & Toast State
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  useEffect(() => {
    setCurrentListing(initialListing);
    setActivePhotoIdx(0);
    setShowReviewForm(false);
    setReviewSuccess(false);
    setShowShareModal(false);
  }, [initialListing]);

  if (!currentListing) return null;
  const listing = currentListing;

  const getShareUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('listing', listing.id);
    return url.toString();
  };

  const shareText = `Check out "${listing.title}" near ${listing.universityName} on Campora Nigeria - ₦${(listing.pricePerYear || (listing.pricePerWeek ? listing.pricePerWeek * 52 : 300000)).toLocaleString()}/yr!`;

  const handleShareClick = async () => {
    const shareUrl = getShareUrl();

    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: shareText,
          url: shareUrl
        });
        setShareNotice('Property shared successfully!');
        setTimeout(() => setShareNotice(null), 3000);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback: copy link and open share modal
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch {
      // ignore
    }
    setShowShareModal(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      const updated = await submitListingReview(listing.id, {
        authorName,
        rating,
        comment,
        universityCourse,
        tag: reviewTag
      });

      // Local state update
      setCurrentListing(updated);
      if (onListingUpdated) {
        onListingUpdated(updated);
      }

      // Notify Agent about new rating & review
      sendNotification({
        userId: listing.agentId,
        title: `⭐ New ${rating}-Star Review on "${listing.title}"`,
        body: `${authorName}: "${comment.substring(0, 80)}${comment.length > 80 ? '...' : ''}"`,
        type: 'listing',
        metadata: {
          listingId: listing.id,
          senderName: authorName
        }
      });

      setIsSubmitting(false);
      setReviewSuccess(true);
      setShowReviewForm(false);
      setComment('');
      setTimeout(() => setReviewSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Sticky Modal Top Bar */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-6 py-3.5 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-800">
              {listing.propertyType.replace('_', ' ').toUpperCase()}
            </span>
            {listing.agent.isVerified && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified Agent Listing
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareClick}
              className="px-3 py-1.5 rounded-full border border-neutral-300 hover:border-emerald-500 hover:bg-emerald-50 text-neutral-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="Share Property Link"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Share</span>
            </button>

            <button
              onClick={() => onToggleSave(listing.id)}
              className={`p-2 rounded-full border transition-colors cursor-pointer ${
                isSaved ? 'bg-rose-50 border-rose-200 text-rose-600' : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600'
              }`}
              title="Save Property"
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-8">
          
          {/* 1. Photos & Video Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-[16/9] w-full bg-neutral-100 rounded-2xl overflow-hidden group">
              <img
                src={listing.photos[activePhotoIdx] || listing.photos[0]}
                alt={listing.title}
                className="w-full h-full object-cover transition-all duration-300"
              />

              {listing.photos.length > 1 && (
                <>
                  <button
                    onClick={() => setActivePhotoIdx(prev => (prev - 1 + listing.photos.length) % listing.photos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-neutral-800 flex items-center justify-center shadow-md transition-transform active:scale-90"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActivePhotoIdx(prev => (prev + 1) % listing.photos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-neutral-800 flex items-center justify-center shadow-md transition-transform active:scale-90"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Photo Counter */}
              <div className="absolute bottom-3 right-3 bg-slate-900/80 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md">
                {activePhotoIdx + 1} / {listing.photos.length}
              </div>
            </div>

            {/* Thumbnail Row */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {listing.photos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePhotoIdx(idx)}
                  className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                    activePhotoIdx === idx ? 'border-emerald-600 ring-2 ring-emerald-500/30' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* 2. Price Header & Quick Actions */}
          <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  ₦{(listing.pricePerYear || (listing.pricePerWeek ? listing.pricePerWeek * 52 : 300000)).toLocaleString()}
                </span>
                <span className="text-sm text-neutral-500 font-medium">/ year</span>
                <span className="text-sm text-neutral-400">| ₦{(listing.pricePerMonth || Math.round((listing.pricePerYear || 300000) / 12)).toLocaleString()} / month</span>
              </div>
              <div className="flex items-center gap-3 text-xs mt-1 text-neutral-600 font-semibold">
                {listing.billsIncluded ? (
                  <span className="text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded font-bold">
                    ✓ Solar / Generator Power Included
                  </span>
                ) : (
                  <span className="text-neutral-500">Electricity via Prepaid PHCN Meter</span>
                )}
                <span>• Caution / Agreement Fee: ₦{listing.deposit ? listing.deposit.toLocaleString() : '30,000'}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-2 flex-wrap">
              {onOpenAskAI && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAskAI(listing);
                  }}
                  className="px-3.5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Ask Campora AI questions about this lodge"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600 fill-emerald-600 animate-pulse" />
                  <span>Ask AI</span>
                </button>
              )}

              <button
                onClick={handleShareClick}
                className="px-3.5 py-3 bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Share Property with Roommates / Friends"
              >
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span>Share</span>
              </button>

              <button
                onClick={() => onBookInspection(listing)}
                className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                Book Free Inspection
              </button>
              <button
                onClick={() => onStartChat(listing.agentId, listing.id)}
                className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Message Agent
              </button>
            </div>
          </div>

          {/* 3. Title, Hotel Name & Campus Proximity */}
          <div className="space-y-2">
            {listing.hotelName && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-purple-900 bg-purple-100 px-3 py-1 rounded-full border border-purple-200 uppercase tracking-wider">
                  Hotel / Building: {listing.hotelName}
                </span>
                {listing.vacanciesCount && (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    🔥 {listing.vacanciesCount} Rooms Available
                  </span>
                )}
              </div>
            )}

            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              {listing.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600 font-medium">
              <p className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-neutral-400" />
                {listing.address}
              </p>
              <span className="text-neutral-300">•</span>
              <p className="flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <Footprints className="w-4 h-4 text-emerald-600" />
                {listing.walkingDistanceMinutes} min WALK time to {listing.universityName}
              </p>
            </div>
          </div>

          {/* 4. Key Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white p-4 rounded-xl border border-neutral-200">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Property Type</span>
              <p className="text-xs font-bold text-neutral-900 capitalize">{listing.propertyType.replace('_', ' ')}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Institution</span>
              <p className="text-xs font-bold text-neutral-900 line-clamp-1">{listing.universityName}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase">WALK Time</span>
              <p className="text-xs font-bold text-emerald-700">{listing.walkingDistanceMinutes} mins</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Vacancies</span>
              <p className="text-xs font-bold text-blue-700">{listing.vacanciesCount || 1} Available</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Available From</span>
              <p className="text-xs font-bold text-neutral-900">{listing.availableFrom}</p>
            </div>
          </div>

          {/* 360-Degree Video Walkthrough Player Section */}
          {listing.videoUrl && (
            <div className="bg-slate-950 p-5 rounded-3xl text-white space-y-3 border border-neutral-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-purple-400 animate-pulse" />
                  360-Degree Video Walkthrough & Virtual Tour
                </h3>
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
                  Verified 360° Inspection
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Inspect the interior layout, surrounding environment, and hotel facilities before visiting in person.
              </p>
              <div className="rounded-2xl overflow-hidden bg-black aspect-video relative max-h-80 border border-slate-800">
                <video
                  src={listing.videoUrl}
                  controls
                  controlsList="nodownload"
                  className="w-full h-full object-cover"
                  poster={listing.photos[0]}
                />
              </div>
            </div>
          )}

          {/* 5. Facilities & Amenities */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              Included Facilities & Amenities
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {listing.facilities.map((facility, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-2 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs font-semibold text-neutral-800"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{facility}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Description */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              About This Accommodation
            </h3>
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>
          </div>

          {/* 7. House Rules & Tenancy Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-700" />
                Tenancy Rules
              </h4>
              <ul className="space-y-1.5 text-xs text-amber-950 font-medium">
                {listing.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span>•</span> <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-2">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-700" />
                Lease Terms
              </h4>
              <p className="text-xs text-blue-950 font-medium">
                Minimum tenancy duration: <strong>{listing.minLeaseMonths} months</strong>. Suitable for university students with verified enrolment status.
              </p>
            </div>
          </div>

          {/* 8. Verified Agent Profile Card */}
          <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={listing.agent.avatarUrl}
                  alt={listing.agent.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-white text-base">{listing.agent.name}</h4>
                    {listing.agent.isVerified && (
                      <span className="bg-emerald-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded" title="Verified Agent">
                        VERIFIED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-medium">{listing.agent.agencyName}</p>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{listing.agent.rating}</span>
                  <span className="text-slate-400 font-normal">({listing.agent.totalReviews})</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Response: {listing.agent.responseTime}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <span>Agent Phone: {listing.agent.phone}</span>
              <button
                onClick={() => onStartChat(listing.agentId, listing.id)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" /> Start Direct Chat
              </button>
            </div>
          </div>

          {/* 9. Student Reviews & Interactive Feedback Form */}
          <div className="space-y-4 pt-2 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Student Ratings & Reviews</span>
                  <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full text-xs font-black border border-amber-200">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> {listing.rating} ({listing.reviewCount})
                  </span>
                </h3>
              </div>

              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
              >
                <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                {showReviewForm ? 'Cancel Review' : 'Write a Review'}
              </button>
            </div>

            {/* Review Success Notice */}
            {reviewSuccess && (
              <div className="p-3.5 bg-emerald-500 text-slate-950 font-extrabold rounded-2xl flex items-center justify-between gap-2 text-xs shadow-md animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-slate-950 shrink-0" />
                  <span>Thank you! Your verified star review & feedback has been posted and sent to the agent.</span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-slate-950 shrink-0" />
              </div>
            )}

            {/* Interactive Review Form */}
            {showReviewForm && (
              <form onSubmit={handleSubmitReview} className="p-5 bg-gradient-to-b from-neutral-50 to-white rounded-2xl border-2 border-emerald-500/40 space-y-4 shadow-sm animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                  <span className="text-xs font-extrabold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                    Submit Your Student Inspection Feedback
                  </span>
                  <span className="text-[10px] text-neutral-500 font-semibold">Verified Student Review</span>
                </div>

                {/* Star Rating Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 block">
                    Your Overall Rating: <span className="text-amber-600 font-extrabold">{hoverRating || rating} / 5 Stars</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((starVal) => {
                      const isFilled = starVal <= (hoverRating || rating);
                      return (
                        <button
                          key={starVal}
                          type="button"
                          onClick={() => setRating(starVal)}
                          onMouseEnter={() => setHoverRating(starVal)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 transition-transform active:scale-125 focus:outline-hidden"
                          title={`${starVal} Star${starVal > 1 ? 's' : ''}`}
                        >
                          <Star
                            className={`w-7 h-7 transition-colors ${
                              isFilled ? 'text-amber-400 fill-amber-400 drop-shadow-xs' : 'text-neutral-300'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Feedback Experience Tag Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 block flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-neutral-500" /> Review Verification Badge
                  </label>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(['Inspection Completed', 'Current Resident Student', 'Verified Tour Visitor'] as const).map((tagOption) => (
                      <button
                        key={tagOption}
                        type="button"
                        onClick={() => setReviewTag(tagOption)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                          reviewTag === tagOption
                            ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        {tagOption}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reviewer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-700 block mb-1">Your Name</label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-neutral-700 block mb-1">University Department / Level</label>
                    <input
                      type="text"
                      value={universityCourse}
                      onChange={(e) => setUniversityCourse(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Comment Textarea */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-700 block">
                    Detailed Written Feedback (Power stability, water supply, security, agent responsiveness)
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe your tour or tenancy experience. Was the agent punctual? Is there solar backup? How is water availability?"
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-4 py-2 border border-neutral-300 text-neutral-600 font-bold rounded-xl text-xs hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !comment.trim()}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                  >
                    {isSubmitting ? 'Posting...' : 'Submit Star Review'}
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* Reviews List */}
            {listing.reviews.length > 0 ? (
              <div className="space-y-3">
                {listing.reviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/90 space-y-2.5 hover:border-neutral-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img src={rev.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} alt="" className="w-9 h-9 rounded-full object-cover border border-neutral-300 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-neutral-900">{rev.authorName}</p>
                            {rev.tag && (
                              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-md border border-emerald-200">
                                ✓ {rev.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500 font-medium">{rev.universityCourse || 'Verified Student'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/80 text-xs font-extrabold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {rev.rating} / 5
                      </div>
                    </div>
                    
                    <p className="text-xs text-neutral-700 font-medium leading-relaxed bg-white p-3 rounded-xl border border-neutral-100">
                      "{rev.comment}"
                    </p>
                    
                    <div className="text-[10px] text-neutral-400 text-right font-medium">
                      Posted: {rev.date}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 p-6 space-y-2">
                <Star className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-xs font-bold text-neutral-700">No student reviews written yet</p>
                <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">Be the first student to leave feedback after inspecting this property!</p>
              </div>
            )}
          </div>

          {/* Report Fake Listing Button */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Campora Trust Guarantee Protected
            </span>
            <button
              onClick={() => onReportListing(listing)}
              className="text-neutral-500 hover:text-rose-600 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" /> Report Fake or Misleading Listing
            </button>
          </div>

        </div>

      </div>

      {/* Share Toast Banner Notice */}
      {shareNotice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 text-xs font-extrabold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{shareNotice}</span>
        </div>
      )}

      {/* Fallback Share Popover Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-neutral-200 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-neutral-900">Share Property Listing</h4>
                  <p className="text-[11px] text-neutral-500">Send to flatmates, friends, or parents</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Social Share Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + getShareUrl())}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-2xl font-bold flex flex-col items-center gap-1.5 transition-colors"
              >
                <span className="text-lg">💬</span>
                <span>WhatsApp</span>
              </a>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(getShareUrl())}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-900 rounded-2xl font-bold flex flex-col items-center gap-1.5 transition-colors"
              >
                <span className="text-lg">𝕏</span>
                <span>Twitter / X</span>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 rounded-2xl font-bold flex flex-col items-center gap-1.5 transition-colors"
              >
                <span className="text-lg">📘</span>
                <span>Facebook</span>
              </a>

              <a
                href={`mailto:?subject=${encodeURIComponent('Check out ' + listing.title)}&body=${encodeURIComponent(shareText + '\n\n' + getShareUrl())}`}
                className="p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 rounded-2xl font-bold flex flex-col items-center gap-1.5 transition-colors"
              >
                <span className="text-lg">✉️</span>
                <span>Email</span>
              </a>
            </div>

            {/* Link Copy Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-neutral-400 tracking-wider block">
                Direct Shareable Property URL
              </label>
              <div className="flex items-center gap-2 p-1.5 bg-neutral-100 border border-neutral-300 rounded-2xl">
                <input
                  type="text"
                  readOnly
                  value={getShareUrl()}
                  className="w-full px-2.5 py-1 text-xs font-mono text-neutral-800 bg-transparent focus:outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
