import { Listing, PropertyType } from '../types';
import {
  uploadOrCompressPropertyPhoto,
  uploadPropertyVideo,
  validatePropertyPhoto,
  validatePropertyVideo,
} from './imageUpload';

export type SubmissionStep =
  | 'validation'
  | 'metadata_creation'
  | 'media_upload'
  | 'media_reference_save'
  | 'finalizing';

export const STEP_LABELS: Record<SubmissionStep, string> = {
  validation: 'Checking your listing',
  metadata_creation: 'Creating the listing record',
  media_upload: 'Uploading photos and video',
  media_reference_save: 'Saving the uploaded media to your listing',
  finalizing: 'Submitting the listing for review',
};

export interface UploadProgress {
  step: SubmissionStep;
  progressPercent: number;
  message: string;
}

export type ProgressCallback = (progress: UploadProgress) => void;

export class UploadHostelListingError extends Error {
  step: SubmissionStep;
  technical?: string;
  constructor(step: SubmissionStep, message: string, technical?: string) {
    super(message);
    this.name = 'UploadHostelListingError';
    this.step = step;
    this.technical = technical;
  }
}

/** Statuses an agent is allowed to write. Only an administrator can approve/publish. */
const RESUMABLE_STATUSES = ['draft', 'uploading', 'upload_failed', 'incomplete'];

export interface UploadHostelListingParams {
  /** Stable id for the whole submission; reuse it on retry so no duplicate listing is created. */
  listingId: string;
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
  videoSource?: File | string;
  photos?: (File | string)[];
  onProgress?: ProgressCallback;
}

/** Side-effecting dependencies, injectable so every failure path can be tested. */
export interface UploadDeps {
  getCurrentUserId(): Promise<string | null>;
  getListing(id: string): Promise<Record<string, any> | null>;
  saveListing(id: string, data: Record<string, any>): Promise<void>;
  uploadPhoto(src: File | string, listingId: string, index: number, onBytes: (loaded: number, total: number) => void): Promise<string>;
  uploadVideo(src: File | string, listingId: string, onPercent: (p: number) => void): Promise<string>;
  afterSubmit(id: string): void;
}

