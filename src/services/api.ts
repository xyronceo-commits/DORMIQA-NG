import { Listing, PropertyType, University, Inspection, Conversation, ChatMessage, Report, User, UserRole, AuthorizedAdmin, AdminRole } from '../types';
import { clientCache, CACHE_TTL } from './cache';
import { supabase } from './supabase';
import { normalizeListing } from '../utils/normalizeListing';
import { sendNotification } from './notificationService';

const API_BASE = '/api';

async function apiFetch(input: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Authorization')) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  return fetch(input, { ...options, headers });
}

export interface SafeParseResult<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  rawText?: string;
}

/**
 * Safely parses a Response object, verifying content-type header and JSON validity.
 * Returns a structured SafeParseResult object containing ok status, data or error message.
 */
export async function safeParseResponse<T = any>(res: Response): Promise<SafeParseResult<T>> {
  const contentType = res.headers.get('content-type') || '';
  let text = '';
  try {
    text = await res.text();
  } catch (err: any) {
    return {
      ok: false,
      status: res.status,
      error: `Failed to read response body: ${err.message || 'Stream read error'}`
    };
  }

  if (!text || text.trim() === '') {
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `Server returned HTTP ${res.status}: ${res.statusText || 'Empty response'}`
      };
    }
    return {
      ok: true,
      status: res.status,
      data: {} as T
    };
  }

  const isJsonLike = contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');

  if (!isJsonLike) {
    return {
      ok: false,
      status: res.status,
      rawText: text,
      error: res.ok
        ? 'Unexpected non-JSON response format from server.'
        : `Server error (${res.status}): ${text.slice(0, 150)}`
    };
  }

  try {
    const data = JSON.parse(text);
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: data.error || data.message || `Server returned error (${res.status})`
      };
    }
    return {
      ok: true,
      status: res.status,
      data: data as T
    };
  } catch (parseErr: any) {
    return {
      ok: false,
      status: res.status,
      rawText: text,
      error: `Invalid JSON response: ${parseErr.message}`
    };
  }
}

/**
 * Robust, safe JSON fetch wrapper using safeParseResponse with built-in fast timeout.
 */
