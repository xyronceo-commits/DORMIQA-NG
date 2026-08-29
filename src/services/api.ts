import { Listing, University, Inspection, Conversation, ChatMessage, Report, User, UserRole, AuthorizedAdmin, AdminRole } from '../types';

const API_BASE = '/api';

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
 * Robust, safe JSON fetch wrapper using safeParseResponse.
 */
export async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err: any) {
    throw new Error(`Network connection error: ${err.message || 'Unable to connect to server'}`);
  }

  const parsed = await safeParseResponse<T>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error || `Server request failed with status ${res.status}`);
  }
  return parsed.data as T;
}

export async function fetchUniversities(): Promise<University[]> {
  try {
    const { fetchUniversitiesFromFirestore } = await import('./firebase');
    return await fetchUniversitiesFromFirestore();
  } catch (err) {
    console.warn('API fetchUniversities error, falling back to local data:', err);
    const { UNIVERSITIES } = await import('../data/mockData');
    return UNIVERSITIES;
  }
}

export async function fetchListings(params: Record<string, any> = {}): Promise<Listing[]> {
  try {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '' && params[key] !== null) {
        query.append(key, String(params[key]));
      }
    });
    const res = await fetch(`${API_BASE}/listings?${query.toString()}`);
    const parsed = await safeParseResponse<Listing[]>(res);
    if (parsed.ok && parsed.data && Array.isArray(parsed.data)) {
      return parsed.data;
    }
    throw new Error(parsed.error || 'Failed to fetch listings from backend');
  } catch (err) {
    console.warn('API fetchListings failed, querying Firestore fallback:', err);
    try {
      const { collection, getDocs, query, limit } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      const listingsRef = collection(db, 'listings');
      const q = query(listingsRef, limit(100));
      const snap = await getDocs(q);
      const fsListings: Listing[] = [];
      snap.forEach(docSnap => {
        fsListings.push({ id: docSnap.id, ...(docSnap.data() as Record<string, any>) } as Listing);
      });
      if (fsListings.length > 0) {
        return fsListings;
      }
    } catch (fsErr) {
      console.warn('Firestore fallback fetch failed:', fsErr);
    }
    const { MOCK_LISTINGS } = await import('../data/mockData');
    return MOCK_LISTINGS;
  }
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  if (!id || !id.trim()) return null;
  const cleanId = id.trim();

  // 1. Try Backend API
  let apiFailed = false;
  try {
    const res = await fetch(`${API_BASE}/listings/${encodeURIComponent(cleanId)}`);
    const parsed = await safeParseResponse<Listing>(res);
    if (parsed.ok && parsed.data) {
      return parsed.data;
    }
    if (res.status === 404) {
      apiFailed = true;
    }
  } catch (err) {
    apiFailed = true;
  }

  // 2. Query Firestore directly as authoritative lookup
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const docRef = doc(db, 'listings', cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Listing;
    }
    return null; // Genuinely not found in Firestore
  } catch (firestoreErr: any) {
    if (apiFailed) {
      throw new Error("Unable to connect to property database. Please check your network connection.");
    }
    return null;
  }
}