async function defaultDeps(): Promise<UploadDeps> {
  const [{ supabase }, fs, { clientCache }] = await Promise.all([
    import('../services/supabase'),
    import('../firebase/firestore'),
    import('../services/cache'),
  ]);
  const ref = (id: string) => fs.doc(fs.db, 'listings', id);
  return {
    async getCurrentUserId() {
      const { data } = await supabase.auth.getSession();
      return data.session?.user?.id ?? null;
    },
    async getListing(id) {
      const snap = await fs.getDoc(ref(id));
      return snap.exists() ? (snap.data() as Record<string, any>) : null;
    },
    async saveListing(id, data) {
      await fs.setDoc(ref(id), data, { merge: true });
    },
    uploadPhoto: (src, listingId, index, onBytes) =>
      uploadOrCompressPropertyPhoto(src, listingId, index, { deterministic: true, onProgress: onBytes }),
    uploadVideo: (src, listingId, onPercent) =>
      uploadPropertyVideo(src, listingId, onPercent, { deterministic: true }),
    afterSubmit(id) {
      clientCache?.invalidate('listings_query:');
      clientCache?.invalidate(`listing_detail:${id}`);
    },
  };
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out after ${Math.round(ms / 1000)}s.`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

function friendly(err: any): { message: string; technical: string } {
  const raw = String(err?.message || err || 'Unknown error');
  const code = err?.code ? ` [${err.code}]` : '';
  const technical = `${raw}${code}`;
  if (/row-level security|violates .*policy/i.test(raw)) {
    return {
      message: 'The database refused this change (security policy). Make sure your agent account is verified and signed in, then retry.',
      technical,
    };
  }
  if (/jwt|not authenticated|sign in/i.test(raw)) {
    return { message: 'Your session expired. Sign in again, then retry.', technical };
  }
  return { message: raw, technical };
}

/**
 * Submits a hostel listing in explicit, verifiable stages:
 *   validate -> reserve listing id (draft) -> upload media -> save media references -> submit for review.
 *
 * Agents can never publish: the final status is `pending` (awaiting administrator approval) and
 * `isVerified` stays false. The listing only reaches students after an admin approves it.
 * Retrying with the same `listingId` resumes the same record and overwrites the same storage paths.
 */
export async function uploadHostelListing(
  params: UploadHostelListingParams,
  injected?: UploadDeps
): Promise<Listing> {
  const deps = injected ?? (await defaultDeps());
  const { listingId: id, onProgress } = params;
  const report = (step: SubmissionStep, progressPercent: number, message: string) =>
    onProgress?.({ step, progressPercent: Math.min(100, Math.max(0, Math.round(progressPercent))), message });
  const fail = (step: SubmissionStep, err: any): never => {
    const { message, technical } = friendly(err);
    // Technical detail only (no tokens / personal data) for debugging.
    console.error(`[uploadHostelListing] ${step} failed:`, technical);
    throw new UploadHostelListingError(step, message, technical);
  };

  // ---------------- 1. VALIDATE ----------------
  report('validation', 2, 'Checking your listing...');
  const photos = params.photos ?? [];
  try {
    if (!id) throw new Error('Missing listing id.');
    if (params.universityId !== 'uniosun') throw new Error('New listings are currently available only for UNIOSUN.');
    if (photos.length === 0) throw new Error('Add a clear photo of the front of the hostel.');
    if (photos.length > 3) throw new Error('Maximum 3 photos allowed.');
    photos.forEach((p) => {
      if (typeof p === 'string') {
        if (!/^https?:\/\//i.test(p.trim()) && !p.startsWith('data:image/')) throw new Error('A photo link is not a valid http(s) URL.');
      } else validatePropertyPhoto(p);
    });
    if (params.videoSource instanceof File) validatePropertyVideo(params.videoSource);
    else if (typeof params.videoSource === 'string' && params.videoSource && !/^https?:\/\//i.test(params.videoSource.trim())) {
      throw new Error('The video link must be a valid http(s) URL.');
    }
  } catch (err) {
    fail('validation', err);
  }

  let uid: string | null = null;
  try {
    uid = await withTimeout(deps.getCurrentUserId(), 15_000, 'Checking your session');
  } catch (err) {
    fail('validation', err);
  }
  if (!uid) fail('validation', new Error('You are signed out. Sign in again, then retry.'));
  if (uid !== params.agentId) fail('validation', new Error('Your signed-in account does not match this agent profile. Sign in again, then retry.'));

  let normalizedGender: 'any' | 'male_only' | 'female_only' = 'any';
  const g = params.genderPreference;
  if (g === 'male' || g === 'male_only') normalizedGender = 'male_only';
  else if (g === 'female' || g === 'female_only') normalizedGender = 'female_only';

  const pricePerYear = params.pricePerYear;
  const vacanciesCount = params.vacanciesCount ?? 1;
  const address = params.address;
  const propertyType = params.propertyType;
  const agentId = params.agentId;

  // ---------------- 2. RESERVE / RESUME LISTING RECORD ----------------
  report('metadata_creation', 6, 'Creating your listing record...');
  let existing: Record<string, any> | null = null;
  try {
    existing = await withTimeout(deps.getListing(id), 20_000, 'Reading the listing');
  } catch (err) {
    fail('metadata_creation', err);
  }
  if (existing) {
    const owner = existing.agentId || existing.userId || existing.ownerId;
    if (owner && owner !== agentId) fail('metadata_creation', new Error('This listing belongs to another account.'));
    const st = existing.status;
    if (st === 'pending' && Array.isArray(existing.photos) && existing.photos.length > 0) {
      // Already submitted successfully (e.g. a double click or a late retry): do not create anything new.
      report('finalizing', 100, 'This listing was already submitted for review.');
      return existing as Listing;
    }
    if (st && !RESUMABLE_STATUSES.includes(st) && st !== 'pending') {
      fail('metadata_creation', new Error(`This listing is already "${st}" and cannot be re-submitted from here.`));
    }
  }

  const base: Record<string, any> = {
    id,
    title: params.hostelName,
    hotelName: params.hostelName,
    universityId: params.universityId,
    universityName: params.universityName,
    propertyType,
    pricePerYear,
    pricePerMonth: params.pricePerMonth ?? Math.round(pricePerYear / 12),
    pricePerWeek: params.pricePerWeek ?? Math.round(pricePerYear / 52),
    currency: 'NGN',
    billsIncluded: true,
    deposit: params.deposit ?? Math.round(pricePerYear * 0.1),
    walkingDistanceMinutes: params.walkingDistanceMinutes ?? 10,
    walkingDistanceMeters: params.walkingDistanceMeters ?? 800,
    vacanciesCount,
    address,
    city: params.city ?? 'Osogbo',
    state: params.state ?? 'Osun State',
    lat: params.lat ?? 7.771,
    lng: params.lng ?? 4.56,
    facilities: params.facilities ?? [],
    rules: params.rules ?? [],
    description:
      params.description ||
      `${params.hostelName} is located in ${address}. Features ${vacanciesCount} available ${propertyType} unit(s).`,
    genderPreference: normalizedGender,
    availableFrom: params.availableFrom ?? new Date().toISOString().split('T')[0],
    minLeaseMonths: params.minLeaseMonths ?? 12,
    totalBedrooms: params.totalBedrooms ?? 1,
    totalBathrooms: params.totalBathrooms ?? 1,
    rating: 4.8,
    reviewCount: 0,
    reviews: [],
    featured: false,
    agentId,
    agent: {
      id: agentId,
      name: params.agentName ?? 'Verified Agent',
      agencyName: params.agentAgencyName ?? 'Accommodation Caretaker Services',
      avatarUrl: params.agentAvatarUrl ?? '',
      phone: params.agentPhone ?? '',
      email: params.agentEmail ?? '',
      responseRate: '100%',
      responseTime: 'Under 15 mins',
      isVerified: true,
      rating: 4.9,
      totalReviews: 12,
    },
  };

  try {
    await withTimeout(
      deps.saveListing(id, {
        ...base,
        photos: existing?.photos ?? [],
        videoUrl: existing?.videoUrl ?? '',
        // Reserved only: not visible to students, not in the admin review queue yet.
        status: 'draft',
        verificationStatus: 'draft',
        isVerified: false,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      }),
      20_000,
      'Creating the listing record'
    );
  } catch (err) {
    fail('metadata_creation', err);
  }
  report('metadata_creation', 15, 'Listing record reserved. Uploading media...');

  // ---------------- 3. UPLOAD MEDIA (real, byte-weighted progress) ----------------
  const sizeOf = (s: File | string | undefined) => (s instanceof File ? s.size : 1);
  const weights = photos.map((p) => Math.max(1, sizeOf(p)));
  const videoWeight = params.videoSource ? Math.max(1, sizeOf(params.videoSource)) : 0;
  const totalWeight = weights.reduce((a, b) => a + b, 0) + videoWeight;
  const done: number[] = new Array(photos.length + 1).fill(0); // fraction 0..1 per item
  const emitMedia = () => {
    const doneWeight = photos.reduce((a, _, i) => a + weights[i] * done[i], 0) + videoWeight * done[photos.length];
    report('media_upload', 15 + (doneWeight / totalWeight) * 70, 'Uploading photos and video...');
  };

  const photoTasks = photos.map((p, i) =>
    deps.uploadPhoto(p, id, i, (loaded, total) => {
      done[i] = total > 0 ? Math.min(1, loaded / total) : 0;
      emitMedia();
    }).then((url) => { done[i] = 1; emitMedia(); return url; })
  );
  const videoTask = params.videoSource
    ? deps.uploadVideo(params.videoSource, id, (pct) => { done[photos.length] = pct / 100; emitMedia(); })
        .then((url) => { done[photos.length] = 1; emitMedia(); return url; })
    : Promise.resolve('');

  const settled = await Promise.allSettled([...photoTasks, videoTask]);
  const firstFailure = settled.find((s) => s.status === 'rejected') as PromiseRejectedResult | undefined;
  if (firstFailure) {
    const { message, technical } = friendly(firstFailure.reason);
    try {
      await deps.saveListing(id, { status: 'upload_failed', verificationStatus: 'upload_failed', isVerified: false, uploadError: message.slice(0, 300) });
    } catch { /* the record stays a draft; retry resumes it */ }
    console.error('[uploadHostelListing] media_upload failed:', technical);
    throw new UploadHostelListingError('media_upload', message, technical);
  }
  const photoUrls = settled.slice(0, photos.length).map((s) => (s as PromiseFulfilledResult<string>).value);
  const videoUrl = (settled[photos.length] as PromiseFulfilledResult<string>).value;
  if (photoUrls.some((u) => !u || !/^https?:\/\//.test(u))) {
    fail('media_upload', new Error('A photo uploaded but no valid URL was returned.'));
  }

  // ---------------- 4. SAVE MEDIA REFERENCES (and verify they persisted) ----------------
  report('media_reference_save', 88, 'Saving uploaded media to your listing...');
  try {
    await withTimeout(
      deps.saveListing(id, { photos: photoUrls, videoUrl, status: 'draft', verificationStatus: 'draft', isVerified: false, uploadError: null }),
      20_000,
      'Saving media references'
    );
    const check = await withTimeout(deps.getListing(id), 20_000, 'Verifying saved media');
    if (!check || !Array.isArray(check.photos) || check.photos.length !== photoUrls.length) {
      throw new Error('The uploaded photos were not saved to the listing.');
    }
  } catch (err) {
    fail('media_reference_save', err);
  }

  // ---------------- 5. SUBMIT FOR REVIEW (agents can never self-publish) ----------------
  report('finalizing', 94, 'Submitting your listing for review...');
  try {
    await withTimeout(
      deps.saveListing(id, {
        status: 'pending',
        verificationStatus: 'pending',
        isVerified: false,
        submittedAt: new Date().toISOString(),
      }),
      20_000,
      'Submitting the listing'
    );
  } catch (err) {
    fail('finalizing', err);
  }

  let finalListing: Record<string, any> | null = null;
  try {
    finalListing = await withTimeout(deps.getListing(id), 20_000, 'Confirming the submission');
  } catch (err) {
    fail('finalizing', err);
  }
  if (!finalListing || finalListing.status !== 'pending') {
    fail('finalizing', new Error('The submission could not be confirmed. Retry to resume it.'));
  }

  deps.afterSubmit(id);
  report('finalizing', 100, 'Listing submitted for review.');
  return finalListing as Listing;
}