export async function safeFetchJson<T = any>(url: string, options?: RequestInit, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await apiFetch(url, {
      ...options,
      signal: options?.signal || controller.signal
    });
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s. Please check your network connection.`);
    }
    throw new Error(`Network connection error: ${err.message || 'Unable to connect to server'}`);
  } finally {
    clearTimeout(timer);
  }

  const parsed = await safeParseResponse<T>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error || `Server request failed with status ${res.status}`);
  }
  return parsed.data as T;
}

export async function fetchUniversities(): Promise<University[]> {
  const cacheKey = 'universities_list';
  return clientCache.dedupe(cacheKey, async () => {
    try {
      const res = await fetch(`${API_BASE}/universities`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return clientCache.set(cacheKey, data as University[], CACHE_TTL.UNIVERSITIES);
        }
      }
    } catch (err) {
      console.warn('API /api/universities fetch failed, falling back to local list:', err);
    }

    try {
      const { UNIVERSITIES } = await import('../data/mockData');
      return clientCache.set(cacheKey, UNIVERSITIES, CACHE_TTL.UNIVERSITIES);
    } catch (err) {
      console.error('Failed to load local universities fallback:', err);
      return [];
    }
  });
}

export async function fetchListings(params: Record<string, any> = {}): Promise<Listing[]> {
  const query = new URLSearchParams();
  Object.keys(params).sort().forEach(key => {
    if (params[key] !== undefined && params[key] !== '' && params[key] !== null) {
      query.append(key, String(params[key]));
    }
  });
  const cacheKey = `listings_query:${query.toString()}`;

  return clientCache.dedupe(cacheKey, async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000); // 6s fast backend timeout

    try {
      const res = await apiFetch(`${API_BASE}/listings?${query.toString()}`, { signal: controller.signal });
      clearTimeout(timer);
      const parsed = await safeParseResponse<Listing[]>(res);
      if (parsed.ok && parsed.data && Array.isArray(parsed.data)) {
        const normalized = parsed.data.map(item => normalizeListing(item, item.id));
        return clientCache.set(cacheKey, normalized, CACHE_TTL.LISTINGS);
      }
      throw new Error(parsed.error || 'Failed to fetch listings from backend');
    } catch (err) {
      clearTimeout(timer);
      console.warn('API fetchListings failed/timed out, querying Firestore fallback:', err);
      try {
        const { collection, getDocs, query: fsQuery, limit } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        const listingsRef = collection(db, 'listings');
        const q = fsQuery(listingsRef, limit(100));
        const snap = await getDocs(q);
        const fsListings: Listing[] = [];
        snap.forEach(docSnap => {
          try {
            fsListings.push(normalizeListing(docSnap.data(), docSnap.id));
          } catch (e) {}
        });
        if (fsListings.length > 0) {
          return clientCache.set(cacheKey, fsListings, CACHE_TTL.LISTINGS);
        }
      } catch (fsErr) {
        console.warn('Firestore fallback fetch failed:', fsErr);
      }
      return clientCache.set(cacheKey, [], CACHE_TTL.LISTINGS);
    }
  });
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  if (!id || !id.trim()) return null;
  const cleanId = id.trim();
  const cacheKey = `listing_detail:${cleanId}`;

  return clientCache.dedupe(cacheKey, async () => {
    // 1. Retrieve the matching record from existing Supabase app_documents table
    // using both the correct listing collection ('listings') and listing ID
    try {
      const { data: docRow, error: sbError } = await supabase
        .from('app_documents')
        .select('id, data')
        .eq('collection', 'listings')
        .eq('id', cleanId)
        .maybeSingle();

      if (!sbError && docRow && docRow.data) {
        const item = normalizeListing(docRow.data, docRow.id || cleanId);
        return clientCache.set(cacheKey, item, CACHE_TTL.LISTING_DETAIL);
      }
    } catch (sbErr) {
      console.warn('Direct Supabase app_documents query note:', sbErr);
    }

    // 2. Query Backend API with fast 5s timeout
    let apiFailed = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await apiFetch(`${API_BASE}/listings/${encodeURIComponent(cleanId)}`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.status === 403) {
        const errorData = await res.json().catch(() => ({}));
        const unavailableErr: any = new Error(errorData.message || 'This property listing is currently pending verification, removed, or unavailable.');
        unavailableErr.isUnavailable = true;
        throw unavailableErr;
      }
      const parsed = await safeParseResponse<Listing>(res);
      if (parsed.ok && parsed.data) {
        return clientCache.set(cacheKey, parsed.data, CACHE_TTL.LISTING_DETAIL);
      }
      if (res.status === 404) {
        apiFailed = true;
      }
    } catch (err: any) {
      clearTimeout(timer);
      if (err.isUnavailable) throw err;
      apiFailed = true;
    }

    // 3. Authoritative fallback: Query Firestore adapter
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      const docRef = doc(db, 'listings', cleanId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const item = normalizeListing(snap.data(), snap.id);
        return clientCache.set(cacheKey, item, CACHE_TTL.LISTING_DETAIL);
      }
      return null; // Genuinely not found
    } catch (firestoreErr: any) {
      if (firestoreErr.isUnavailable) throw firestoreErr;
      if (apiFailed) {
        throw new Error("Unable to connect to property database. Please check your network connection.");
      }
      return null;
    }
  });
}

export async function createListing(listingData: Partial<Listing>): Promise<Listing> {
  if (!listingData.videoUrl || !listingData.videoUrl.trim()) {
    throw new Error('Property video is compulsory. Exactly 1 real property video is required before a listing can be submitted for verification.');
  }

  const cleanPhotos = Array.isArray(listingData.photos) ? listingData.photos.slice(0, 3) : [];
  const cleanVideoUrl = listingData.videoUrl.trim();

  let created: Listing | null = null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await apiFetch(`${API_BASE}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        ...listingData,
        photos: cleanPhotos,
        videoUrl: cleanVideoUrl
      })
    });
    clearTimeout(timer);
    const parsed = await safeParseResponse<Listing>(res);
    if (parsed.ok && parsed.data) {
      created = parsed.data;
    }
  } catch (err) {
    clearTimeout(timer);
    console.warn('Backend createListing failed/timed out, saving directly to Firestore:', err);
  }

  if (!created) {
    const id = listingData.id || `lst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    created = {
      id,
      title: listingData.title || listingData.hotelName || 'New Hostel Listing',
      hotelName: listingData.hotelName || listingData.title || 'New Hostel',
      universityId: listingData.universityId || 'uniosun',
      universityName: listingData.universityName || 'UNIOSUN',
      propertyType: listingData.propertyType || 'self_contain',
      pricePerYear: listingData.pricePerYear || 350000,
      pricePerMonth: listingData.pricePerMonth || Math.round((listingData.pricePerYear || 350000) / 12),
      pricePerWeek: listingData.pricePerWeek || Math.round((listingData.pricePerYear || 350000) / 52),
      currency: 'NGN',
      billsIncluded: listingData.billsIncluded ?? true,
      deposit: listingData.deposit || 35000,
      walkingDistanceMinutes: listingData.walkingDistanceMinutes || 10,
      walkingDistanceMeters: listingData.walkingDistanceMeters || 800,
      vacanciesCount: listingData.vacanciesCount || 1,
      address: listingData.address || 'Main Campus Area',
      city: listingData.city || 'Osogbo',
      state: listingData.state || 'Osun State',
      lat: listingData.lat || 7.771,
      lng: listingData.lng || 4.56,
      photos: cleanPhotos,
      videoUrl: cleanVideoUrl,
      facilities: listingData.facilities || [],
      rules: listingData.rules || [],
      description: listingData.description || '',
      genderPreference: listingData.genderPreference || 'any',
      availableFrom: listingData.availableFrom || new Date().toISOString().split('T')[0],
      minLeaseMonths: listingData.minLeaseMonths || 12,
      totalBedrooms: listingData.totalBedrooms || 1,
      totalBathrooms: listingData.totalBathrooms || 1,
      isVerified: false,
      rating: 4.8,
      reviewCount: 0,
      reviews: [],
      featured: false,
      status: 'pending',
      verificationStatus: 'pending',
      agentId: listingData.agentId || 'agent_default',
      agent: listingData.agent || {
        id: listingData.agentId || 'agent_default',
        name: 'Verified Agent',
        agencyName: 'Accommodation Caretaker Services',
        avatarUrl: '',
        phone: '',
        email: '',
        responseRate: '100%',
        responseTime: 'Under 15 mins',
        isVerified: true,
        rating: 4.9,
        totalReviews: 12
      },
      createdAt: new Date().toISOString()
    };
  }

  created = normalizeListing(created, created.id);

  // Authoritative Write to Firestore
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    await setDoc(doc(db, 'listings', created.id), created, { merge: true });
  } catch (fsErr) {
    console.error('Failed to write created listing to Firestore:', fsErr);
  }

  // Invalidate public listing caches
  clientCache.invalidate('listings_query:');
  clientCache.invalidate(`listing_detail:${created.id}`);

  return created;
}

export interface UpdateListingPayload {
  title?: string;
  hotelName?: string;
  address?: string;
  description?: string;
  photos?: string[];
  videoUrl?: string;
  propertyType?: PropertyType;
  facilities?: string[];
  rules?: string[];
  walkingDistanceMinutes?: number;
  walkingDistanceMeters?: number;
  genderPreference?: 'any' | 'female_only' | 'male_only';
  totalBedrooms?: number;
  totalBathrooms?: number;
  billsIncluded?: boolean;
  resubmitForVerification?: boolean;
  unitStatus?: 'vacant' | 'occupied' | 'remaining' | 'under_renovation';
  vacanciesCount?: number;
  unitStatusNote?: string;
  pricePerYear?: number;
  pricePerMonth?: number;
  pricePerWeek?: number;
  deposit?: number;
  agencyFeeNote?: string;
  promoDiscount?: string;
  salesNote?: string;
  isAvailableForSale?: boolean;
}

export async function updateListingStatusAndSales(
  listingId: string, 
  updateData: UpdateListingPayload
): Promise<Listing> {
  let updated: Listing | null = null;
  try {
    const res = await apiFetch(`${API_BASE}/listings/${encodeURIComponent(listingId)}/status-and-sales`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    const parsed = await safeParseResponse<Listing>(res);
    if (parsed.ok && parsed.data) {
      updated = parsed.data;
    }
  } catch (err) {
    console.warn('Backend updateListingStatusAndSales failed:', err);
  }

  // Direct Firestore Update
  try {
    const { doc, updateDoc, getDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const docRef = doc(db, 'listings', listingId);
    
    const fsUpdatePayload: any = { ...updateData };
    if (updateData.resubmitForVerification) {
      fsUpdatePayload.status = 'pending';
      fsUpdatePayload.verificationStatus = 'pending';
      fsUpdatePayload.rejectionReason = null;
      delete fsUpdatePayload.resubmitForVerification;
    }

    await updateDoc(docRef, fsUpdatePayload);
    if (!updated) {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        updated = { id: snap.id, ...snap.data() } as Listing;
      }
    }
  } catch (fsErr) {
    console.error('Failed to update listing in Firestore:', fsErr);
  }

  // Direct Supabase app_documents sync
  if (updated) {
    try {
      await supabase
        .from('app_documents')
        .upsert({
          collection: 'listings',
          id: listingId,
          data: updated,
          updated_at: new Date().toISOString()
        });
    } catch (sbErr) {
      console.warn('Supabase app_documents sync note:', sbErr);
    }
  }

  if (!updated) {
    throw new Error('Failed to persist listing updates to database');
  }

  // Invalidate public listing caches
  clientCache.invalidate('listings_query:');
  clientCache.invalidate(`listing_detail:${listingId}`);

  return updated;
}

// Alias for general hostel editing
export const updateListing = updateListingStatusAndSales;

export async function deleteListing(listingId: string): Promise<boolean> {
  const cleanId = listingId.trim();
  let serverSuccess = false;

  try {
    const res = await apiFetch(`${API_BASE}/listings/${encodeURIComponent(cleanId)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      serverSuccess = true;
    }
  } catch (err) {
    console.warn('Backend DELETE /api/listings/:id failed, using Firestore fallback:', err);
  }

  // Also ensure removal in Firestore
  try {
    const { doc, deleteDoc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const docRef = doc(db, 'listings', cleanId);
    try {
      await deleteDoc(docRef);
    } catch {
      await updateDoc(docRef, { status: 'removed', verificationStatus: 'removed' });
    }
    serverSuccess = true;
  } catch (fsErr) {
    console.warn('Firestore direct delete failed:', fsErr);
  }

  // Invalidate public listing caches
  clientCache.invalidate('listings_query:');
  clientCache.invalidate(`listing_detail:${cleanId}`);

  return serverSuccess;
}