export async function createListing(listingData: Partial<Listing>): Promise<Listing> {
  let created: Listing | null = null;
  try {
    const res = await fetch(`${API_BASE}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listingData)
    });
    const parsed = await safeParseResponse<Listing>(res);
    if (parsed.ok && parsed.data) {
      created = parsed.data;
    }
  } catch (err) {
    console.warn('Backend createListing failed, saving directly to Firestore:', err);
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
      photos: listingData.photos || [],
      facilities: listingData.facilities || [],
      rules: listingData.rules || [],
      description: listingData.description || '',
      genderPreference: listingData.genderPreference || 'any',
      availableFrom: listingData.availableFrom || new Date().toISOString().split('T')[0],
      minLeaseMonths: listingData.minLeaseMonths || 12,
      totalBedrooms: listingData.totalBedrooms || 1,
      totalBathrooms: listingData.totalBathrooms || 1,
      isVerified: true,
      rating: 4.8,
      reviewCount: 0,
      reviews: [],
      featured: false,
      status: 'approved',
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

  // Authoritative Write to Firestore
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    await setDoc(doc(db, 'listings', created.id), created, { merge: true });
  } catch (fsErr) {
    console.error('Failed to write created listing to Firestore:', fsErr);
  }

  return created;
}

export async function updateListingStatusAndSales(
  listingId: string, 
  updateData: {
    title?: string;
    hotelName?: string;
    address?: string;
    description?: string;
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
): Promise<Listing> {
  let updated: Listing | null = null;
  try {
    const res = await fetch(`${API_BASE}/listings/${listingId}/status-and-sales`, {
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
    await updateDoc(docRef, updateData as any);
    if (!updated) {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        updated = { id: snap.id, ...snap.data() } as Listing;
      }
    }
  } catch (fsErr) {
    console.error('Failed to update listing in Firestore:', fsErr);
  }

  if (!updated) {
    throw new Error('Failed to persist listing updates to database');
  }

  return updated;
}

export async function submitListingReview(
  listingId: string, 
  reviewData: { authorName: string; authorAvatar?: string; rating: number; comment: string; universityCourse?: string; tag?: string }
): Promise<Listing> {
  let updated: Listing | null = null;
  try {
    const res = await fetch(`${API_BASE}/listings/${listingId}/reviews`, {
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
      authorAvatar: reviewData.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
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

  return updated;
}

export async function bookInspection(data: Partial<Inspection>): Promise<Inspection> {
  let created: Inspection | null = null;
  try {
    const res = await fetch(`${API_BASE}/inspections`, {
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

  return inspectionRecord;
}

export async function fetchInspections(query: { studentId?: string; agentId?: string } = {}): Promise<Inspection[]> {
  try {
    const searchObj: Record<string, string> = {};
    if (query.studentId) searchObj.studentId = query.studentId;
    if (query.agentId) searchObj.agentId = query.agentId;
    const params = new URLSearchParams(searchObj);
    const res = await fetch(`${API_BASE}/inspections?${params.toString()}`);
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
    const res = await fetch(`${API_BASE}/inspections/${id}/status`, {
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

  return updated;
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  try {
    const res = await fetch(`${API_BASE}/conversations?userId=${userId}`);
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
    const res = await fetch(`${API_BASE}/conversations/start`, {
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
    studentAvatar: data.studentAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
    agentId: data.agentId || '',
    agentName: 'Caretaker',
    agentAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=100&q=80',
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

  return conversationRecord;
}

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`);
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
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
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
    const { doc, setDoc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    await setDoc(doc(db, 'conversations', conversationId, 'messages', messageRecord.id), messageRecord, { merge: true });
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: data.text,
      lastMessageTime: 'Just now'
    });
  } catch (fsErr) {
    console.error('Failed to save message to Firestore:', fsErr);
  }

  return messageRecord;
}

export async function submitReport(data: Partial<Report>): Promise<Report> {
  let created: Report | null = null;
  try {
    const res = await fetch(`${API_BASE}/reports`, {
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

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem('dormiqa_admin_token') || 
           localStorage.getItem('dormiqa_admin_token') ||
           sessionStorage.getItem('campora_admin_token') || 
           localStorage.getItem('campora_admin_token');
  } catch {
    return null;
  }
}

export function setAdminToken(token: string) {
  try {
    sessionStorage.setItem('dormiqa_admin_token', token);
    localStorage.setItem('dormiqa_admin_token', token);
    sessionStorage.setItem('campora_admin_token', token);
    localStorage.setItem('campora_admin_token', token);
  } catch (err) {
    console.error(err);
  }
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem('dormiqa_admin_token');
    localStorage.removeItem('dormiqa_admin_token');
    sessionStorage.removeItem('campora_admin_token');
    localStorage.removeItem('campora_admin_token');
  } catch (err) {
    console.error(err);
  }
}

function getAdminAuthHeaders() {
  const token = getAdminToken();
  let adminEmail = '';
  try {
    const storedEmail = localStorage.getItem('dormiqa_admin_email') || sessionStorage.getItem('dormiqa_admin_email');
    if (storedEmail) adminEmail = storedEmail;
  } catch {}

  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(adminEmail ? { 'X-Admin-Email': adminEmail } : {})
  };
}

export async function adminLogin(email: string): Promise<{ success: boolean; authorized?: boolean; token?: string; email?: string; role?: AdminRole; message?: string }> {
  try {
    const data = await safeFetchJson<{ success: boolean; authorized?: boolean; token?: string; email?: string; role?: AdminRole; message?: string }>(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });

    if (data.success && data.token) {
      setAdminToken(data.token);
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Authentication request failed. Please check connection.'
    };
  }
}

export async function fetchAdministrators(): Promise<AuthorizedAdmin[]> {
  try {
    const data = await safeFetchJson<{ success: boolean; administrators: AuthorizedAdmin[] }>(`${API_BASE}/admin/administrators`, {
      headers: getAdminAuthHeaders()
    });
    return data.administrators || [];
  } catch (err) {
    console.warn("Backend fetchAdministrators error:", err);
    return [];
  }
}

export async function fetchAdminEmails(): Promise<string[]> {
  try {
    const admins = await fetchAdministrators();
    return admins.map(a => a.email);
  } catch (err) {
    console.warn("Backend fetchAdminEmails error:", err);
    return ['buildsafe247@gmail.com'];
  }
}

export async function addAdministrator(email: string, role: AdminRole = 'ADMIN'): Promise<AuthorizedAdmin[]> {
  const cleanEmail = email.trim().toLowerCase();
  const data = await safeFetchJson<{ success: boolean; administrators: AuthorizedAdmin[]; message?: string }>(`${API_BASE}/admin/administrators`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ email: cleanEmail, role })
  });
  return data.administrators || [];
}

