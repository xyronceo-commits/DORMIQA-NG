import { University, Listing, User, Conversation, ChatMessage, Inspection, Report } from '../types';

import { PUBLIC_UNIVERSITIES } from './publicUniversities';

export const UNIVERSITIES: University[] = PUBLIC_UNIVERSITIES;

export const MOCK_USERS: User[] = [];

const PHOTO_SETS = [
  [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
  ],
  [
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'
  ],
  [
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80'
  ],
  [
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80'
  ],
  [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80'
  ]
];

import { MASTER_CAMPUSES, getCampusesByUniversityId } from './campuses';

const TEMPLATES = [
  { titleSuffix: 'Royal Palms Self-Contain Lodge', propertyType: 'self_contain' as const, pricePerYear: 350000, walkMin: 5, featured: true },
  { titleSuffix: 'Executive 1-Bedroom Student Flat', propertyType: 'one_bedroom' as const, pricePerYear: 550000, walkMin: 8, featured: false },
  { titleSuffix: 'Crown Villa Ensuite Studio', propertyType: 'ensuite' as const, pricePerYear: 420000, walkMin: 4, featured: true },
  { titleSuffix: 'Greenfield Shared Student Apartment', propertyType: 'shared_flat' as const, pricePerYear: 280000, walkMin: 12, featured: false },
  { titleSuffix: 'Campus Gate View Serviced Lodge', propertyType: 'studio' as const, pricePerYear: 380000, walkMin: 6, featured: false },
  { titleSuffix: 'Garden View Hillside Lodge', propertyType: 'self_contain' as const, pricePerYear: 320000, walkMin: 5, featured: true },
  { titleSuffix: 'Diamond Student Suites', propertyType: 'self_contain' as const, pricePerYear: 390000, walkMin: 7, featured: false },
  { titleSuffix: 'Sunrise Villa Off-Campus Lodge', propertyType: 'single_room' as const, pricePerYear: 220000, walkMin: 10, featured: false },
  { titleSuffix: 'Harmony Haven Luxury Apartments', propertyType: 'one_bedroom' as const, pricePerYear: 600000, walkMin: 9, featured: true },
  { titleSuffix: 'Peace Court Student Hostel', propertyType: 'bedspace' as const, pricePerYear: 180000, walkMin: 3, featured: false },
  { titleSuffix: 'Prestige Heights Self-Contain', propertyType: 'self_contain' as const, pricePerYear: 360000, walkMin: 6, featured: true },
  { titleSuffix: 'Emerald Lodge Student Res', propertyType: 'studio' as const, pricePerYear: 400000, walkMin: 8, featured: false },
  { titleSuffix: 'Apex Executive Lodge', propertyType: 'ensuite' as const, pricePerYear: 450000, walkMin: 5, featured: true },
  { titleSuffix: 'University Gate Residency', propertyType: 'self_contain' as const, pricePerYear: 340000, walkMin: 4, featured: false }
];

export const MOCK_LISTINGS: Listing[] = TEMPLATES.map((tmpl, index) => {
  const photoSet = PHOTO_SETS[index % PHOTO_SETS.length];
  return {
    id: `uniosun_lodge_${index + 1}`,
    title: tmpl.titleSuffix,
    hotelName: tmpl.titleSuffix,
    description: `High-quality, verified student accommodation situated in Osogbo near Osun State University main campus gates. Features steady water supply, secure gated compound, and serene student studying environment.`,
    pricePerYear: tmpl.pricePerYear,
    pricePerMonth: Math.round(tmpl.pricePerYear / 12),
    pricePerWeek: Math.round(tmpl.pricePerYear / 52),
    currency: 'NGN',
    billsIncluded: false,
    deposit: 30000,
    propertyType: tmpl.propertyType,
    universityId: 'uniosun',
    universityName: 'Osun State University (UNIOSUN)',
    walkingDistanceMinutes: tmpl.walkMin,
    walkingDistanceMeters: tmpl.walkMin * 80,
    address: `${12 + index * 4} Oke-Fia Road, Osogbo`,
    city: 'Osogbo',
    state: 'Osun State',
    lat: 7.7827 + (index * 0.002),
    lng: 4.5418 + (index * 0.0015),
    photos: photoSet,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-living-room-with-a-modern-interior-design-4824-large.mp4',
    vacanciesCount: (index % 3) + 1,
    unitStatus: 'vacant',
    facilities: ['24/7 Water Supply', 'Security Guard', 'Prepaid Meter', 'Fenced Gate', 'Tiled Floor'],
    genderPreference: 'any',
    availableFrom: '2026-10-01',
    minLeaseMonths: 12,
    totalBedrooms: tmpl.propertyType === 'one_bedroom' ? 1 : tmpl.propertyType === 'shared_flat' ? 2 : 1,
    totalBathrooms: 1,
    isVerified: true,
    status: 'approved',
    verificationStatus: 'approved',
    agentId: 'agent_verified_1',
    agent: {
      id: 'agent_verified_1',
      name: 'Adeyemi Oladipo',
      agencyName: 'Prime Crest Properties Osogbo',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      phone: '+2348031234567',
      email: 'adeyemi@primecrest.ng',
      responseRate: '98%',
      responseTime: 'Under 15 mins',
      isVerified: true,
      rating: 4.9,
      totalReviews: 24
    },
    reviews: [],
    rules: ['No loud noise after 10 PM', 'Keep common areas clean'],
    rating: 4.8,
    reviewCount: 12,
    featured: tmpl.featured,
    isPromoted: tmpl.featured,
    createdAt: new Date(Date.now() - (index * 86400000)).toISOString()
  };
});

export const MOCK_INSPECTIONS: Inspection[] = [];

export const MOCK_CONVERSATIONS: Conversation[] = [];

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [];

export const MOCK_REPORTS: Report[] = [];