export async function submitListingReview(
  listingId: string, 
  reviewData: { authorName: string; authorAvatar?: string; rating: number; comment: string; universityCourse?: string; tag?: string }
): Promise<Listing> {
  let updated: Listing | null = null;
  try {
    const res = await apiFetch(`${API_BASE}/listings/${listingId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData)
    });
    const parsed = await safeParseResponse<Listing>(res);
    if (parsed.ok && parsed.data) {
      updated = parsed.data;
    }
  } catch (err) {
    console.warn('Backend submitListingReview failed:', err);
  }

  // Update Firestore listing reviews array
  try {
    const { doc, getDoc, updateDoc, arrayUnion } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const docRef = doc(db, 'listings', listingId);
    const newReview = {
      id: `rev_${Date.now()}`,
      authorName: reviewData.authorName,
      authorAvatar: reviewData.authorAvatar || '',
      rating: reviewData.rating,
      comment: reviewData.comment,
      createdAt: new Date().toISOString().split('T')[0],
      universityCourse: reviewData.universityCourse || 'Verified Student',
      tag: reviewData.tag || 'Verified Resident'
    };
    await updateDoc(docRef, {
      reviews: arrayUnion(newReview)
    });
    if (!updated) {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        updated = { id: snap.id, ...snap.data() } as Listing;
      }
    }
  } catch (fsErr) {
    console.error('Failed to update review in Firestore:', fsErr);
  }

  if (!updated) {
    throw new Error('Failed to save property review to database');
  }

  clientCache.invalidate('listings_query:');
  clientCache.invalidate(`listing_detail:${listingId}`);

  return updated;
}

export async function bookInspection(data: Partial<Inspection>): Promise<Inspection> {
  let created: Inspection | null = null;
  try {
    const res = await apiFetch(`${API_BASE}/inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const parsed = await safeParseResponse<Inspection>(res);
    if (parsed.ok && parsed.data) {
      created = parsed.data;
    }
  } catch (err) {
    console.warn('Backend bookInspection failed:', err);
  }

  const inspectionId = created?.id || data.id || `insp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inspectionRecord: Inspection = created || {
    id: inspectionId,
    listingId: data.listingId || '',
    listingTitle: data.listingTitle || 'Hostel Inspection',
    listingAddress: data.listingAddress || 'Main Campus Area',
    listingPhoto: data.listingPhoto || '',
    studentId: data.studentId || '',
    studentName: data.studentName || 'Student',
    studentEmail: data.studentEmail || '',
    studentPhone: data.studentPhone || '',
    agentId: data.agentId || '',
    agentName: data.agentName || 'Caretaker',
    date: data.date || new Date().toISOString().split('T')[0],
    timeSlot: data.timeSlot || '12:00 PM',
    type: data.type || 'in_person',
    notes: data.notes || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  // Authoritative Write to Firestore
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    await setDoc(doc(db, 'inspections', inspectionRecord.id), inspectionRecord, { merge: true });
  } catch (fsErr) {
    console.error('Failed to write inspection to Firestore:', fsErr);
  }

  // Notify agent immediately of new inspection booking
  if (inspectionRecord.agentId) {
    sendNotification({
      userId: inspectionRecord.agentId,
      title: `New Inspection: ${inspectionRecord.listingTitle}`,
      body: `${inspectionRecord.studentName} booked an inspection for ${inspectionRecord.date} at ${inspectionRecord.timeSlot}.`,
      type: 'inspection',
      metadata: {
        inspectionId: inspectionRecord.id,
        listingId: inspectionRecord.listingId
      }
    }).catch(() => {});
  }

  return inspectionRecord;
}

export async function fetchInspections(query: { studentId?: string; agentId?: string } = {}): Promise<Inspection[]> {
  try {
    const searchObj: Record<string, string> = {};
    if (query.studentId) searchObj.studentId = query.studentId;
    if (query.agentId) searchObj.agentId = query.agentId;
    const params = new URLSearchParams(searchObj);
    const res = await apiFetch(`${API_BASE}/inspections?${params.toString()}`);
    const parsed = await safeParseResponse<Inspection[]>(res);
    if (parsed.ok && parsed.data && Array.isArray(parsed.data)) {
      return parsed.data;
    }
  } catch (err) {
    console.warn('API fetchInspections failed, querying Firestore fallback:', err);
  }

  // Firestore Fallback
  try {
    const { collection, getDocs, query: fsQuery, where } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const inspectionsRef = collection(db, 'inspections');
    let q;
    if (query.studentId) {
      q = fsQuery(inspectionsRef, where('studentId', '==', query.studentId));
    } else if (query.agentId) {
      q = fsQuery(inspectionsRef, where('agentId', '==', query.agentId));
    } else {
      q = fsQuery(inspectionsRef);
    }
    const snap = await getDocs(q);
    const fsInspections: Inspection[] = [];
    snap.forEach(docSnap => {
      fsInspections.push({ id: docSnap.id, ...(docSnap.data() as Record<string, any>) } as Inspection);
    });
    if (fsInspections.length > 0) {
      return fsInspections;
    }
  } catch (fsErr) {
    console.warn('Firestore fetchInspections error:', fsErr);
  }

  const { MOCK_INSPECTIONS } = await import('../data/mockData');
  return MOCK_INSPECTIONS;
}

export async function updateInspectionStatus(id: string, status: string): Promise<Inspection> {
  let updated: Inspection | null = null;
  try {
    const res = await apiFetch(`${API_BASE}/inspections/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const parsed = await safeParseResponse<Inspection>(res);
    if (parsed.ok && parsed.data) {
      updated = parsed.data;
    }
  } catch (err) {
    console.warn('Backend updateInspectionStatus failed:', err);
  }

  // Direct Firestore Update
  try {
    const { doc, updateDoc, getDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const docRef = doc(db, 'inspections', id);
    await updateDoc(docRef, { status });
    if (!updated) {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        updated = { id: snap.id, ...snap.data() } as Inspection;
      }
    }
  } catch (fsErr) {
    console.error('Failed to update inspection status in Firestore:', fsErr);
  }

  if (!updated) {
    throw new Error('Failed to update inspection status in database');
  }

  // Notify student of status update (e.g. confirmed or rescheduled)
  if (updated.studentId) {
    sendNotification({
      userId: updated.studentId,
      title: `Inspection ${status === 'confirmed' ? 'Confirmed' : status.toUpperCase()}: ${updated.listingTitle}`,
      body: `Your inspection for ${updated.listingTitle} on ${updated.date} at ${updated.timeSlot} was marked as ${status}.`,
      type: 'inspection',
      metadata: {
        inspectionId: updated.id,
        status
      }
    }).catch(() => {});
  }

  return updated;
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  try {
    const res = await apiFetch(`${API_BASE}/conversations?userId=${userId}`);
    const parsed = await safeParseResponse<Conversation[]>(res);
    if (parsed.ok && parsed.data && Array.isArray(parsed.data)) {
      return parsed.data;
    }
  } catch (err) {
    console.warn('API fetchConversations failed, querying Firestore fallback:', err);
  }

  try {
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const convRef = collection(db, 'conversations');
    const snap = await getDocs(query(convRef, where('studentId', '==', userId)));
    const fsConvs: Conversation[] = [];
    snap.forEach(docSnap => {
      fsConvs.push({ id: docSnap.id, ...(docSnap.data() as Record<string, any>) } as Conversation);
    });
    if (fsConvs.length > 0) return fsConvs;
  } catch (fsErr) {
    console.warn('Firestore fetchConversations error:', fsErr);
  }

  const { MOCK_CONVERSATIONS } = await import('../data/mockData');
  return MOCK_CONVERSATIONS;
}

