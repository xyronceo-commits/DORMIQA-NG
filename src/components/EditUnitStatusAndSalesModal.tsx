import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  DollarSign, 
  Building2, 
  AlertTriangle, 
  Save, 
  ShieldAlert, 
  Camera, 
  Video, 
  Upload, 
  RefreshCw, 
  Plus,
  Trash2,
  MapPin,
  Clock,
  Users,
  Check,
  Zap,
  Droplets,
  Wifi,
  ShieldCheck,
  Bed,
  Bath,
  Sparkles,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Listing, PropertyType, UnitStatus } from '../types';
import { updateListingStatusAndSales } from '../services/api';
import { uploadOrCompressPropertyPhoto, uploadPropertyVideo } from '../utils/imageUpload';

interface EditUnitStatusAndSalesModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onListingUpdated: (updatedListing: Listing) => void;
}

type EditTab = 'general' | 'amenities' | 'media' | 'pricing';

const POPULAR_AMENITIES = [
  '24/7 Solar / Inverter Power',
  'Borehole Water / Running Tap',
  'Prepaid Meter',
  'Gated Security & Fenced',
  'Free High-Speed Wi-Fi',
  'Kitchen / Cooking Space',
  'Personal Ensuite Bathroom',
  'Tiled Floor & POP Ceiling',
  'Wardrobe & Study Desk',
  'Security Guard On-Site',
  'Generator Backup',
  'Private Balcony',
  'Waste Disposal System'
];

