import React, { useState } from 'react';
import { X, Building2, Upload, Plus, CheckCircle2, Footprints, Video, AlertCircle, Camera, Check } from 'lucide-react';
import { University, PropertyType, Listing } from '../types';
import { createListing } from '../services/api';
import { sendNotification, notifyAgentListingReviewComplete } from '../services/notificationService';

interface AddListingModalProps {
  universities: University[];
  onClose: () => void;
  onSuccess: (newListing: Listing) => void;
  agentId: string;
}

const DEFAULT_FIVE_PHOTOS = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
];

const SAMPLE_360_VIDEO = 'https://assets.mixkit.co/videos/preview/mixkit-interior-of-a-modern-apartment-41552-large.mp4';

export const AddListingModal: React.FC<AddListingModalProps> = ({
  universities,
  onClose,
  onSuccess,
  agentId
}) => {
  const [title, setTitle] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [universityId, setUniversityId] = useState(universities[0]?.id || 'unilag');
  const [propertyType, setPropertyType] = useState<PropertyType | 'hotel_suite' | 'hotel_lodge'>('hotel_suite');
  const [pricePerYear, setPricePerYear] = useState(450000);
  const [walkingDistanceMinutes, setWalkingDistanceMinutes] = useState(5);
  const [vacanciesCount, setVacanciesCount] = useState(6);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [facilitiesText, setFacilitiesText] = useState('24/7 Solar Power, Hotel Security, Free Wi-Fi, Borehole Water, Swimming Pool, Laundry Service');
  
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [photos, setPhotos] = useState<string[]>(DEFAULT_FIVE_PHOTOS);
  const [videoUrl, setVideoUrl] = useState(SAMPLE_360_VIDEO);
  
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedUni = universities.find(u => u.id === universityId);

  const handleAddPhoto = () => {
    if (!photoUrlInput.trim()) return;
    setPhotos(prev => [...prev, photoUrlInput.trim()]);
    setPhotoUrlInput('');
    setValidationError(null);
  };

  const handleDevicePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    setValidationError(null);
    e.target.value = '';
  };

  const handleDeviceVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const videoObjectUrl = URL.createObjectURL(file as Blob);
    setVideoUrl(videoObjectUrl);
    setValidationError(null);
    e.target.value = '';
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!title.trim()) {
      setValidationError('Please enter the accommodation name / title.');
      return;
    }
    if (!hotelName.trim()) {
      setValidationError('Please enter the name of the hotel / building.');
      return;
    }
    if (!address.trim()) {
      setValidationError('Please enter the complete street address.');
      return;
    }
    if (photos.length < 5) {
      setValidationError(`You must provide at least 5 photos before publishing live. Currently uploaded: ${photos.length}/5.`);
      return;
    }
    if (!videoUrl.trim()) {
      setValidationError('A 360-degree video walkthrough URL is required so students can inspect the property before booking.');
      return;
    }

    setSubmitting(true);
    const facilities = facilitiesText.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const created = await createListing({
        title,
        hotelName,
        universityId,
        universityName: selectedUni?.name || 'University Campus',
        propertyType: propertyType as PropertyType,
        pricePerYear,
        pricePerMonth: Math.round(pricePerYear / 12),
        pricePerWeek: Math.round(pricePerYear / 52),
        currency: 'NGN',
        billsIncluded: true,
        deposit: Math.round(pricePerYear * 0.1),
        walkingDistanceMinutes,
        walkingDistanceMeters: walkingDistanceMinutes * 80,
        vacanciesCount,
        address,
        city: selectedUni?.city || 'Lagos',
        state: selectedUni?.state || 'Lagos State',
        lat: (selectedUni?.lat || 6.5158) + (Math.random() - 0.5) * 0.005,
        lng: (selectedUni?.lng || 3.3898) + (Math.random() - 0.5) * 0.005,
        photos,
        videoUrl,
        facilities,
        genderPreference: 'any',
        availableFrom: '2026-09-01',
        minLeaseMonths: 12,
        totalBedrooms: 1,
        totalBathrooms: 1,
        isVerified: true,
        agentId,
        agent: {
          id: agentId,
          name: 'Chief Tunde Adebayo',
          agencyName: 'Yaba Verified Student Housing',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
          phone: '+234 803 456 7890',
          email: 'tunde@yabahomes.ng',
          responseRate: '99%',
          responseTime: 'Under 15 mins',
          isVerified: true,
          rating: 4.9,
          totalReviews: 84
        },
        rules: ['Hotel Security Clearance Required', 'Student ID Verified at Check-in', 'No Smoking in Rooms'],
        description: description || `${title} at ${hotelName}. A premium student accommodation situated just ${walkingDistanceMinutes} minutes walk to ${selectedUni?.name || 'campus'}. Features ${vacanciesCount} available rooms, full 24/7 solar backup light, and verified 360° video walkthrough.`
      });

      setSubmitting(false);

      if (created.status === 'banned' || created.isAiBanned) {
        const banReason = created.aiBanReason || 'UNAPPROVED BY AI: Duplicate property listing detected by another agent. Multiple agents cannot list identical properties.';
        
        // Notify agent directly of unapproved listing with clear reasons
        await notifyAgentListingReviewComplete({
          agentId,
          listingTitle: title,
          isApproved: false,
          rejectionReason: banReason,
          listingId: created.id,
          universityId
        });

        setValidationError(`🚨 ${banReason}`);
        return;
      }

      // Notify agent of successful AI approval
      await notifyAgentListingReviewComplete({
        agentId,
        listingTitle: title,
        isApproved: true,
        listingId: created.id,
        universityId
      });

      // Broadcast real-time notification to students around this campus
      sendNotification({
        userId: 'all',
        title: `🏠 New Campus Lodge: ${title}`,
        body: `New ${propertyType.replace('_', ' ')} listed ${walkingDistanceMinutes} mins from ${selectedUni?.name || 'campus'} at ₦${pricePerYear.toLocaleString()}/yr.`,
        type: 'listing',
        universityId,
        metadata: {
          listingId: created.id
        }
      });

      onSuccess(created);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
      setValidationError('Failed to publish listing. Please check connection and retry.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-neutral-200 p-6 relative my-auto max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full border border-neutral-200 text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md w-fit mb-2 border border-emerald-200">
            <Building2 className="w-3.5 h-3.5" /> Agent Publisher Portal
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900">List Hotel / Student Accommodation</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Provide full hotel details, 5 required photos, and a 360° video walkthrough so students can inspect the environment before publishing live.
          </p>
        </div>

        {validationError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-800 text-xs font-bold animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Name of accommodation type & 2. Name of hotel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-neutral-900 uppercase block mb-1">
                Name of Accommodation Type <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Deluxe Executive Studio Room"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-900 bg-neutral-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-900 uppercase block mb-1">
                Name of Hotel / Lodge <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Royal Palms Student Hotel"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-900 bg-neutral-50 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* 3. Property Type & 4. Name of Institution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-neutral-900 uppercase block mb-1">
                Property Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-900 bg-neutral-50"
              >
                <option value="hotel_suite">Hotel Suite / Luxury Lodge</option>
                <option value="hotel_lodge">Student Hotel Lodge</option>
                <option value="self_contain">Self-Contain Studio</option>
                <option value="single_room">Single Room</option>
                <option value="one_bedroom">1 Bedroom Flat</option>
                <option value="shared_flat">Shared Flat</option>
                <option value="bedspace">Bedspace Share</option>
                <option value="studio">Private Studio</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-900 uppercase block mb-1">
                Name of Institution <span className="text-rose-500">*</span>
              </label>
              <select
                value={universityId}
                onChange={(e) => setUniversityId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-900 bg-neutral-50"
              >
                {Object.entries(
                  universities.reduce((acc, u) => {
                    const st = u.state || 'Other State';
                    if (!acc[st]) acc[st] = [];
                    acc[st].push(u);
                    return acc;
                  }, {} as Record<string, University[]>)
                ).map(([stateName, unis]) => (
                  <optgroup key={stateName} label={`📍 ${stateName}`}>
                    {(unis as University[]).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.city})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Annual Rent, 6. WALK Time, 7. Vacancies */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-neutral-900 uppercase block mb-1">
                Annual Rent (₦/yr) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                step={5000}
                value={pricePerYear}
                onChange={(e) => setPricePerYear(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-900 bg-neutral-50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-900 uppercase block mb-1">
                WALK Time to Gate <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  required
                  min={1}
                  max={60}
                  value={walkingDistanceMinutes}
                  onChange={(e) => setWalkingDistanceMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-900 bg-neutral-50"
                />
                <span className="text-[11px] text-neutral-500 font-bold shrink-0">mins</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-900 uppercase block mb-1">
                Vacancies / Rooms <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                max={500}
                value={vacanciesCount}
                onChange={(e) => setVacanciesCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-900 bg-neutral-50"
              />
            </div>
          </div>

          {/* 8. Street Address */}
          <div>
            <label className="text-xs font-bold text-neutral-900 uppercase block mb-1">
              Street Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 14 Akoka Commercial Avenue, Opposite UNILAG Main Gate"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-900 bg-neutral-50"
            />
          </div>

          {/* Facilities & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-neutral-900 uppercase block mb-1">Facilities / Services</label>
              <input
                type="text"
                value={facilitiesText}
                onChange={(e) => setFacilitiesText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-900 bg-neutral-50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-900 uppercase block mb-1">Description</label>
              <input
                type="text"
                placeholder="Describe hotel environment, safety & amenities..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-900 bg-neutral-50"
              />
            </div>
          </div>

          {/* 9. Five Photos (Mandatory) */}
          <div className="pt-3 border-t border-neutral-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-900 uppercase flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                Hotel Photos (Required Minimum: 5 Photos) <span className="text-rose-500">*</span>
              </label>
              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                photos.length >= 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {photos.length} / 5 Photos Uploaded
              </span>
            </div>

            <p className="text-[11px] text-neutral-500">
              Select high-resolution photos directly from your phone/computer storage showing room layout, bathroom, exterior, and reception.
            </p>

            {/* Device Storage Upload Button for Photos */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="file"
                id="device-photo-upload"
                accept="image/*"
                multiple
                onChange={handleDevicePhotoUpload}
                className="hidden"
              />
              <label
                htmlFor="device-photo-upload"
                className="cursor-pointer py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm shrink-0"
              >
                <Upload className="w-4 h-4 text-emerald-100" />
                <span>Upload Photos from Device Storage</span>
              </label>

              <div className="flex-1 flex gap-1.5">
                <input
                  type="url"
                  placeholder="Or paste image URL..."
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={handleAddPhoto}
                  className="px-3 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 pt-1">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-neutral-300 group">
                  <img src={p} alt="" className="w-full h-full object-cover" />
                  <span className="absolute top-1 left-1 bg-slate-900/80 text-white text-[9px] font-bold px-1 rounded">
                    #{i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute top-1 right-1 bg-rose-600 text-white w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center opacity-80 hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 5 - photos.length) }).map((_, idx) => (
                <div
                  key={idx}
                  className="aspect-video rounded-xl border-2 border-dashed border-rose-300 bg-rose-50/50 flex flex-col items-center justify-center text-center p-1 text-rose-500"
                >
                  <Camera className="w-4 h-4 mb-0.5 opacity-60" />
                  <span className="text-[9px] font-bold">Slot #{photos.length + idx + 1} Needed</span>
                </div>
              ))}
            </div>
          </div>

          {/* 10. 360-Degree Video Walkthrough (Mandatory) */}
          <div className="pt-3 border-t border-neutral-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-900 uppercase flex items-center gap-1.5">
                <Video className="w-4 h-4 text-purple-600" />
                360-Degree Video Walkthrough <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setVideoUrl(SAMPLE_360_VIDEO)}
                className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200"
              >
                + Use Sample 360° Walkthrough Video
              </button>
            </div>

            <p className="text-[11px] text-neutral-500">
              Upload a 360° video file directly from your local storage/camera gallery so students can inspect the property interior.
            </p>

            <div className="space-y-2">
              <input
                type="file"
                id="device-video-upload"
                accept="video/*"
                onChange={handleDeviceVideoUpload}
                className="hidden"
              />
              <label
                htmlFor="device-video-upload"
                className="cursor-pointer w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Upload className="w-4 h-4 text-purple-100" />
                <span>Upload 360° Video Walkthrough from Device Storage</span>
              </label>

              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span className="shrink-0 text-[10px] font-bold uppercase text-neutral-400">Or Paste Video Web Link:</span>
                <input
                  type="text"
                  placeholder="Paste 360° video MP4 link or embed URL..."
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    setValidationError(null);
                  }}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-900 bg-neutral-50"
                />
              </div>
            </div>

            {videoUrl && (
              <div className="bg-slate-900 rounded-2xl overflow-hidden aspect-video relative max-h-48 border border-neutral-800 flex items-center justify-center">
                <video src={videoUrl} controls autoPlay muted loop className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-md">
                  <Video className="w-3 h-3" />
                  360° Interactive Walkthrough Preview
                </span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || photos.length < 5 || !videoUrl.trim()}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md mt-6 flex items-center justify-center gap-2"
          >
            {submitting ? '⚡ AI Inspecting & Verifying Listing (Takes 2s)...' : 'Publish Hotel Accommodation Live'}
          </button>
        </form>
      </div>
    </div>
  );
};