export async function startConversation(data: { 
  studentId?: string; 
  studentName?: string;
  studentAvatar?: string;
  agentId?: string; 
  listingId: string;
}): Promise<Conversation> {
  let conv: Conversation | null = null;
  try {
    const res = await apiFetch(`${API_BASE}/conversations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const parsed = await safeParseResponse<Conversation>(res);
    if (parsed.ok && parsed.data) {
      conv = parsed.data;
    }
  } catch (err) {
    console.warn('Backend startConversation failed:', err);
  }

  const convId = conv?.id || `conv_${data.studentId}_${data.agentId}_${data.listingId}`;
  const conversationRecord: Conversation = conv || {
    id: convId,
    studentId: data.studentId || '',
    studentName: data.studentName || 'Student',
    studentAvatar: data.studentAvatar || '',
    agentId: data.agentId || '',
    agentName: 'Caretaker',
    agentAvatar: '',
    agencyName: 'Accommodation Services',
    listingId: data.listingId,
    listingTitle: 'Hostel Accommodation',
    listingPhoto: '',
    listingPrice: 350000,
    lastMessage: 'Conversation started',
    lastMessageTime: 'Just now',
    unreadCount: 0
  };

  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    await setDoc(doc(db, 'conversations', conversationRecord.id), conversationRecord, { merge: true });
  } catch (fsErr) {
    console.error('Failed to save conversation to Firestore:', fsErr);
  }

  // Notify agent immediately of student inquiry
  if (conversationRecord.agentId) {
    sendNotification({
      userId: conversationRecord.agentId,
      title: `New Inquiry: ${conversationRecord.listingTitle}`,
      body: `${conversationRecord.studentName} started an inquiry about ${conversationRecord.listingTitle}.`,
      type: 'message',
      metadata: {
        conversationId: conversationRecord.id,
        listingId: conversationRecord.listingId,
        senderName: conversationRecord.studentName
      }
    }).catch(() => {});
  }

  return conversationRecord;
}

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    const res = await apiFetch(`${API_BASE}/conversations/${conversationId}/messages`);
    const parsed = await safeParseResponse<ChatMessage[]>(res);
    if (parsed.ok && parsed.data && Array.isArray(parsed.data)) {
      return parsed.data;
    }
  } catch (err) {
    console.warn('API fetchMessages failed, querying Firestore fallback:', err);
  }

  try {
    const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const msgsRef = collection(db, 'conversations', conversationId, 'messages');
    const snap = await getDocs(query(msgsRef, orderBy('createdAt', 'asc')));
    const fsMsgs: ChatMessage[] = [];
    snap.forEach(docSnap => {
      fsMsgs.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage);
    });
    if (fsMsgs.length > 0) return fsMsgs;
  } catch (fsErr) {
    console.warn('Firestore fetchMessages error:', fsErr);
  }

  const { MOCK_CHAT_MESSAGES } = await import('../data/mockData');
  return MOCK_CHAT_MESSAGES.filter(m => m.conversationId === conversationId);
}

export async function sendMessage(conversationId: string, data: { senderId: string; senderName: string; senderRole: string; recipientId: string; text: string }): Promise<ChatMessage> {
  let created: ChatMessage | null = null;
  try {
    const res = await apiFetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const parsed = await safeParseResponse<ChatMessage>(res);
    if (parsed.ok && parsed.data) {
      created = parsed.data;
    }
  } catch (err) {
    console.warn('Backend sendMessage failed:', err);
  }

  const msgId = created?.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const messageRecord: ChatMessage = created || {
    id: msgId,
    conversationId,
    senderId: data.senderId,
    senderName: data.senderName,
    senderRole: (data.senderRole as UserRole) || 'student',
    recipientId: data.recipientId,
    text: data.text,
    createdAt: new Date().toISOString()
  };

  try {
    const { doc, setDoc, updateDoc, increment } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    await setDoc(doc(db, 'conversations', conversationId, 'messages', messageRecord.id), messageRecord, { merge: true });
    const updatePayload: any = {
      lastMessage: data.text,
      lastMessageTime: 'Just now',
      unreadCount: increment(1)
    };
    if (data.senderRole === 'student') {
      updatePayload.agentUnreadCount = increment(1);
    } else {
      updatePayload.studentUnreadCount = increment(1);
    }
    await updateDoc(doc(db, 'conversations', conversationId), updatePayload);
  } catch (fsErr) {
    console.error('Failed to save message to Firestore:', fsErr);
  }

  // Real-time notification for the recipient (agent or student)
  if (data.recipientId) {
    sendNotification({
      userId: data.recipientId,
      title: `New message from ${data.senderName}`,
      body: data.text.length > 80 ? data.text.substring(0, 77) + '...' : data.text,
      type: 'message',
      metadata: {
        conversationId,
        senderName: data.senderName
      }
    }).catch(() => {});
  }

  return messageRecord;
}

export async function submitReport(data: Partial<Report>): Promise<Report> {
  let created: Report | null = null;
  try {
    const res = await apiFetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const parsed = await safeParseResponse<Report>(res);
    if (parsed.ok && parsed.data) {
      created = parsed.data;
    }
  } catch (err) {
    console.warn('Backend submitReport failed:', err);
  }

  const reportId = created?.id || data.id || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const reportRecord: Report = created || {
    id: reportId,
    listingId: data.listingId || '',
    listingTitle: data.listingTitle || 'Hostel Listing',
    reporterId: data.reporterId || 'anonymous',
    reporterName: data.reporterName || 'Anonymous Student',
    reason: (data.reason as Report['reason']) || 'other',
    details: data.details || '',
    status: 'open',
    createdAt: new Date().toISOString()
  };

  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    await setDoc(doc(db, 'reports', reportRecord.id), reportRecord, { merge: true });
  } catch (fsErr) {
    console.error('Failed to write report to Firestore:', fsErr);
  }

  return reportRecord;
}

async function getAdminAuthHeaders(explicitToken?: string): Promise<Record<string, string>> {
  try {
    const token = explicitToken || (await supabase.auth.getSession()).data?.session?.access_token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

export async function requestAdminOtp(email: string): Promise<{ success: boolean; message: string; cooldownSeconds?: number; retryAfterSeconds?: number }> {
  const cleanEmail = email.trim().toLowerCase();
  
  try {
    const res = await apiFetch(`${API_BASE}/admin/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || data.error || (res.status === 403 ? 'Admin access is restricted to verified administrators.' : `Authentication provider error (HTTP ${res.status}).`);
      throw new Error(msg);
    }

    return {
      success: true,
      message: data.message || `A verification code was sent to ${cleanEmail}. Check your inbox.`,
      cooldownSeconds: data.cooldownSeconds || 60,
      retryAfterSeconds: data.retryAfterSeconds,
    };
  } catch (apiErr: any) {
    // If backend endpoint is unreachable or network error, fallback to direct Supabase client call
    const isNetworkError = apiErr?.message?.includes('Failed to fetch') || 
                           apiErr?.message?.includes('NetworkError') ||
                           apiErr?.message?.includes('HTTP 404');
                           
    if (isNetworkError) {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        const rawMsg = error.message || 'Failed to dispatch verification code.';
        if (rawMsg.toLowerCase().includes('signups not allowed') || (error as any).status === 422) {
          throw new Error('Admin access is restricted to verified administrators.');
        }
        throw new Error(rawMsg);
      }

      return {
        success: true,
        message: `A verification code was sent to ${cleanEmail}. Check your inbox.`,
        cooldownSeconds: 60,
      };
    }
    throw apiErr;
  }
}

