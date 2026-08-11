import { Listing, University, Inspection, Conversation, ChatMessage, Report, User } from '../types';

const API_BASE = '/api';

export async function fetchUniversities(): Promise<University[]> {
  try {
    const res = await fetch(`${API_BASE}/universities`);
    if (!res.ok) throw new Error('Failed to fetch universities');
    return await res.json();
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
    if (!res.ok) throw new Error('Failed to fetch listings');
    return await res.json();
  } catch (err) {
    console.warn('API error, using fallback data:', err);
    const { MOCK_LISTINGS } = await import('../data/mockData');
    return MOCK_LISTINGS;
  }
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  try {
    const res = await fetch(`${API_BASE}/listings/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    const { MOCK_LISTINGS } = await import('../data/mockData');
    return MOCK_LISTINGS.find(l => l.id === id) || null;
  }
}

export async function createListing(listingData: Partial<Listing>): Promise<Listing> {
  const res = await fetch(`${API_BASE}/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(listingData)
  });
  if (!res.ok) throw new Error('Failed to create listing');
  return await res.json();
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
  if (!res.ok) throw new Error('Failed to update listing unit status and sales info');
  return await res.json();
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
  if (!res.ok) throw new Error('Failed to submit review');
  return await res.json();
}

export async function bookInspection(data: Partial<Inspection>): Promise<Inspection> {
  const res = await fetch(`${API_BASE}/inspections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to book inspection');
  return await res.json();
}

export async function fetchInspections(query: { studentId?: string; agentId?: string } = {}): Promise<Inspection[]> {
  try {
    const params = new URLSearchParams(query as any);
    const res = await fetch(`${API_BASE}/inspections?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch inspections');
    return await res.json();
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
  if (!res.ok) throw new Error('Failed to update inspection status');
  return await res.json();
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  try {
    const res = await fetch(`${API_BASE}/conversations?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return await res.json();
  } catch (err) {
    const { MOCK_CONVERSATIONS } = await import('../data/mockData');
    return MOCK_CONVERSATIONS;
  }
}

export async function startConversation(data: { studentId?: string; agentId?: string; listingId: string }): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/conversations/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to start conversation');
  return await res.json();
}

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`);
    if (!res.ok) throw new Error('Failed to fetch messages');
    return await res.json();
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
  if (!res.ok) throw new Error('Failed to send message');
  return await res.json();
}

export async function submitReport(data: Partial<Report>): Promise<Report> {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to submit report');
  return await res.json();
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

export async function adminLogin(password: string): Promise<{ success: boolean; token?: string; message?: string }> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });

  const data = await res.json();
  if (res.ok && data.success && data.token) {
    setAdminToken(data.token);
  }
  return data;
}

export async function adminLogout(): Promise<void> {
  const token = getAdminToken();
  if (token) {
    await fetch(`${API_BASE}/admin/logout`, {
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
    const res = await fetch(`${API_BASE}/admin/check-session`, {
      headers: getAdminAuthHeaders()
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAdminStats() {
  const res = await fetch(`${API_BASE}/admin/stats`, {
    headers: getAdminAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch admin stats');
  return await res.json();
}

export async function fetchAdminAgents() {
  const res = await fetch(`${API_BASE}/admin/agents`, {
    headers: getAdminAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch agent applications');
  return await res.json();
}

export async function updateAdminAgentStatus(agentId: string, status: 'verified' | 'rejected', reason?: string) {
  const res = await fetch(`${API_BASE}/admin/agents/${agentId}/status`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ status, reason })
  });
  if (!res.ok) throw new Error('Failed to update agent status');
  return await res.json();
}

export async function fetchAdminProperties() {
  const res = await fetch(`${API_BASE}/admin/properties`, {
    headers: getAdminAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch admin properties');
  return await res.json();
}

export async function updateAdminPropertyStatus(propertyId: string, status: string, reason?: string) {
  const res = await fetch(`${API_BASE}/admin/properties/${propertyId}/status`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ status, reason })
  });
  if (!res.ok) throw new Error('Failed to update property status');
  return await res.json();
}

export async function fetchStudentOverview() {
  const res = await fetch(`${API_BASE}/admin/students/overview`, {
    headers: getAdminAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch student overview');
  return await res.json();
}

export async function fetchAdminAnalytics() {
  const res = await fetch(`${API_BASE}/admin/analytics`, {
    headers: getAdminAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch admin analytics');
  return await res.json();
}

export async function fetchReports(): Promise<Report[]> {
  try {
    const res = await fetch(`${API_BASE}/reports`);
    if (!res.ok) throw new Error('Failed to fetch reports');
    return await res.json();
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
  return await res.json();
}

export async function updateListingStatus(id: string, status: string): Promise<Listing> {
  const res = await fetch(`${API_BASE}/admin/listings/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return await res.json();
}

export async function fetchAIRecommendations(payload: {
  universityId?: string;
  universityName?: string;
  budget?: number;
  maxWalkingMinutes?: number;
  propertyType?: string;
  preferenceText?: string;
  preferredModel?: string;
}) {
  const res = await fetch(`${API_BASE}/ai/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch AI recommendations');
  }
  return await res.json();
}

export async function sendAIChat(payload: {
  userMessage: string;
  universityName?: string;
  conversationHistory?: Array<{ sender: string; text: string }>;
  listingContext?: any;
  preferredModel?: string;
}) {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get AI advisor response');
  }
  return await res.json();
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
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to analyze business verification with AI');
  }
  return await res.json();
}

export async function sendVerificationCode(email: string): Promise<{
  success: boolean;
  message: string;
  expiresAt?: number;
  expiresInSeconds?: number;
  error?: string;
  retryAfterSeconds?: number;
}> {
  const res = await fetch(`${API_BASE}/auth/send-verification-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to send verification code');
    (err as any).response = data;
    throw err;
  }
  return data;
}

export async function verifyCode(email: string, code: string): Promise<{
  success: boolean;
  isEmailVerified?: boolean;
  message?: string;
  error?: string;
  remainingAttempts?: number;
}> {
  const res = await fetch(`${API_BASE}/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Invalid or expired verification code');
    (err as any).response = data;
    throw err;
  }
  return data;
}

export async function checkVerificationCodeStatus(email: string): Promise<{
  active: boolean;
  expiresAt?: number;
  remainingSeconds?: number;
}> {
  try {
    const res = await fetch(`${API_BASE}/auth/code-status?email=${encodeURIComponent(email)}`);
    if (!res.ok) return { active: false };
    return await res.json();
  } catch {
    return { active: false };
  }
}

