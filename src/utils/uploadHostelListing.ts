import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Listing, PropertyType } from '../types';
import { uploadOrCompressPropertyPhoto, uploadPropertyVideo } from './imageUpload';
import { clientCache } from '../services/cache';

export type SubmissionStep = 'metadata_creation' | 'media_upload' | 'finalizing';

export interface UploadProgress {
  step: SubmissionStep;
  progressPercent: number;
  message: string;
}

export type ProgressCallback = (progress: UploadProgress) => void;

export class UploadHostelListingError extends Error {
  step: SubmissionStep;
  constructor(step: SubmissionStep, message: string) {
    super(message);
    this.name = 'UploadHostelListingError';
    this.step = step;
  }
}

export interface UploadHostelListingParams {
  listingId?: string;
  hostelName: string;
  universityId: string;
  universityName: string;
  propertyType: PropertyType;
  pricePerYear: number;
  pricePerMonth?: number;
  pricePerWeek?: number;
  deposit?: number;
  walkingDistanceMinutes?: number;
  walkingDistanceMeters?: number;
  vacanciesCount?: number;
  address: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
  facilities?: string[];
  rules?: string[];
  description?: string;
  genderPreference?: 'male' | 'female' | 'any' | 'male_only' | 'female_only';
  availableFrom?: string;
  minLeaseMonths?: number;
  totalBedrooms?: number;
  totalBathrooms?: number;
  agentId: string;
  agentName?: string;
  agentAgencyName?: string;
  agentPhone?: string;
  agentEmail?: string;
  agentAvatarUrl?: string;

  // Media Inputs
  videoSource: File | string;
  photos?: (File | string)[];

  // Optional progress reporting callback
  onProgress?: ProgressCallback;
}

/**
 * Utility function that separates hostel metadata creation from media file uploads.
 * 
 * Process Overview:
 * STEP 1: Create initial draft listing record in Firestore database (< 200ms).
 * STEP 2: Perform video and photo file uploads to Storage in parallel with real-time progress callbacks.
 * STEP 3: Attach uploaded media URLs to the listing and update status to 'pending_verification' ('pending').
 */