export async function startAdminSession(explicitToken?: string): Promise<{ success: boolean; sessionId?: string; expiresAt?: number; remainingMs?: number }> {
  const headers = await getAdminAuthHeaders(explicitToken);
  const res = await apiFetch(`${API_BASE}/admin/auth/start-session`, {
    method: 'POST',
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to initialize administrative session.');
  }
  return data;
}

export async function checkAdminSession(explicitToken?: string): Promise<{
  authenticated: boolean;
  expired?: boolean;
  email?: string;
  role?: AdminRole;
  userId?: string;
  createdAt?: number;
  expiresAt?: number;
  remainingMs?: number;
  message?: string;
}> {
  try {
    const authHeaders = await getAdminAuthHeaders(explicitToken);
    const res = await apiFetch(`${API_BASE}/admin/check-session`, {
      headers: authHeaders
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401 && data.expired) {
      return {
        authenticated: false,
        expired: true,
        message: data.message || 'Your admin session has expired. Sign in again to continue.'
      };
    }

    if (!res.ok) {
      return { authenticated: false, message: data.message };
    }

    return {
      authenticated: Boolean(data.authenticated),
      email: data.email,
      role: data.role || 'ADMIN',
      userId: data.userId,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      remainingMs: data.remainingMs,
    };
  } catch (err: any) {
    console.warn('[ADMIN API] checkAdminSession error:', err);
    return { authenticated: false };
  }
}

export async function logoutAdminSession(): Promise<boolean> {
  try {
    const headers = await getAdminAuthHeaders();
    await apiFetch(`${API_BASE}/admin/logout`, {
      method: 'POST',
      headers
    }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export async function fetchAdminStats() {
  try {
    const headers = await getAdminAuthHeaders();
    return await safeFetchJson(`${API_BASE}/admin/stats`, {
      headers
    });
  } catch {
    return null;
  }
}

export async function fetchAdminAgents() {
  try {
    const headers = await getAdminAuthHeaders();
    return await safeFetchJson(`${API_BASE}/admin/agents`, {
      headers
    });
  } catch {
    return [];
  }
}

export async function updateAdminAgentStatus(agentId: string, status: 'verified' | 'rejected' | 'removed', reason?: string) {
  try {
    const headers = await getAdminAuthHeaders();
    return await safeFetchJson(`${API_BASE}/admin/agents/${agentId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status, reason })
    });
  } catch (err) {
    console.warn("Backend updateAdminAgentStatus failed:", err);
    throw err;
  }
}

export async function fetchAdminProperties() {
  try {
    const headers = await getAdminAuthHeaders();
    return await safeFetchJson(`${API_BASE}/admin/properties`, {
      headers
    });
  } catch (err) {
    console.warn("Backend fetchAdminProperties unavailable, falling back to Firestore:", err);
    return [];
  }
}

export async function updateAdminPropertyStatus(propertyId: string, status: string, reason?: string) {
  try {
    const headers = await getAdminAuthHeaders();
    return await safeFetchJson(`${API_BASE}/admin/properties/${propertyId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status, reason })
    });
  } catch (err) {
    console.warn("Backend updateAdminPropertyStatus failed:", err);
    throw err;
  }
}

export async function toggleAdminPropertyPromoted(propertyId: string, isPromoted: boolean) {
  try {
    const headers = await getAdminAuthHeaders();
    return await safeFetchJson(`${API_BASE}/admin/properties/${propertyId}/promote`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ isPromoted })
    });
  } catch (err) {
    console.warn("Backend toggleAdminPropertyPromoted failed:", err);
    throw err;
  }
}

