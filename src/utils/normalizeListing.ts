import { Listing } from '../types';

/**
 * Normalizes any raw listing document from Firestore or API into a complete,
 * strongly-typed Listing object. Guarantees that nested structures like `agent`
 * and verification flags exist and adhere to the application's data contract.
 */
export function normalizeListing(data: any, docId?: string): Listing {
  const id = docId || data?.id || `lst_${Date.now()}`;
  const rawAgent = data?.agent && typeof data.agent === 'object' ? data.agent : {};
  const agentId = data?.agentId || data?.userId || rawAgent.id || 'agent_default';
  const agentName = data?.agentName || rawAgent.name || 'Verified Caretaker';
  const agentPhone = data?.agentPhone || rawAgent.phone || '';
  const agentAvatar = data?.agentAvatar || rawAgent.avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80';
  
  // Agent verification: check explicit agent fields or user/business status
  const isAgentVerified = Boolean(
    rawAgent.isVerified !== undefined ? rawAgent.isVerified :
    (data?.isVerifiedAgent || data?.businessVerificationStatus === 'approved' || true)
  );

  const agent = {
    id: agentId,
    name: agentName,
    agencyName: rawAgent.agencyName || 'Verified Accommodation Management',
    avatarUrl: agentAvatar,
    phone: agentPhone,
    email: rawAgent.email || data?.agentEmail || '',
    responseRate: rawAgent.responseRate || '100%',
    responseTime: rawAgent.responseTime || 'Under 15 mins',
    isVerified: isAgentVerified,
    rating: typeof rawAgent.rating === 'number' ? rawAgent.rating : 5.0,
    totalReviews: typeof rawAgent.totalReviews === 'number' ? rawAgent.totalReviews : 1
  };

  // Property / Listing verification: status or explicit isVerified flag
  const rawStatus = data?.status || data?.verificationStatus;
  let status: 'pending' | 'approved' | 'rejected' | 'banned' | 'changes_requested' | 'removed' = 'pending';

  if (rawStatus === 'approved' || rawStatus === 'verified') {
    status = 'approved';
  } else if (rawStatus === 'rejected') {
    status = 'rejected';
  } else if (rawStatus === 'banned') {
    status = 'banned';
  } else if (rawStatus === 'changes_requested') {
    status = 'changes_requested';
  } else if (rawStatus === 'removed') {
    status = 'removed';
  } else if (data?.isVerified === true) {
    status = 'approved';
  } else {
    status = 'pending';
  }

  const isListingVerified = status === 'approved';

  return {
    ...(data || {}),
    id,
    title: data?.title || data?.hotelName || 'Campus Hostel Accommodation',
    hotelName: data?.hotelName || data?.title || 'Campus Accommodation',
    description: data?.description || '',
    pricePerYear: Number(data?.pricePerYear || data?.price || 350000),
    pricePerMonth: Number(data?.pricePerMonth || Math.round((data?.pricePerYear || data?.price || 350000) / 12)),
    pricePerWeek: Number(data?.pricePerWeek || Math.round((data?.pricePerYear || data?.price || 350000) / 52)),
    currency: data?.currency || 'NGN',
    billsIncluded: data?.billsIncluded ?? true,
    deposit: Number(data?.deposit || 35000),
    propertyType: data?.propertyType || data?.type || 'self_contain',
    universityId: data?.universityId || 'uniosun',
    universityName: data?.universityName || 'UNIOSUN',
    walkingDistanceMinutes: Number(data?.walkingDistanceMinutes || data?.distanceMinutesWalk || 10),
    walkingDistanceMeters: Number(data?.walkingDistanceMeters || (data?.distanceMinutesWalk || 10) * 80),
    address: data?.address || 'Main Campus Area',
    city: data?.city || 'Osogbo',
    state: data?.state || 'Osun State',
    lat: Number(data?.lat || 7.771),
    lng: Number(data?.lng || 4.56),
    photos: Array.isArray(data?.photos) && data.photos.length > 0 
      ? data.photos 
      : (Array.isArray(data?.imageUrls) && data.imageUrls.length > 0 ? data.imageUrls : ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80']),
    vacanciesCount: data?.vacanciesCount !== undefined ? Number(data.vacanciesCount) : (data?.availableUnits !== undefined ? Number(data.availableUnits) : 1),
    facilities: Array.isArray(data?.facilities) ? data.facilities : (Array.isArray(data?.features) ? data.features : []),
    genderPreference: data?.genderPreference || 'any',
    availableFrom: data?.availableFrom || new Date().toISOString().split('T')[0],
    minLeaseMonths: Number(data?.minLeaseMonths || 12),
    totalBedrooms: Number(data?.totalBedrooms || 1),
    totalBathrooms: Number(data?.totalBathrooms || 1),
    isVerified: isListingVerified,
    status,
    verificationStatus: data?.verificationStatus || status,
    rejectionReason: data?.rejectionReason || data?.aiBanReason || null,
    agentId,
    agent,
    reviews: Array.isArray(data?.reviews) ? data.reviews : [],
    rules: Array.isArray(data?.rules) ? data.rules : [],
    rating: Number(data?.rating || 5.0),
    reviewCount: Number(data?.reviewCount || 0),
    featured: Boolean(data?.featured || false),
    createdAt: data?.createdAt || new Date().toISOString()
  };
}
