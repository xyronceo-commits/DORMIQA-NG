export type UserRole = 'student' | 'agent' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  isAvatarLocked?: boolean;
  verificationPhotoUrl?: string;
  phone?: string;
  universityId?: string;
  universityName?: string;
  isVerifiedAgent?: boolean;
  isEmailVerified?: boolean;
  agencyName?: string;
  licenseNumber?: string;
  status?: 'verified' | 'pending' | 'rejected';
  rejectionReason?: string;
  propertiesCount?: number;
  proofType?: string;
  bio?: string;
  createdAt: string;
}

export type InstitutionType = 'federal' | 'state' | 'private' | 'polytechnic' | 'college';

export interface University {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  code: string;
  type: InstitutionType;
  lat: number;
  lng: number;
  popularAreas: string[];
  totalListings: number;
  imageUrl: string;
  description: string;
}

export type PropertyType = 
  | 'self_contain' 
  | 'single_room' 
  | 'one_bedroom' 
  | 'shared_flat' 
  | 'bedspace' 
  | 'studio' 
  | 'ensuite' 
  | 'duplex_flat';

export type UnitStatus = 'vacant' | 'occupied' | 'remaining' | 'under_renovation';

export interface ListingReview {
  id: string;
  authorName: string;
  authorAvatar: string;
  rating: number;
  date: string;
  comment: string;
  universityCourse?: string;
  tag?: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  pricePerYear: number;
  pricePerMonth: number;
  pricePerWeek?: number;
  currency: string;
  billsIncluded: boolean;
  deposit: number;
  propertyType: PropertyType;
  universityId: string;
  universityName: string;
  walkingDistanceMinutes: number;
  walkingDistanceMeters: number;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  photos: string[];
  hotelName?: string;
  vacanciesCount?: number;
  unitStatus?: UnitStatus;
  unitStatusNote?: string;
  agencyFeeNote?: string;
  promoDiscount?: string;
  salesNote?: string;
  isAvailableForSale?: boolean;
  videoUrl?: string;
  facilities: string[];
  genderPreference: 'any' | 'female_only' | 'male_only';
  availableFrom: string;
  minLeaseMonths: number;
  totalBedrooms: number;
  totalBathrooms: number;
  isVerified: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'banned' | 'flagged';
  aiBanReason?: string;
  isAiBanned?: boolean;
  duplicateListingId?: string;
  agentId: string;
  agent: {
    id: string;
    name: string;
    agencyName: string;
    avatarUrl: string;
    phone: string;
    email: string;
    responseRate: string;
    responseTime: string;
    isVerified: boolean;
    rating: number;
    totalReviews: number;
  };
  reviews: ListingReview[];
  rules: string[];
  rating: number;
  reviewCount: number;
  featured: boolean;
  createdAt: string;
  viewCount?: number;
}

export interface Inspection {
  id: string;
  listingId: string;
  listingTitle: string;
  listingAddress: string;
  listingPhoto: string;
  pricePerYear?: number;
  pricePerWeek?: number;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  agentId: string;
  agentName: string;
  date: string;
  timeSlot: string;
  type: 'in_person' | 'virtual_video';
  status: 'pending' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  text: string;
  createdAt: string;
  listingId?: string;
  isSystemNotice?: boolean;
}

export interface Conversation {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  agencyName: string;
  listingId: string;
  listingTitle: string;
  listingPhoto: string;
  listingPrice: number;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface Report {
  id: string;
  listingId: string;
  listingTitle: string;
  reporterId: string;
  reporterName: string;
  reason: 'fake_listing' | 'misleading_photos' | 'scam_attempt' | 'incorrect_price' | 'other';
  details: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  aiActionTaken?: 'listing_banned' | 'listing_flagged' | 'under_review' | 'none';
  aiReason?: string;
  isFakeOrDuplicate?: boolean;
  duplicateWithAgent?: string;
  createdAt: string;
}

export type NotificationType = 'message' | 'inspection' | 'listing' | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  isPinned?: boolean;
  createdAt: string;
  universityId?: string;
  linkUrl?: string;
  metadata?: {
    listingId?: string;
    inspectionId?: string;
    conversationId?: string;
    senderName?: string;
    senderAvatar?: string;
    status?: string;
    reason?: string;
  };
}

export interface SearchFilters {
  universityId: string;
  institutionType: string;
  stateFilter: string;
  minPrice: number;
  maxPrice: number;
  propertyTypes: PropertyType[];
  facilities: string[];
  maxWalkingMinutes: number;
  genderPreference: string;
  availableBefore?: string;
  billsIncludedOnly: boolean;
  sortBy: 'distance' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
}