export async function fetchStudentOverview() {
  try {
    const headers = await getAdminAuthHeaders();
    return await safeFetchJson(`${API_BASE}/admin/students/overview`, {
      headers
    });
  } catch {
    return null;
  }
}

export async function fetchAdminAnalytics() {
  try {
    const headers = await getAdminAuthHeaders();
    return await safeFetchJson(`${API_BASE}/admin/analytics`, {
      headers
    });
  } catch {
    return null;
  }
}

export async function fetchReports(): Promise<Report[]> {
  try {
    const headers = await getAdminAuthHeaders();
    const res = await apiFetch(`${API_BASE}/reports`, { headers });
    const parsed = await safeParseResponse<Report[]>(res);
    if (!parsed.ok || !parsed.data) throw new Error(parsed.error || 'Failed to fetch reports');
    return parsed.data;
  } catch (err) {
    const { MOCK_REPORTS } = await import('../data/mockData');
    return MOCK_REPORTS;
  }
}

export async function updateReportStatus(id: string, status: string): Promise<Report> {
  const headers = await getAdminAuthHeaders();
  const res = await apiFetch(`${API_BASE}/admin/reports/${id}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status })
  });
  const parsed = await safeParseResponse<Report>(res);
  if (!parsed.ok || !parsed.data) throw new Error(parsed.error || 'Failed to update report status');
  return parsed.data;
}

export async function updateListingStatus(id: string, status: string): Promise<Listing> {
  const headers = await getAdminAuthHeaders();
  const res = await apiFetch(`${API_BASE}/admin/listings/${id}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status })
  });
  const parsed = await safeParseResponse<Listing>(res);
  if (!parsed.ok || !parsed.data) throw new Error(parsed.error || 'Failed to update listing status');

  clientCache.invalidate('listings_query:');
  clientCache.invalidate(`listing_detail:${id}`);

  return parsed.data;
}