export const EditUnitStatusAndSalesModal: React.FC<EditUnitStatusAndSalesModalProps> = ({
  listing,
  isOpen,
  onClose,
  onListingUpdated
}) => {
  const [activeTab, setActiveTab] = useState<EditTab>('general');

  // Tab 1: General & Location
  const [title, setTitle] = useState<string>(listing.title || listing.hotelName || '');
  const [propertyType, setPropertyType] = useState<PropertyType>(listing.propertyType || 'self_contain');
  const [address, setAddress] = useState<string>(listing.address || '');
  const [walkingMinutes, setWalkingMinutes] = useState<number>(listing.walkingDistanceMinutes || 10);
  const [genderPreference, setGenderPreference] = useState<'any' | 'female_only' | 'male_only'>(
    listing.genderPreference || 'any'
  );
  const [totalBedrooms, setTotalBedrooms] = useState<number>(listing.totalBedrooms || 1);
  const [totalBathrooms, setTotalBathrooms] = useState<number>(listing.totalBathrooms || 1);
  const [billsIncluded, setBillsIncluded] = useState<boolean>(listing.billsIncluded ?? true);
  const [description, setDescription] = useState<string>(listing.description || '');

  // Tab 2: Amenities & Rules
  const [facilities, setFacilities] = useState<string[]>(
    Array.isArray(listing.facilities) ? [...listing.facilities] : []
  );
  const [customAmenityInput, setCustomAmenityInput] = useState<string>('');
  const [rules, setRules] = useState<string[]>(
    Array.isArray(listing.rules) && listing.rules.length > 0 
      ? [...listing.rules] 
      : ['Student ID Clearance Required', 'Quiet Hours After 10 PM', 'No Smoking Indoors']
  );
  const [customRuleInput, setCustomRuleInput] = useState<string>('');

  // Tab 3: Media
  const [photos, setPhotos] = useState<string[]>(Array.isArray(listing.photos) ? [...listing.photos] : []);
  const [videoUrl, setVideoUrl] = useState<string>(listing.videoUrl || '');
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const [mediaUploadMessage, setMediaUploadMessage] = useState<string | null>(null);

  // Tab 4: Pricing & Occupancy
  const [unitStatus, setUnitStatus] = useState<UnitStatus>(listing.unitStatus || 'vacant');
  const [vacanciesCount, setVacanciesCount] = useState<number>(listing.vacanciesCount || 1);
  const [unitStatusNote, setUnitStatusNote] = useState<string>(listing.unitStatusNote || '');
  const [pricePerYear, setPricePerYear] = useState<number>(listing.pricePerYear || 350000);
  const [pricePerWeek, setPricePerWeek] = useState<number>(
    listing.pricePerWeek || Math.round((listing.pricePerYear || 350000) / 52)
  );
  const [pricePerMonth, setPricePerMonth] = useState<number>(
    listing.pricePerMonth || Math.round((listing.pricePerYear || 350000) / 12)
  );
  const [deposit, setDeposit] = useState<number>(listing.deposit || 30000);
  const [agencyFeeNote, setAgencyFeeNote] = useState<string>(listing.agencyFeeNote || '10% Agency & Legal Agreement Fee');
  const [promoDiscount, setPromoDiscount] = useState<string>(listing.promoDiscount || '');
  const [salesNote, setSalesNote] = useState<string>(listing.salesNote || '');
  const [isAvailableForSale, setIsAvailableForSale] = useState<boolean>(
    listing.isAvailableForSale !== undefined ? listing.isAvailableForSale : true
  );

  // State flags
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

  const handleToggleAmenity = (amenity: string) => {
    setFacilities(prev => 
      prev.includes(amenity) ? prev.filter(f => f !== amenity) : [...prev, amenity]
    );
  };

  const handleAddCustomAmenity = () => {
    const trimmed = customAmenityInput.trim();
    if (!trimmed) return;
    if (!facilities.includes(trimmed)) {
      setFacilities(prev => [...prev, trimmed]);
    }
    setCustomAmenityInput('');
  };

  const handleRemoveAmenity = (amenity: string) => {
    setFacilities(prev => prev.filter(f => f !== amenity));
  };

  const handleAddCustomRule = () => {
    const trimmed = customRuleInput.trim();
    if (!trimmed) return;
    if (!rules.includes(trimmed)) {
      setRules(prev => [...prev, trimmed]);
    }
    setCustomRuleInput('');
  };

  const handleRemoveRule = (idx: number) => {
    setRules(prev => prev.filter((_, i) => i !== idx));
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

  const buildPayload = (isResubmit: boolean = false) => {
    return {
      title: title.trim(),
      hotelName: title.trim(),
      address: address.trim(),
      description: description.trim(),
      propertyType,
      facilities,
      rules,
      walkingDistanceMinutes: Number(walkingMinutes) || 10,
      walkingDistanceMeters: (Number(walkingMinutes) || 10) * 80,
      genderPreference,
      totalBedrooms: Number(totalBedrooms) || 1,
      totalBathrooms: Number(totalBathrooms) || 1,
      billsIncluded,
      photos,
      videoUrl: videoUrl.trim(),
      unitStatus,
      vacanciesCount: Number(vacanciesCount) || 0,
      unitStatusNote: unitStatusNote.trim(),
      pricePerYear: Number(pricePerYear) || 0,
      pricePerMonth: Number(pricePerMonth) || 0,
      pricePerWeek: Number(pricePerWeek) || 0,
      deposit: Number(deposit) || 0,
      agencyFeeNote: agencyFeeNote.trim(),
      promoDiscount: promoDiscount.trim(),
      salesNote: salesNote.trim(),
      isAvailableForSale,
      ...(isResubmit ? { resubmitForVerification: true } : {})
    };
  };

  const handleResubmitForVerification = async () => {
    if (photos.length < 1) {
      setErrorMessage('A clear front-of-building photo is compulsory before resubmitting for verification.');
      setActiveTab('media');
      return;
    }
    if (!videoUrl.trim()) {
      setErrorMessage('A property video walkthrough is compulsory before resubmitting for verification.');
      setActiveTab('media');
      return;
    }

    setIsResubmitting(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const payload = buildPayload(true);
      const updated = await updateListingStatusAndSales(listing.id, payload);

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
    if (!title.trim()) {
      setErrorMessage('Please provide a hostel title.');
      setActiveTab('general');
      return;
    }
    if (!address.trim()) {
      setErrorMessage('Please provide an address or campus area.');
      setActiveTab('general');
      return;
    }
    if (photos.length < 1) {
      setErrorMessage('At least one front-of-building photo is required.');
      setActiveTab('media');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const payload = buildPayload(false);
      const updated = await updateListingStatusAndSales(listing.id, payload);

      setSuccessNotice('Hostel details saved and updated successfully to backend!');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-neutral-950 w-full max-w-3xl rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Edit & Update Hostel</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                  Agent Editor
                </span>
              </h2>
              <p className="text-xs text-neutral-400 line-clamp-1">{listing.title} • {listing.address}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Close editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'general', label: 'Basic & Location', icon: Building2 },
            { id: 'amenities', label: 'Amenities & Rules', icon: Sparkles },
            { id: 'media', label: `Photos & Video (${photos.length}/3)`, icon: Camera },
            { id: 'pricing', label: 'Pricing & Occupancy', icon: DollarSign },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as EditTab)}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer border-b-2 ${
                  isActive 
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-neutral-950' 
                    : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          
          {successNotice && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
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
                <strong>Reason:</strong> {listing.rejectionReason || 'Listing media or details need correction before approval.'}
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

          {/* TAB 1: BASIC INFORMATION & LOCATION */}
          {activeTab === 'general' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Property Overview & Location
                </h3>
                <p className="text-[11px] text-neutral-500">Edit the title, property type, location, walking distance, and layout.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Hostel / Listing Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Royal Crown Student Lodge"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Property Type *
                  </label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="self_contain">Self-Contain / Studio Apartment</option>
                    <option value="single_room">Single Room (Shared Facilities)</option>
                    <option value="one_bedroom">1-Bedroom Mini Flat</option>
                    <option value="shared_flat">Shared Flat / Apartment</option>
                    <option value="bedspace">Bedspace (Shared Room)</option>
                    <option value="studio">Modern Studio</option>
                    <option value="ensuite">Ensuite Room (Private Bath)</option>
                    <option value="duplex_flat">Duplex / 2-Bedroom Flat</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Address / Campus Area *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. Oke-Baale Expressway, Near Main Gate, Osogbo"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Walk to Campus (Mins)
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={walkingMinutes}
                      onChange={(e) => setWalkingMinutes(Math.max(1, Number(e.target.value)))}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. 8"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Gender Preference
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <select
                      value={genderPreference}
                      onChange={(e) => setGenderPreference(e.target.value as any)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="any">All Students (Mixed / Any)</option>
                      <option value="female_only">Female Students Only</option>
                      <option value="male_only">Male Students Only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Bedrooms Count
                  </label>
                  <div className="relative">
                    <Bed className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={totalBedrooms}
                      onChange={(e) => setTotalBedrooms(Math.max(1, Number(e.target.value)))}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Bathrooms Count
                  </label>
                  <div className="relative">
                    <Bath className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={totalBathrooms}
                      onChange={(e) => setTotalBathrooms(Math.max(1, Number(e.target.value)))}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bills Included Toggle */}
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">Utilities / Bills Included in Rent</span>
                  <span className="text-[11px] text-neutral-500">Water, security, or environmental waste bills covered in yearly fee.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBillsIncluded(!billsIncluded)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 relative cursor-pointer ${
                    billsIncluded ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      billsIncluded ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  Property Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Describe rooms, power supply, security, water supply, and proximity to campus lecture halls..."
                />
              </div>
            </div>
          )}

          {/* TAB 2: AMENITIES & RULES */}
          {activeTab === 'amenities' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Hostel Amenities & Facilities
                </h3>
                <p className="text-[11px] text-neutral-500">Select what is provided in this hostel to attract student tenants.</p>
              </div>

              {/* Popular Amenities Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {POPULAR_AMENITIES.map((amenity) => {
                  const isChecked = facilities.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => handleToggleAmenity(amenity)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        isChecked 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs' 
                          : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300'
                      }`}
                    >
                      <span className="line-clamp-1">{amenity}</span>
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ml-2 ${
                        isChecked ? 'bg-emerald-600 text-white' : 'border border-neutral-300 dark:border-neutral-700'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Amenity Adder */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  Add Custom Amenity / Facility
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customAmenityInput}
                    onChange={(e) => setCustomAmenityInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomAmenity(); }}}
                    placeholder="e.g. Reading Room, Dedicated Transformer..."
                    className="flex-1 px-3 py-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAmenity}
                    className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-extrabold rounded-xl hover:opacity-90 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Selected Amenities Badges */}
                {facilities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {facilities.map((fac) => (
                      <span 
                        key={fac} 
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px] font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 shadow-2xs"
                      >
                        {fac}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveAmenity(fac)}
                          className="hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Hostel Rules Section */}
              <div className="pt-2 space-y-3">
                <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Hostel Rules & Policies
                  </h3>
                  <p className="text-[11px] text-neutral-500">Rules tenants must follow while living in this accommodation.</p>
                </div>

                <div className="space-y-2">
                  {rules.map((rule, idx) => (
                    <div 
                      key={idx}
                      className="px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold text-neutral-800 dark:text-neutral-200"
                    >
                      <span>• {rule}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(idx)}
                        className="text-neutral-400 hover:text-rose-600 cursor-pointer p-1 transition-colors"
                        title="Remove rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customRuleInput}
                    onChange={(e) => setCustomRuleInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomRule(); }}}
                    placeholder="e.g. Gate closes strictly by 10:00 PM"
                    className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomRule}
                    className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-extrabold rounded-xl hover:opacity-90 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Rule</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PHOTOS & VIDEO MEDIA */}
          {activeTab === 'media' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  Property Photos & Video Walkthrough
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Update front-of-building photo (required) and walkthrough video (max 50 MB) to keep listings verified.
                </p>
              </div>

              {/* Photos Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-900 dark:text-white block">
                  Property Photos (Up to 3, Front photo required) *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((idx) => {
                    const currentPhoto = photos[idx];
                    return (
                      <div
                        key={idx}
                        className="relative aspect-video rounded-2xl overflow-hidden border-2 border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 flex flex-col items-center justify-center group"
                      >
                        {currentPhoto ? (
                          <>
                            <img src={currentPhoto} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
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
                            <span className="absolute bottom-1.5 left-1.5 bg-black/80 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md">
                              {idx === 0 ? 'Front Photo ★' : `Photo ${idx + 1}`}
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
                <label className="text-xs font-bold text-neutral-900 dark:text-white block flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-purple-500" />
                  <span>Property Walkthrough Video (Max 50 MB)</span>
                </label>

                {videoUrl ? (
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        Video walkthrough attached
                      </span>
                      <div className="flex items-center gap-2">
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
                        <button
                          type="button"
                          onClick={() => setVideoUrl('')}
                          className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-[11px] font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <video
                      src={videoUrl}
                      controls
                      className="w-full max-h-48 rounded-xl bg-black aspect-video object-cover"
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-6 text-center bg-neutral-50 dark:bg-neutral-900">
                    <Video className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Upload Property Walkthrough Video</p>
                    <p className="text-[10px] text-neutral-500 mb-3">Compulsory for quick verification approval (mp4, webm, mov, max 50 MB)</p>
                    <label className="px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-extrabold rounded-xl text-xs cursor-pointer inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
                      <Upload className="w-4 h-4" />
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
          )}

          {/* TAB 4: PRICING & OCCUPANCY */}
          {activeTab === 'pricing' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Pricing, Occupancy & Availability
                </h3>
                <p className="text-[11px] text-neutral-500">Update rental rates, vacancies, and tenant occupancy status.</p>
              </div>

              {/* Occupancy Status Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setUnitStatus('vacant')}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    unitStatus === 'vacant'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-neutral-900 dark:text-white ring-2 ring-emerald-500/20'
                      : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
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
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-neutral-900 dark:text-white ring-2 ring-emerald-500/20'
                      : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
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
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-neutral-900 dark:text-white ring-2 ring-amber-500/20'
                      : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full bg-amber-500 mb-2"></div>
                  <span className="text-xs font-bold">Under Renovation</span>
                  <span className="text-[10px] text-neutral-500">Work in progress</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUnitStatus('occupied')}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    unitStatus === 'occupied'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 border-neutral-900 dark:border-white ring-2 ring-neutral-500/20'
                      : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full bg-neutral-400 mb-2"></div>
                  <span className="text-xs font-bold">Occupied</span>
                  <span className="text-[10px] text-neutral-500">Fully rented out</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Remaining Vacant Rooms / Bedspaces
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={vacanciesCount}
                    onChange={(e) => setVacanciesCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. 3"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Unit Status Note / Detail
                  </label>
                  <input
                    type="text"
                    value={unitStatusNote}
                    onChange={(e) => setUnitStatusNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Painting and tiling almost done. Available Oct 1st."
                  />
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Yearly Rent (₦) *
                  </label>
                  <input
                    type="number"
                    step="5000"
                    min="0"
                    required
                    value={pricePerYear}
                    onChange={(e) => handleYearPriceChange(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Weekly Rent (₦)
                  </label>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={pricePerWeek}
                    onChange={(e) => setPricePerWeek(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Refundable Caution Deposit (₦)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={deposit}
                    onChange={(e) => setDeposit(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Agency & Legal Fee Terms
                  </label>
                  <input
                    type="text"
                    value={agencyFeeNote}
                    onChange={(e) => setAgencyFeeNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. 10% Agency & Legal Agreement Fee"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                    Special Offer / Promo Discount
                  </label>
                  <input
                    type="text"
                    value={promoDiscount}
                    onChange={(e) => setPromoDiscount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. ₦20,000 Early Bird discount for full session payment"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  Sales & Payment Instructions / Notes
                </label>
                <textarea
                  rows={2}
                  value={salesNote}
                  onChange={(e) => setSalesNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="e.g. 2-tranche installment allowed. Physical tours available Mon-Sat 9am - 5pm."
                />
              </div>

              {/* Availability Toggle */}
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">Accepting Student Enquiries & Inspections</span>
                  <span className="text-[11px] text-neutral-500">Toggle off to temporarily pause enquiries on public search views.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAvailableForSale(!isAvailableForSale)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 relative cursor-pointer ${
                    isAvailableForSale ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-700'
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
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
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

              {/* Quick Tab Switch Helpers */}
              {activeTab !== 'general' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs: EditTab[] = ['general', 'amenities', 'media', 'pricing'];
                    const curIdx = tabs.indexOf(activeTab);
                    if (curIdx > 0) setActiveTab(tabs[curIdx - 1]);
                  }}
                  className="px-3 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous Tab</span>
                </button>
              )}

              {activeTab !== 'pricing' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs: EditTab[] = ['general', 'amenities', 'media', 'pricing'];
                    const curIdx = tabs.indexOf(activeTab);
                    if (curIdx < tabs.length - 1) setActiveTab(tabs[curIdx + 1]);
                  }}
                  className="px-3 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <span>Next Tab</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isResubmitting}
                className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isResubmitting || isUploadingMedia}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Backend...</span>
                  </span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save & Update Hostel</span>
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
