import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Upload, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  MapPin,
  Clock,
  ShieldCheck,
  DollarSign,
  Video,
  Loader2
} from 'lucide-react';
import { University, PropertyType, Listing } from '../types';
import { createListing } from '../services/api';
import { sendNotification } from '../services/notificationService';
import { auth } from '../services/firebase';
import { uploadOrCompressPropertyPhoto, uploadPropertyVideo } from '../utils/imageUpload';
import { uploadHostelListing, UploadHostelListingError } from '../utils/uploadHostelListing';

interface AddListingModalProps {
  universities: University[];
  onClose: () => void;
  onSuccess: (newListing: Listing) => void;
  agentId: string;
}

export const AddListingModal: React.FC<AddListingModalProps> = ({
  universities,
  onClose,
  onSuccess,
  agentId
}) => {
  // Wizard Step Control (1 to 9)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // STEP 1: Basic Information
  const [hostelName, setHostelName] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('self_contain');
  const [description, setDescription] = useState('');

  // STEP 2: Location
  const [area, setArea] = useState('');
  const [nearbyLandmark, setNearbyLandmark] = useState('');
  const [universityId, setUniversityId] = useState(universities[0]?.id || 'unilag');
  const [distanceKm, setDistanceKm] = useState(1.2);
  const [walkingMinutes, setWalkingMinutes] = useState(5);

  // STEP 3: Rooms
  const [roomType, setRoomType] = useState('Single Studio Room');
  const [availableRooms, setAvailableRooms] = useState(6);
  const [roomCapacity, setRoomCapacity] = useState('1 Student');

  // STEP 4: Pricing
  const [price, setPrice] = useState(350000);
  const [paymentPeriod, setPaymentPeriod] = useState<'year' | 'semester'>('year');

  // STEP 5: Amenities
  const [amenities, setAmenities] = useState<string[]>([
    '24/7 Solar Power', 'Borehole Water', 'Gated Security', 'Prepaid Meter', 'Free Wi-Fi'
  ]);
  const [amenityInput, setAmenityInput] = useState('');

  // STEP 6: Media (Photos & Video)
  // Photos are OPTIONAL (0 to 3 allowed).
  const [photos, setPhotos] = useState<(File | string)[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoUrlInput, setPhotoUrlInput] = useState('');

  // Video is COMPULSORY (exactly 1 required).
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [videoInput, setVideoInput] = useState<string>('');

  // STEP 7: Rules & Additional Information
  const [rules, setRules] = useState<string[]>([
    'Student ID Clearance Required', 'No Smoking Indoors', 'Quiet Hours After 10 PM'
  ]);
  const [ruleInput, setRuleInput] = useState('');

  // Submission State
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [submissionResult, setSubmissionResult] = useState<'approved' | 'pending' | 'needs_changes' | null>(null);

  const selectedUni = universities.find(u => u.id === universityId);

  // Amenity Handlers
  const handleAddAmenity = () => {
    if (!amenityInput.trim()) return;
    setAmenities(prev => [...prev, amenityInput.trim()]);
    setAmenityInput('');
  };
  const handleRemoveAmenity = (idx: number) => {
    setAmenities(prev => prev.filter((_, i) => i !== idx));
  };

  // Rule Handlers
  const handleAddRule = () => {
    if (!ruleInput.trim()) return;
    setRules(prev => [...prev, ruleInput.trim()]);
    setRuleInput('');
  };
  const handleRemoveRule = (idx: number) => {
    setRules(prev => prev.filter((_, i) => i !== idx));
  };

  // Photo Handlers (Optional 0-3 photos)
  const handleAddPhoto = () => {
    if (!photoUrlInput.trim()) return;
    if (photos.length >= 3) {
      setValidationError('Maximum 3 photos allowed. Photos are optional (up to 3).');
      return;
    }
    const cleanUrl = photoUrlInput.trim();
    setPhotos(prev => [...prev, cleanUrl].slice(0, 3));
    setPhotoPreviews(prev => [...prev, cleanUrl].slice(0, 3));
    setPhotoUrlInput('');
    setValidationError(null);
  };

  const handleDevicePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length >= 3) {
      setValidationError('Maximum 3 photos allowed. Photos are optional (up to 3).');
      e.target.value = '';
      return;
    }

    const remainingSlots = 3 - photos.length;
    const selectedFiles = Array.from(files).slice(0, remainingSlots);

    selectedFiles.forEach((file: File) => {
      setPhotos(prev => {
        if (prev.length >= 3) return prev;
        return [...prev, file];
      });
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreviews(prev => {
        if (prev.length >= 3) return prev;
        return [...prev, previewUrl];
      });
    });

    setValidationError(null);
    e.target.value = '';
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  // Video Handlers (Compulsory 1 Video)
  const handleDeviceVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setValidationError('Video file size is too large (Maximum 100MB allowed).');
      return;
    }

    setVideoFile(file);
    // Instant local object URL preview without Base64 memory overhead
    const objectUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objectUrl);
    setValidationError(null);
    e.target.value = '';
  };

  const handleAddVideoUrl = () => {
    if (!videoInput.trim()) return;
    setVideoFile(null);
    setVideoPreviewUrl(videoInput.trim());
    setVideoInput('');
    setValidationError(null);
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreviewUrl('');
    setVideoInput('');
  };

  // Step Validation logic before advancing
  const handleNextStep = () => {
    setValidationError(null);

    if (currentStep === 1) {
      if (!hostelName.trim()) {
        setValidationError('Please enter the hostel name.');
        return;
      }
    } else if (currentStep === 2) {
      if (!area.trim()) {
        setValidationError('Please enter the area / street location.');
        return;
      }
    } else if (currentStep === 3) {
      if (availableRooms <= 0) {
        setValidationError('Please specify the number of available rooms.');
        return;
      }
    } else if (currentStep === 4) {
      if (price <= 0) {
        setValidationError('Please enter a valid price.');
        return;
      }
    } else if (currentStep === 6) {
      const activeVideo = videoFile || videoPreviewUrl;
      if (!activeVideo || (typeof activeVideo === 'string' && !activeVideo.trim())) {
        setValidationError('Property video is compulsory. Please upload 1 real property video before proceeding.');
        return;
      }
    }

    setCurrentStep(prev => Math.min(9, prev + 1));
  };

  const handlePrevStep = () => {
    setValidationError(null);
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  // Final Submit Handler (Step 9)
  const handleSubmitListing = async () => {
    if (submitting) return; // Prevent duplicate submissions

    setSubmitting(true);
    setValidationError(null);
    setUploadProgress(0);
    setUploadStatusText('Preparing property media for submission...');

    const activeVideo = videoFile || videoPreviewUrl;
    if (!activeVideo || (typeof activeVideo === 'string' && !activeVideo.trim())) {
      setValidationError('Property Video is required (Video 0/1). Please upload 1 real property video before submitting.');
      setSubmitting(false);
      return;
    }

    try {
      const created = await uploadHostelListing({
        hostelName,
        universityId,
        universityName: selectedUni?.name || 'Campus',
        propertyType,
        pricePerYear: paymentPeriod === 'year' ? price : price * 2,
        pricePerMonth: Math.round((paymentPeriod === 'year' ? price : price * 2) / 12),
        pricePerWeek: Math.round((paymentPeriod === 'year' ? price : price * 2) / 52),
        deposit: Math.round(price * 0.1),
        walkingDistanceMinutes: walkingMinutes,
        walkingDistanceMeters: walkingMinutes * 80,
        vacanciesCount: availableRooms,
        address: `${area}, near ${nearbyLandmark || 'Campus Gate'}`,
        city: selectedUni?.city || 'Campus Town',
        state: selectedUni?.state || 'Lagos State',
        lat: (selectedUni?.lat || 6.5158) + (Math.random() - 0.5) * 0.005,
        lng: (selectedUni?.lng || 3.3898) + (Math.random() - 0.5) * 0.005,
        facilities: amenities,
        rules,
        description: description || `${hostelName} is located in ${area}, just ${walkingMinutes} minutes walk to ${selectedUni?.name || 'campus'}. Features ${availableRooms} available ${roomType} units with ${amenities.join(', ')}.`,
        agentId,
        agentName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Verified Agent',
        agentAgencyName: 'Verified Accommodation Management',
        agentAvatarUrl: auth.currentUser?.photoURL || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
        agentEmail: auth.currentUser?.email || '',
        videoSource: activeVideo,
        photos,
        onProgress: (progress) => {
          setUploadProgress(progress.progressPercent);
          setUploadStatusText(progress.message);
        }
      });

      setSubmitting(false);

      if (created.status === 'banned') {
        setSubmissionResult('needs_changes');
        setValidationError('Property listing flag: Duplicate details detected. Please review listing and resubmit.');
        return;
      }

      // Non-blocking asynchronous notification dispatch
      sendNotification({
        userId: agentId,
        title: 'Listing Submitted for Verification',
        body: `Your listing "${hostelName}" has been submitted and is currently Pending Admin Review.`,
        type: 'system'
      }).catch(() => {});

      setSubmissionResult('approved');
      onSuccess(created);

    } catch (err: any) {
      console.error('Submit Hostel Error:', err);
      setSubmitting(false);
      setValidationError(err?.message || 'Video upload or listing submission failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 relative my-auto max-h-[90vh] overflow-y-auto">
        
        {/* Header Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Wizard Progress Indicator */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 dark:text-neutral-400">
            <span className="text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
              <Building2 className="w-4 h-4" /> Add Hostel Workflow
            </span>
            <span>Step {currentStep} of 9</span>
          </div>

          <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-600 transition-all duration-300" 
              style={{ width: `${(currentStep / 9) * 100}%` }}
            />
          </div>
        </div>

        {validationError && (
          <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2 text-xs text-rose-800 dark:text-rose-300 font-bold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* ==========================================
            STEP 1: BASIC INFORMATION
           ========================================== */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
              STEP 1: Basic Information
            </h2>

            <div>
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                Hostel Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Peace Haven Hostel"
                value={hostelName}
                onChange={(e) => setHostelName(e.target.value)}
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                Property Type *
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="self_contain">Self-Contain Studio</option>
                <option value="single_room">Single Room</option>
                <option value="one_bedroom">1 Bedroom Flat</option>
                <option value="shared_flat">Shared Flat</option>
                <option value="bedspace">Bedspace Share</option>
                <option value="studio">Private Studio</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                Property Description
              </label>
              <textarea
                rows={3}
                placeholder="Describe hostel security, building features, environment..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 2: LOCATION
           ========================================== */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
              STEP 2: Location
            </h2>

            <div>
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                Serviced Institution / Campus *
              </label>
              <select
                value={universityId}
                onChange={(e) => setUniversityId(e.target.value)}
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {universities.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.city})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  Area / Street Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oke-Baale Area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  Nearby Landmark
                </label>
                <input
                  type="text"
                  placeholder="e.g. Opposite Main Campus Gate"
                  value={nearbyLandmark}
                  onChange={(e) => setNearbyLandmark(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  Distance from Campus (km)
                </label>
                <input
                  type="number"
                  step={0.1}
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  Walking Distance (Minutes)
                </label>
                <input
                  type="number"
                  value={walkingMinutes}
                  onChange={(e) => setWalkingMinutes(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 3: ROOMS
           ========================================== */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
              STEP 3: Rooms & Capacity
            </h2>

            <div>
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                Room Type Category *
              </label>
              <input
                type="text"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                placeholder="e.g. Self-Contain Studio Room"
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  Number of Available Rooms *
                </label>
                <input
                  type="number"
                  min={1}
                  value={availableRooms}
                  onChange={(e) => setAvailableRooms(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                  Room Capacity
                </label>
                <select
                  value={roomCapacity}
                  onChange={(e) => setRoomCapacity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="1 Student">1 Student (Single Occupancy)</option>
                  <option value="2 Students">2 Students (Double Share)</option>
                  <option value="4 Students">4 Students (Room Share)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 4: PRICING
           ========================================== */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
              STEP 4: Pricing & Rent
            </h2>

            <div>
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                Rental Amount (₦ NGN) *
              </label>
              <input
                type="number"
                step={5000}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                Payment Period *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentPeriod('year')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    paymentPeriod === 'year'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900'
                      : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  Per Year (Annual)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentPeriod('semester')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    paymentPeriod === 'semester'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900'
                      : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  Per Semester
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 5: AMENITIES
           ========================================== */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
              STEP 5: Amenities
            </h2>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add amenity (e.g. Solar Light, Water Tank)..."
                value={amenityInput}
                onChange={(e) => setAmenityInput(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <button
                type="button"
                onClick={handleAddAmenity}
                className="px-4 py-2.5 bg-neutral-900 hover:bg-black dark:bg-white dark:text-neutral-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                + Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {amenities.map((item, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                  <span>✓ {item}</span>
                  <button type="button" onClick={() => handleRemoveAmenity(idx)} className="text-emerald-600 hover:text-rose-600 font-bold ml-1">×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 6: MEDIA (PHOTOS & VIDEO)
           ========================================== */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                STEP 6: Property Media Verification
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Upload required property video and optional supplementary photos.
              </p>
            </div>

            {/* SECTION 1: COMPULSORY PROPERTY VIDEO */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-amber-400" />
                  Property Video — Required
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                  videoFile || videoPreviewUrl 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  {videoFile || videoPreviewUrl ? 'Video 1/1 ✓' : 'Video 0/1 — Required'}
                </span>
              </div>

              <p className="text-[11px] text-slate-300">
                The property video is the mandatory verification evidence. Every listing MUST have 1 real property video before it can be submitted for verification.
              </p>

              {videoPreviewUrl ? (
                <div className="space-y-2">
                  <div className="rounded-xl overflow-hidden bg-black aspect-video max-h-52 relative border border-slate-800">
                    <video src={videoPreviewUrl} controls className="w-full h-full object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 underline cursor-pointer"
                  >
                    Remove / Replace Property Video
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <label className="cursor-pointer px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shrink-0">
                    <Upload className="w-4 h-4" />
                    <span>Upload Video File</span>
                    <input type="file" accept="video/*" onChange={handleDeviceVideoUpload} className="hidden" />
                  </label>

                  <div className="flex-1 flex gap-2">
                    <input
                      type="url"
                      placeholder="Or paste property video URL (mp4, webm)..."
                      value={videoInput}
                      onChange={(e) => setVideoInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddVideoUrl}
                      className="px-3.5 py-2 bg-white text-slate-900 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-100 shrink-0"
                    >
                      Attach
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: OPTIONAL PHOTOS */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  Photos — Optional (up to 3)
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                  {photos.length === 0 ? '0/3 Photos — Optional' : `${photos.length}/3 Photos — Optional`}
                </span>
              </div>

              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Photos are supplementary evidence (0 to 3 photos allowed). You may submit with 0 photos if you have uploaded the required video.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <label className={`px-4 py-2 bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shrink-0 ${photos.length >= 3 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                  <input type="file" accept="image/*" multiple disabled={photos.length >= 3} onChange={handleDevicePhotoUpload} className="hidden" />
                </label>

                <div className="flex-1 flex gap-2">
                  <input
                    type="url"
                    placeholder="Or paste photo URL..."
                    value={photoUrlInput}
                    disabled={photos.length >= 3}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium"
                  />
                  <button type="button" disabled={photos.length >= 3} onClick={handleAddPhoto} className="px-3 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-white text-xs font-bold rounded-xl disabled:opacity-50 shrink-0">
                    Add
                  </button>
                </div>
              </div>

              {photoPreviews.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {photoPreviews.map((p, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 group">
                      <img src={p} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(i)}
                        className="absolute top-1 right-1 bg-rose-600 text-white w-5 h-5 rounded-md text-xs font-extrabold flex items-center justify-center cursor-pointer shadow-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-neutral-400 italic">0/3 Photos — Optional (No photos added yet).</p>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 7: RULES & ADDITIONAL INFO
           ========================================== */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
              STEP 7: Rules & Additional Information
            </h2>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add hostel rule (e.g. Student ID Clearance Required)..."
                value={ruleInput}
                onChange={(e) => setRuleInput(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white"
              />
              <button type="button" onClick={handleAddRule} className="px-4 py-2.5 bg-neutral-900 text-white text-xs font-bold rounded-xl">+ Add</button>
            </div>

            <div className="space-y-2 pt-2">
              {rules.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-xs font-medium">
                  <span>• {r}</span>
                  <button type="button" onClick={() => handleRemoveRule(idx)} className="text-rose-600 font-bold">Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 8: REVIEW LISTING
           ========================================== */}
        {currentStep === 8 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
              STEP 8: Review Listing
            </h2>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/80 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-2">
                <span className="font-extrabold text-neutral-900 dark:text-white text-sm">{hostelName}</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">₦{price.toLocaleString()} / {paymentPeriod}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-neutral-600 dark:text-neutral-300">
                <div><strong>Property Type:</strong> {propertyType.replace('_', ' ')}</div>
                <div><strong>Location:</strong> {area}, {selectedUni?.name}</div>
                <div><strong>Available Rooms:</strong> {availableRooms}</div>
                <div><strong>Walking Distance:</strong> {walkingMinutes} mins</div>
              </div>

              <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-amber-400 flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Property Video:</span>
                  <span className={videoFile || videoPreviewUrl ? 'text-emerald-400' : 'text-rose-400'}>{videoFile || videoPreviewUrl ? 'Video 1/1 ✓' : 'Video 0/1 — Required (Missing)'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300 flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Property Photos:</span>
                  <span className="text-slate-300">{photos.length}/3 Photos — Optional</span>
                </div>
              </div>

              <p className="text-[11px] text-neutral-500 border-t border-neutral-200 dark:border-neutral-700 pt-2">
                <strong>Amenities:</strong> {amenities.join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 9: SUBMIT & VERIFICATION RESULT
           ========================================== */}
        {currentStep === 9 && (
          <div className="space-y-4 text-center">
            {submissionResult === 'approved' ? (
              <div className="p-6 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-3xl space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-xl font-black text-amber-900 dark:text-amber-200">
                  Hostel Submitted for Verification!
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium max-w-md mx-auto">
                  Your hostel listing has been submitted and is currently <strong>Pending Admin Review</strong>. Once an administrator reviews and approves your submission, it will appear live for students on Student Discovery.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            ) : submitting ? (
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 text-white text-center shadow-lg">
                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
                <div>
                  <h3 className="text-base font-extrabold text-white">Submitting Property Listing</h3>
                  <p className="text-xs text-slate-300 mt-1 font-semibold">{uploadStatusText || 'Uploading media files...'}</p>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700 p-0.5">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                    style={{ width: `${Math.max(5, uploadProgress)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
                  <span>Direct Storage Upload</span>
                  <span className="font-bold text-emerald-400">{uploadProgress}%</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-2xl flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                  STEP 9: Final Submission
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                  Click below to submit your hostel for listing verification.
                </p>

                <button
                  type="button"
                  onClick={handleSubmitListing}
                  disabled={submitting}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  <span>Submit Hostel for Verification</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Wizard Controls Bottom Bar */}
        {submissionResult !== 'approved' && (
          <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 font-bold text-xs rounded-xl transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Previous
            </button>

            {currentStep < 9 && (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
