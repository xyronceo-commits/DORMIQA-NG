import { Listing, University, Inspection, Conversation, ChatMessage, Report, User } from '../types';

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
    return await safeFetchJson<University[]>(`${API_BASE}/universities`);
  } catch (err) {
    console.warn('API error, using fallback data:', err);
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
    if (!parsed.ok || !parsed.data) {
      throw new Error(parsed.error || 'Failed to fetch listings');
    }
    return parsed.data;
  } catch (err) {
    console.warn('API error, using fallback data:', err);
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
  const res = await fetch(`${API_BASE}/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(listingData)
  });
  const parsed = await safeParseResponse<Listing>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || 'Failed to create listing');
  }
  return parsed.data;
}

export async function updateListingStatusAndSales(
  listingId: string, 
  updateData: {
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
  const res = await fetch(`${API_BASE}/listings/${listingId}/status-and-sales`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });
  const parsed = await safeParseResponse<Listing>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || 'Failed to update listing unit status and sales info');
  }
  return parsed.data;
}

export async function submitListingReview(
  listingId: string, 
  reviewData: { authorName: string; authorAvatar?: string; rating: number; comment: string; universityCourse?: string; tag?: string }
): Promise<Listing> {
  const res = await fetch(`${API_BASE}/listings/${listingId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reviewData)
  });
  const parsed = await safeParseResponse<Listing>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || 'Failed to submit review');
  }
  return parsed.data;
}

export async function bookInspection(data: Partial<Inspection>): Promise<Inspection> {
  const res = await fetch(`${API_BASE}/inspections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const parsed = await safeParseResponse<Inspection>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error || 'Failed to book inspection');
  }
  return parsed.data;
}

export async function fetchInspections(query: { studentId?: string; agentId?: string } = {}): Promise<Inspection[]> {
  try {
    const params = new URLSearchParams(query as any);
    const res = await fetch(`${API_BASE}/inspections?${params.toString()}`);
    const parsed = await safeParseResponse<Inspection[]>(res);
    if (!parsed.ok || !parsed.data) throw new Error(parsed.error || 'Failed to fetch inspections');
    return parsed.data;
  } catch (err) {
    const { MOCK_INSPECTIONS } = await import('../data/mockData');
    return MOCK_INSPECTIONS;
  }
}

export async function updateInspectionStatus(id: string, status: string): Promise<Inspection> {
  const res = await fetch(`${API_BASE}/inspections/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  const parsed = await safeParseResponse<Inspection>(res);
  if (!parsed.ok || !parsed.data) throw new Error(parsed.error || 'Failed to update inspection status');
  return parsed.data;
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  try {
    const res = await fetch(`${API_BASE}/conversations?userId=${userId}`);
    const parsed = await safeParseResponse<Conversation[]>(res);
    if (!parsed.ok || !parsed.data) throw new Error(parsed.error || 'Failed to fetch conversations');
    return parsed.data;
  } catch (err) {
    const { MOCK_CONVERSATIONS } = await import('../data/mockData');
    return MOCK_CONVERSATIONS;
  }
}

export async function startConversation(data: { 
  studentId?: string; 
  studentName?: string;
  studentAvatar?: string;
  agentId?: string; 
  listingId: string;
}): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/conversations/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const parsed = await safeParseResponse<Conversation>(res);
  if (!parsed.ok || !parsed.data) throw new Error(parsed.error || 'Failed to start conversation');
  return parsed.data;
}

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`);
    const parsed = await safeParseResponse<ChatMessage[]>(res);
    if (!parsed.ok || !parsed.data) throw new Error(parsed.error || 'Failed to fetch messages');
    return parsed.data;
  } catch (err) {
    const { MOCK_CHAT_MESSAGES } = await import('../data/mockData');
    return MOCK_CHAT_MESSAGES.filter(m => m.conversationId === conversationId);
  }
}

export async function sendMessage(conversationId: string, data: { senderId: string; senderName: string; senderRole: string; recipientId: string; text: string }): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const parsed = await safeParseResponse<ChatMessage>(res);
  if (!parsed.ok || !parsed.data) throw new Error(parsed.error || 'Failed to send message');
  return parsed.data;
}

export async function submitReport(data: Partial<Report>): Promise<Report> {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const parsed = await safeParseResponse<Report>(res);
  if (!parsed.ok || !parsed.data) throw new Error(parsed.error || 'Failed to submit report');
  return parsed.data;
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
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export async function adminLogin(emailOrPassword: string, pass?: string): Promise<{ success: boolean; token?: string; message?: string; attemptsLeft?: number }> {
  const email = pass ? emailOrPassword : 'buildsafe247@gmail.com';
  const password = pass ? pass : emailOrPassword;

  try {
    const data = await safeFetchJson<{ success: boolean; token?: string; message?: string; attemptsLeft?: number; error?: string }>(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password: password.trim() })
    });

    if (data.success && data.token) {
      setAdminToken(data.token);
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Authentication request failed. Please check backend connection.'
    };
  }
}

export async function fetchAdminEmails(): Promise<string[]> {
  try {
    const data = await safeFetchJson<{ success: boolean; emails: string[] }>(`${API_BASE}/admin/emails`, {
      headers: getAdminAuthHeaders()
    });
    return data.emails || [];
  } catch (err) {
    console.warn("Backend fetchAdminEmails error:", err);
    return ['buildsafe247@gmail.com'];
  }
}

export async function addAdminEmail(email: string): Promise<string[]> {
  const cleanEmail = email.trim().toLowerCase();
  const data = await safeFetchJson<{ success: boolean; emails: string[]; message?: string }>(`${API_BASE}/admin/emails`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ email: cleanEmail })
  });
  return data.emails || [];
}

export async function removeAdminEmail(email: string): Promise<string[]> {
  const cleanEmail = email.trim().toLowerCase();
  const data = await safeFetchJson<{ success: boolean; emails: string[]; message?: string }>(`${API_BASE}/admin/emails`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ email: cleanEmail })
  });
  return data.emails || [];
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

export async function checkAdminSession(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;
  try {
    const data = await safeFetchJson<{ authenticated: boolean }>(`${API_BASE}/admin/check-session`, {
      headers: getAdminAuthHeaders()
    });
    return Boolean(data.authenticated);
  } catch {
    return false;
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