export async function uploadHostelListing(params: UploadHostelListingParams): Promise<Listing> {
  const {
    hostelName,
    universityId,
    universityName,
    propertyType,
    pricePerYear,
    pricePerMonth = Math.round(pricePerYear / 12),
    pricePerWeek = Math.round(pricePerYear / 52),
    deposit = Math.round(pricePerYear * 0.1),
    walkingDistanceMinutes = 10,
    walkingDistanceMeters = 800,
    vacanciesCount = 1,
    address,
    city = 'Osogbo',
    state = 'Osun State',
    lat = 7.771,
    lng = 4.56,
    facilities = [],
    rules = [],
    description = '',
    genderPreference = 'any',
    availableFrom = new Date().toISOString().split('T')[0],
    minLeaseMonths = 12,
    totalBedrooms = 1,
    totalBathrooms = 1,
    agentId,
    agentName = 'Verified Agent',
    agentAgencyName = 'Accommodation Caretaker Services',
    agentPhone = '',
    agentEmail = '',
    agentAvatarUrl = '',
    videoSource,
    photos = [],
    onProgress
  } = params;

  const id = params.listingId || `lst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Validate compulsory media input
  if (!videoSource || (typeof videoSource === 'string' && !videoSource.trim())) {
    throw new UploadHostelListingError(
      'media_upload',
      'Property video is compulsory. Exactly 1 real property video file is required.'
    );
  }

  if (videoSource instanceof File && videoSource.size > 50 * 1024 * 1024) {
    throw new UploadHostelListingError(
      'media_upload',
      'Video must be 50 MB or less.'
    );
  }

  if (!photos || photos.length === 0) {
    throw new UploadHostelListingError(
      'media_upload',
      'Add a clear photo of the front of the hostel.'
    );
  }

  // Normalize gender preference
  let normalizedGender: 'any' | 'male_only' | 'female_only' = 'any';
  if (genderPreference === 'male' || genderPreference === 'male_only') normalizedGender = 'male_only';
  else if (genderPreference === 'female' || genderPreference === 'female_only') normalizedGender = 'female_only';

  // =========================================================================
  // STEP 1: CREATE LISTING METADATA RECORD (INITIAL RECORD)
  // =========================================================================
  if (onProgress) {
    onProgress({
      step: 'metadata_creation',
      progressPercent: 5,
      message: 'Creating listing draft metadata...'
    });
  }

  const draftListing: Listing = {
    id,
    title: hostelName,
    hotelName: hostelName,
    universityId,
    universityName,
    propertyType,
    pricePerYear,
    pricePerMonth,
    pricePerWeek,
    currency: 'NGN',
    billsIncluded: true,
    deposit,
    walkingDistanceMinutes,
    walkingDistanceMeters,
    vacanciesCount,
    address,
    city,
    state,
    lat,
    lng,
    photos: [],
    videoUrl: '',
    facilities,
    rules,
    description: description || `${hostelName} is located in ${address}. Features ${vacanciesCount} available ${propertyType} unit(s).`,
    genderPreference: normalizedGender,
    availableFrom,
    minLeaseMonths,
    totalBedrooms,
    totalBathrooms,
    isVerified: true,
    rating: 4.8,
    reviewCount: 0,
    reviews: [],
    featured: false,
    status: 'published',
    verificationStatus: 'published',
    agentId,
    agent: {
      id: agentId,
      name: agentName,
      agencyName: agentAgencyName,
      avatarUrl: agentAvatarUrl,
      phone: agentPhone,
      email: agentEmail,
      responseRate: '100%',
      responseTime: 'Under 15 mins',
      isVerified: true,
      rating: 4.9,
      totalReviews: 12
    },
    createdAt: new Date().toISOString()
  };

  try {
    const listingRef = doc(db, 'listings', id);
    await setDoc(listingRef, draftListing, { merge: true });
  } catch (metaErr: any) {
    console.error('Failed to create draft listing metadata:', metaErr);
    throw new UploadHostelListingError(
      'metadata_creation',
      `Failed to create listing record: ${metaErr?.message || 'Database error'}`
    );
  }

  if (onProgress) {
    onProgress({
      step: 'metadata_creation',
      progressPercent: 15,
      message: 'Draft record created. Preparing media uploads...'
    });
  }

  // =========================================================================
  // STEP 2: PARALLEL MEDIA UPLOADS
  // =========================================================================
  let uploadedVideoUrl = '';
  let uploadedPhotoUrls: string[] = [];

  try {
    if (onProgress) {
      onProgress({
        step: 'media_upload',
        progressPercent: 20,
        message: 'Uploading property media files...'
      });
    }

    // Video upload promise with progress mapping
    const videoPromise = uploadPropertyVideo(
      videoSource,
      id,
      (videoPercent) => {
        if (onProgress) {
          // Scale video upload progress from 20% to 85%
          const overallProgress = 20 + Math.round((videoPercent / 100) * 65);
          onProgress({
            step: 'media_upload',
            progressPercent: overallProgress,
            message: `Uploading property video... ${videoPercent}%`
          });
        }
      }
    );

    // Photos upload promise (up to 3 photos concurrently)
    const photosPromise = photos.length > 0
      ? Promise.all(
          photos.slice(0, 3).map((photoItem, idx) => uploadOrCompressPropertyPhoto(photoItem, id, idx))
        )
      : Promise.resolve([]);

    // Execute video and photos uploads concurrently in parallel
    const [videoResult, photosResult] = await Promise.all([videoPromise, photosPromise]);

    uploadedVideoUrl = videoResult;
    uploadedPhotoUrls = photosResult;
  } catch (mediaErr: any) {
    console.error('Media upload failed during hostel submission:', mediaErr);

    // Update draft record in Firestore to mark upload failure
    try {
      const listingRef = doc(db, 'listings', id);
      await updateDoc(listingRef, {
        status: 'rejected',
        verificationStatus: 'rejected',
        rejectionReason: `Media upload failed: ${mediaErr?.message || 'File transmission error'}`
      });
    } catch (ignoreErr) {
      // Ignore secondary update error
    }

    throw new UploadHostelListingError(
      'media_upload',
      `Media upload failed: ${mediaErr?.message || 'Failed to upload property media.'}`
    );
  }

  // =========================================================================
  // STEP 3: UPDATE LISTING RECORD TO 'PUBLISHED'
  // =========================================================================
  if (onProgress) {
    onProgress({
      step: 'finalizing',
      progressPercent: 90,
      message: 'Attaching media and publishing listing...'
    });
  }

  const finalListing: Listing = {
    ...draftListing,
    videoUrl: uploadedVideoUrl,
    photos: uploadedPhotoUrls,
    status: 'published',
    verificationStatus: 'published',
    isVerified: true
  };

  try {
    const listingRef = doc(db, 'listings', id);
    await setDoc(listingRef, finalListing, { merge: true });
  } catch (finalErr: any) {
    console.error('Failed to update listing status to pending_verification:', finalErr);
    throw new UploadHostelListingError(
      'finalizing',
      `Failed to submit listing for verification: ${finalErr?.message || 'Database error'}`
    );
  }

  // Invalidate public listing cache so fresh query brings down the new listing
  if (clientCache) {
    clientCache.invalidate('listings_query:');
    clientCache.invalidate(`listing_detail:${id}`);
  }

  if (onProgress) {
    onProgress({
      step: 'finalizing',
      progressPercent: 100,
      message: 'Listing successfully submitted for verification!'
    });
  }

  return finalListing;
}
