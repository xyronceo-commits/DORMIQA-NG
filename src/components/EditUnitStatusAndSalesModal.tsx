import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  DollarSign, 
  Tag, 
  FileText, 
  Building2, 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  Save, 
  Percent,
  ShieldAlert,
  Camera,
  Video,
  Upload,
  RefreshCw,
  Plus
} from 'lucide-react';
import { Listing, UnitStatus } from '../types';
import { updateListingStatusAndSales } from '../services/api';
import { uploadOrCompressPropertyPhoto, uploadPropertyVideo } from '../utils/imageUpload';

interface EditUnitStatusAndSalesModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onListingUpdated: (updatedListing: Listing) => void;
}

export const EditUnitStatusAndSalesModal: React.FC<EditUnitStatusAndSalesModalProps> = ({
  listing,
  isOpen,
  onClose,
  onListingUpdated
}) => {
  const [title, setTitle] = useState<string>(listing.title || '');
  const [address, setAddress] = useState<string>(listing.address || '');
  const [description, setDescription] = useState<string>(listing.description || '');

  // Media Editing State
  const [photos, setPhotos] = useState<string[]>(Array.isArray(listing.photos) ? [...listing.photos] : []);
  const [videoUrl, setVideoUrl] = useState<string>(listing.videoUrl || '');
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const [mediaUploadMessage, setMediaUploadMessage] = useState<string | null>(null);

  const [unitStatus, setUnitStatus] = useState<UnitStatus>(listing.unitStatus || 'vacant');
  const [vacanciesCount, setVacanciesCount] = useState<number>(listing.vacanciesCount || 1);
  const [unitStatusNote, setUnitStatusNote] = useState<string>(listing.unitStatusNote || '');

  // Sales Info State
  const [pricePerYear, setPricePerYear] = useState<number>(listing.pricePerYear || 350000);
  const [pricePerWeek, setPricePerWeek] = useState<number>(listing.pricePerWeek || Math.round((listing.pricePerYear || 350000) / 52));
  const [pricePerMonth, setPricePerMonth] = useState<number>(listing.pricePerMonth || Math.round((listing.pricePerYear || 350000) / 12));
  const [deposit, setDeposit] = useState<number>(listing.deposit || 30000);
  const [agencyFeeNote, setAgencyFeeNote] = useState<string>(listing.agencyFeeNote || '10% Agency & Legal Agreement Fee');
  const [promoDiscount, setPromoDiscount] = useState<string>(listing.promoDiscount || '');
  const [salesNote, setSalesNote] = useState<string>(listing.salesNote || '');
  const [isAvailableForSale, setIsAvailableForSale] = useState<boolean>(
    listing.isAvailableForSale !== undefined ? listing.isAvailableForSale : true
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const isRejected = listing.status === 'rejected' || listing.verificationStatus === 'rejected';

  const handleYearPriceChange = (val: number) => {
    setPricePerYear(val);
    setPricePerWeek(Math.round(val / 52));
    setPricePerMonth(Math.round(val / 12));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, replaceIndex?: number) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingMedia(true);
    setMediaUploadMessage('Compressing and uploading photo...');
    setErrorMessage(null);

    try {
      const file = files[0];
      const uploadedUrl = await uploadOrCompressPropertyPhoto(file, listing.id, replaceIndex ?? photos.length);
      
      setPhotos(prev => {
        if (replaceIndex !== undefined && replaceIndex >= 0 && replaceIndex < prev.length) {
          const next = [...prev];
          next[replaceIndex] = uploadedUrl;
          return next;
        }
        if (prev.length >= 3) {
          return [uploadedUrl, prev[1], prev[2]].filter(Boolean);
        }
        return [...prev, uploadedUrl].slice(0, 3);
      });
      setMediaUploadMessage(null);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to upload photo.');
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('Video file must be 50 MB or less.');
      e.target.value = '';
      return;
    }

    setIsUploadingMedia(true);
    setMediaUploadMessage('Uploading property video walkthrough...');
    setErrorMessage(null);

    try {
      const uploadedUrl = await uploadPropertyVideo(file, listing.id, (percent) => {
        setMediaUploadMessage(`Uploading property video... ${percent}%`);
      });
      setVideoUrl(uploadedUrl);
      setMediaUploadMessage(null);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to upload video.');
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleResubmitForVerification = async () => {
    if (photos.length < 1) {
      setErrorMessage('A clear front-of-building photo is compulsory before resubmitting for verification.');
      return;
    }
    if (!videoUrl.trim()) {
      setErrorMessage('A property video walkthrough is compulsory before resubmitting for verification.');
      return;
    }

    setIsResubmitting(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const updated = await updateListingStatusAndSales(listing.id, {
        title,
        hotelName: title,
        address,
        description,
        photos,
        videoUrl,
        resubmitForVerification: true,
        unitStatus,
        vacanciesCount,
        unitStatusNote,
        pricePerYear,
        pricePerMonth,
        pricePerWeek,
        deposit,
        agencyFeeNote,
        promoDiscount,
        salesNote,
        isAvailableForSale
      });

      setSuccessNotice('Listing resubmitted for verification! Our team is reviewing the corrected details.');
      onListingUpdated(updated);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to resubmit listing.');
    } finally {
      setIsResubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const updated = await updateListingStatusAndSales(listing.id, {
        title,
        hotelName: title,
        address,
        description,
        photos,
        videoUrl,
        unitStatus,
        vacanciesCount,
        unitStatusNote,
        pricePerYear,
        pricePerMonth,
        pricePerWeek,
        deposit,
        agencyFeeNote,
        promoDiscount,
        salesNote,
        isAvailableForSale
      });

      setSuccessNotice('Property listing details updated successfully!');
      onListingUpdated(updated);

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to update property details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-black w-full max-w-2xl rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-black text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Manage Unit Status & Sales Info</h2>
              <p className="text-xs text-neutral-400 line-clamp-1">{listing.title} • {listing.hotelName || listing.address}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          
          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-black text-white border border-neutral-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Rejection Alert Banner with Resubmit Call-To-Action */}
          {isRejected && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-extrabold text-xs">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Verification Rejected — Action Required</span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium leading-relaxed">
                <strong>Reason:</strong> {listing.rejectionReason || listing.aiBanReason || 'Listing media or details need correction before approval.'}
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                Update the front-of-building photo, property video walkthrough, or listing details below, then click <strong>"Resubmit for Verification"</strong> to reset this listing to pending status.
              </p>
            </div>
          )}

          {mediaUploadMessage && (
            <div className="p-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
              <span>{mediaUploadMessage}</span>
            </div>
          )}

          {/* SECTION 0: BASIC PROPERTY DETAILS */}
          <div className="space-y-4">
            <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                1. Basic Property & Listing Details
              </h3>
              <p className="text-[11px] text-neutral-500">Edit the title, location address, and overview description of this hostel.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-black dark:text-white block mb-1">
                  Hostel / Listing Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  placeholder="e.g. Royal Crown Student Lodge"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-black dark:text-white block mb-1">
                  Address / Campus Area
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  placeholder="e.g. 14 Oke-Baale Expressway, Osogbo"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-black dark:text-white block mb-1">
                Property Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
                placeholder="Describe rooms, power supply, security, water supply, and distance to lecture halls..."
              />
            </div>
          </div>

          {/* SECTION 1: PROPERTY PHOTOS & VIDEO CORRECTION */}
          <div className="space-y-4">
            <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                2. Property Photos & Video Media
              </h3>
              <p className="text-[11px] text-neutral-500">
                Replace or correct property photos (front photo compulsory) and property walkthrough video.
              </p>
            </div>

            {/* Photos Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-black dark:text-white block">
                Property Photos (Up to 3, Front photo required) *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((idx) => {
                  const currentPhoto = photos[idx];
                  return (
                    <div
                      key={idx}
                      className="relative aspect-video rounded-xl overflow-hidden border-2 border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 flex flex-col items-center justify-center group"
                    >
                      {currentPhoto ? (
                        <>
                          <img src={currentPhoto} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
                            <label className="p-1.5 bg-white text-black rounded-lg text-[10px] font-bold cursor-pointer hover:bg-neutral-100">
                              <span>Replace</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isUploadingMedia}
                                onChange={(e) => handlePhotoUpload(e, idx)}
                              />
                            </label>
                            {photos.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx)}
                                className="p-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold hover:bg-rose-500"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          <span className="absolute bottom-1 left-1 bg-black/80 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                            {idx === 0 ? 'Front Photo' : `Photo ${idx + 1}`}
                          </span>
                        </>
                      ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-2 text-center hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                          <Plus className="w-5 h-5 text-neutral-400 mb-1" />
                          <span className="text-[10px] font-bold text-neutral-500">
                            {idx === 0 ? '+ Add Front Photo' : `+ Add Photo ${idx + 1}`}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploadingMedia}
                            onChange={(e) => handlePhotoUpload(e, idx)}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Video Walkthrough Box */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-black dark:text-white block flex items-center gap-1.5">
                <Video className="w-4 h-4 text-purple-500" />
                <span>Property Walkthrough Video (Max 50 MB) *</span>
              </label>

              {videoUrl ? (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Video walkthrough attached
                    </span>
                    <label className="px-3 py-1 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 text-neutral-800 dark:text-neutral-200 font-bold rounded-lg text-[11px] cursor-pointer">
                      <span>Replace Video</span>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        disabled={isUploadingMedia}
                        onChange={handleVideoUpload}
                      />
                    </label>
                  </div>
                  <video
                    src={videoUrl}
                    controls
                    className="w-full max-h-40 rounded-lg bg-black aspect-video object-cover"
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-4 text-center bg-neutral-50 dark:bg-neutral-900">
                  <Video className="w-6 h-6 text-neutral-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Upload Property Video</p>
                  <p className="text-[10px] text-neutral-500 mb-2">Required for verification approval (max 50 MB)</p>
                  <label className="px-3.5 py-1.5 bg-black text-white dark:bg-white dark:text-black font-extrabold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select Video File</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      disabled={isUploadingMedia}
                      onChange={handleVideoUpload}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 1: UNIT POSTED STATUS */}
          <div className="space-y-4">
            <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                2. Unit Occupancy & Availability Status
              </h3>
              <p className="text-[11px] text-neutral-500">Specify whether the rooms are vacant, occupied, under renovation, or if few units remain.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setUnitStatus('vacant')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  unitStatus === 'vacant'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-black dark:text-white ring-2 ring-emerald-500/20'
                    : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-emerald-500 mb-2"></div>
                <span className="text-xs font-bold">Vacant</span>
                <span className="text-[10px] text-neutral-500">Ready for move-in</span>
              </button>

              <button
                type="button"
                onClick={() => setUnitStatus('remaining')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  unitStatus === 'remaining'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-black dark:text-white ring-2 ring-emerald-500/20'
                    : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-emerald-500 mb-2"></div>
                <span className="text-xs font-bold">Few Remaining</span>
                <span className="text-[10px] text-neutral-500">Limited vacancies</span>
              </button>

              <button
                type="button"
                onClick={() => setUnitStatus('under_renovation')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  unitStatus === 'under_renovation'
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white ring-2 ring-black/20'
                    : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-emerald-500 mb-2"></div>
                <span className="text-xs font-bold">Under Renovation</span>
                <span className="text-[10px] text-neutral-500">Work in progress</span>
              </button>

              <button
                type="button"
                onClick={() => setUnitStatus('occupied')}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  unitStatus === 'occupied'
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white ring-2 ring-black/20'
                    : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-black dark:bg-white mb-2"></div>
                <span className="text-xs font-bold">Occupied</span>
                <span className="text-[10px] text-neutral-500">Fully rented out</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-black dark:text-white block mb-1">
                  Remaining Vacant Rooms Count
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={vacanciesCount}
                  onChange={(e) => setVacanciesCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  placeholder="e.g. 3"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-black dark:text-white block mb-1">
                  Unit Status Note / Detail
                </label>
                <input
                  type="text"
                  value={unitStatusNote}
                  onChange={(e) => setUnitStatusNote(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  placeholder="e.g. Painting and tiling almost done. Available Oct 1st."
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: SALES & PRICING INFORMATION */}
          <div className="space-y-4">
            <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                3. Sales & Pricing Information
              </h3>
              <p className="text-[11px] text-neutral-500">Update property rental pricing, caution deposit, promo discounts, and sales notes.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-black dark:text-white block mb-1">
                  Yearly Rent (₦)
                </label>
                <input
                  type="number"
                  step="5000"
                  min="0"
                  value={pricePerYear}
                  onChange={(e) => handleYearPriceChange(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-black dark:text-white block mb-1">
                  Weekly Rent (₦)
                </label>
                <input
                  type="number"
                  step="500"
                  min="0"
                  value={pricePerWeek}
                  onChange={(e) => setPricePerWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-black dark:text-white block mb-1">
                  Refundable Caution Deposit (₦)
                </label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-black dark:text-white block mb-1">
                  Agency & Legal Fee Terms
                </label>
                <input
                  type="text"
                  value={agencyFeeNote}
                  onChange={(e) => setAgencyFeeNote(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  placeholder="e.g. 10% Agency & Legal Agreement Fee"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-black dark:text-white block mb-1">
                  Special Offer / Promo Discount
                </label>
                <input
                  type="text"
                  value={promoDiscount}
                  onChange={(e) => setPromoDiscount(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  placeholder="e.g. ₦20,000 Early Bird discount for full year payment"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-black dark:text-white block mb-1">
                Sales & Payment Instructions / Notes
              </label>
              <textarea
                rows={2}
                value={salesNote}
                onChange={(e) => setSalesNote(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
                placeholder="e.g. 2-tranche installment allowed. Inspection available Mondays - Saturdays 9am - 5pm."
              />
            </div>

            {/* Availability Toggle */}
            <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-black dark:text-white block">Accepting Student Enquiries & Inspections</span>
                <span className="text-[10px] text-neutral-500">Toggle off to temporarily hide sales button on student view.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAvailableForSale(!isAvailableForSale)}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 relative cursor-pointer ${
                  isAvailableForSale ? 'bg-emerald-600' : 'bg-neutral-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    isAvailableForSale ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              {isRejected && (
                <button
                  type="button"
                  onClick={handleResubmitForVerification}
                  disabled={isSubmitting || isResubmitting || isUploadingMedia}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Resubmit corrected listing for admin verification"
                >
                  {isResubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Resubmitting...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resubmit for Verification</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isResubmitting}
                className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isResubmitting || isUploadingMedia}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Saving Changes...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Update Unit Status & Sales Info</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