export async function addAdminEmail(email: string): Promise<string[]> {
  const list = await addAdministrator(email, 'ADMIN');
  return list.map(a => a.email);
}

export async function removeAdministrator(email: string): Promise<AuthorizedAdmin[]> {
  const cleanEmail = email.trim().toLowerCase();
  const data = await safeFetchJson<{ success: boolean; administrators: AuthorizedAdmin[]; message?: string }>(`${API_BASE}/admin/administrators`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ email: cleanEmail })
  });
  return data.administrators || [];
}

export async function removeAdminEmail(email: string): Promise<string[]> {
  const list = await removeAdministrator(email);
  return list.map(a => a.email);
}

export async function updateAdministratorRole(email: string, role: AdminRole): Promise<AuthorizedAdmin[]> {
  const cleanEmail = email.trim().toLowerCase();
  const data = await safeFetchJson<{ success: boolean; administrators: AuthorizedAdmin[]; message?: string }>(`${API_BASE}/admin/administrators/${encodeURIComponent(cleanEmail)}/role`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ role })
  });
  return data.administrators || [];
}

export async function adminLogout(): Promise<void> {
  const token = getAdminToken();
  if (token) {
    await safeFetchJson(`${API_BASE}/admin/logout`, {
      method: 'POST',
      headers: getAdminAuthHeaders()
    }).catch(() => {});
  }
  clearAdminToken();
}

export async function checkAdminSession(): Promise<{ authenticated: boolean; email?: string; role?: AdminRole }> {
  const token = getAdminToken();
  if (!token) return { authenticated: false };
  try {
    const data = await safeFetchJson<{ authenticated: boolean; email?: string; role?: AdminRole }>(`${API_BASE}/admin/check-session`, {
      headers: getAdminAuthHeaders()
    });
    return {
      authenticated: Boolean(data.authenticated),
      email: data.email,
      role: data.role || 'ADMIN'
    };
  } catch {
    return { authenticated: false };
  }
}

export async function fetchAdminStats() {
  return await safeFetchJson(`${API_BASE}/admin/stats`, {
    headers: getAdminAuthHeaders()
  });
}

export async function fetchAdminAgents() {
  return await safeFetchJson(`${API_BASE}/admin/agents`, {
    headers: getAdminAuthHeaders()
  });
}

export async function updateAdminAgentStatus(agentId: string, status: 'verified' | 'rejected', reason?: string) {
  return await safeFetchJson(`${API_BASE}/admin/agents/${agentId}/status`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ status, reason })
  });
}

export async function fetchAdminProperties() {
  return await safeFetchJson(`${API_BASE}/admin/properties`, {
    headers: getAdminAuthHeaders()
  });
}

export async function updateAdminPropertyStatus(propertyId: string, status: string, reason?: string) {
  return await safeFetchJson(`${API_BASE}/admin/properties/${propertyId}/status`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ status, reason })
  });
}

export async function fetchStudentOverview() {
  return await safeFetchJson(`${API_BASE}/admin/students/overview`, {
    headers: getAdminAuthHeaders()
  });
}

export async function fetchAdminAnalytics() {
  return await safeFetchJson(`${API_BASE}/admin/analytics`, {
    headers: getAdminAuthHeaders()
  });
}

export async function fetchReports(): Promise<Report[]> {
  try {
    const res = await fetch(`${API_BASE}/reports`);
    const parsed = await safeParseResponse<Report[]>(res);
    if (!parsed.ok || !parsed.data) throw new Error(parsed.error || 'Failed to fetch reports');
    return parsed.data;
  } catch (err) {
    const { MOCK_REPORTS } = await import('../data/mockData');
    return MOCK_REPORTS;
  }
}

export async function updateReportStatus(id: string, status: string): Promise<Report> {
  const res = await fetch(`${API_BASE}/admin/reports/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  const parsed = await safeParseResponse<Report>(res);
  if (!parsed.ok || !parsed.data) throw new Error(parsed.error || 'Failed to update report status');
  return parsed.data;
}

export async function updateListingStatus(id: string, status: string): Promise<Listing> {
  const res = await fetch(`${API_BASE}/admin/listings/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  const parsed = await safeParseResponse<Listing>(res);
  if (!parsed.ok || !parsed.data) throw new Error(parsed.error || 'Failed to update listing status');
  return parsed.data;
}

export async function verifyAgentBusiness(payload: {
  businessName?: string;
  proofType?: 'banner' | 'logo' | 'office' | 'cac' | 'business_card';
  documentFileName?: string | null;
  documentStorageUrl?: string | null;
  agentName?: string;
  agencyName?: string;
  agentPortraitUrl?: string | null;
  preferredModel?: string;
}) {
  const res = await fetch(`${API_BASE}/ai/verify-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const parsed = await safeParseResponse(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || 'Failed to analyze business verification with AI');
  }
  return parsed.data;
}


