/**
 * DORMIQA Client-Side Routing and Share URL Utilities
 */

export interface ParsedRoute {
  type: 'property' | 'view' | '404';
  propertyId?: string;
  view?: 'landing' | 'onboarding' | 'agent-landing' | 'business-verification' | 'search' | 'saved' | 'messages' | 'student-dash' | 'agent-dash' | 'admin-dash' | 'coming-soon' | 'universities';
  adminTab?: 'agents' | 'properties' | 'students' | 'analytics' | 'access';
}

const KNOWN_VIEW_PATHS: Record<string, ParsedRoute['view']> = {
  '/': 'landing',
  '/search': 'search',
  '/discover': 'search',
  '/explore': 'search',
  '/saved': 'saved',
  '/messages': 'messages',
  '/chats': 'messages',
  '/onboarding': 'onboarding',
  '/agent-portal': 'agent-landing',
  '/agent-landing': 'agent-landing',
  '/business-verification': 'business-verification',
  '/student-dashboard': 'student-dash',
  '/agent-dashboard': 'agent-dash',
  '/admin-dashboard': 'admin-dash',
  '/admin': 'admin-dash',
  '/admin/dashboard': 'admin-dash',
  '/admin/agents': 'admin-dash',
  '/admin/students': 'admin-dash',
  '/admin/hostels': 'admin-dash',
  '/admin/properties': 'admin-dash',
  '/admin/verifications': 'admin-dash',
  '/admin/messages': 'admin-dash',
  '/admin/analytics': 'admin-dash',
  '/admin/settings': 'admin-dash',
  '/admin/access': 'admin-dash',
  '/coming-soon': 'coming-soon',
  '/universities': 'universities',
};

/**
 * Parses current window.location into a structured route object.
 */
export function parseRouteFromUrl(): ParsedRoute {
  if (typeof window === 'undefined') {
    return { type: 'view', view: 'landing' };
  }

  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const urlParams = new URLSearchParams(window.location.search);

  // 1. Check for legacy query parameter ?listing= or ?property=
  const queryListingId = urlParams.get('listing') || urlParams.get('property');
  if (queryListingId && queryListingId.trim()) {
    return { type: 'property', propertyId: queryListingId.trim() };
  }

  // 2. Check path pattern /property/:id or /hostel/:id
  const propertyMatch = pathname.match(/^\/(property|hostel)\/([^/]+)/i);
  if (propertyMatch && propertyMatch[2]) {
    return { type: 'property', propertyId: decodeURIComponent(propertyMatch[2].trim()) };
  }

  // 3. Check admin routes
  if (pathname.startsWith('/admin')) {
    let adminTab: ParsedRoute['adminTab'] = 'agents';
    if (pathname.includes('/hostels') || pathname.includes('/properties') || pathname.includes('/verifications')) {
      adminTab = 'properties';
    } else if (pathname.includes('/students')) {
      adminTab = 'students';
    } else if (pathname.includes('/analytics')) {
      adminTab = 'analytics';
    } else if (pathname.includes('/access') || pathname.includes('/settings')) {
      adminTab = 'access';
    }
    return { type: 'view', view: 'admin-dash', adminTab };
  }

  // 4. Check known top-level view paths
  if (KNOWN_VIEW_PATHS[pathname]) {
    return { type: 'view', view: KNOWN_VIEW_PATHS[pathname] };
  }

  // 5. Default root path /
  if (pathname === '/') {
    return { type: 'view', view: 'landing' };
  }

  // 6. Unknown route -> 404
  return { type: '404' };
}

/**
 * Returns canonical public property URL
 */
export function getCanonicalPropertyUrl(propertyId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dormiqa-ng.vercel.app';
  return `${origin}/property/${encodeURIComponent(propertyId)}`;
}

/**
 * Pushes or replaces window.history for property route
 */
export function pushPropertyUrl(propertyId: string, replace = false) {
  if (typeof window === 'undefined') return;
  const targetPath = `/property/${encodeURIComponent(propertyId)}`;
  if (window.location.pathname !== targetPath) {
    if (replace) {
      window.history.replaceState({ type: 'property', propertyId }, '', targetPath);
    } else {
      window.history.pushState({ type: 'property', propertyId }, '', targetPath);
    }
  }
}

/**
 * Pushes or replaces window.history for view route
 */
export function pushViewUrl(view: string, replace = false, subTab?: string) {
  if (typeof window === 'undefined') return;
  const pathMap: Record<string, string> = {
    'landing': '/',
    'search': '/search',
    'saved': '/saved',
    'messages': '/messages',
    'onboarding': '/onboarding',
    'business-verification': '/business-verification',
    'student-dash': '/student-dashboard',
    'agent-dash': '/agent-dashboard',
    'admin-dash': '/admin/dashboard',
    'coming-soon': '/coming-soon',
    'universities': '/universities'
  };

  let targetPath = pathMap[view] || '/';
  if (view === 'admin-dash' && subTab) {
    if (subTab === 'properties') targetPath = '/admin/hostels';
    else if (subTab === 'students') targetPath = '/admin/students';
    else if (subTab === 'analytics') targetPath = '/admin/analytics';
    else if (subTab === 'access') targetPath = '/admin/access';
    else if (subTab === 'agents') targetPath = '/admin/agents';
  }

  if (window.location.pathname !== targetPath) {
    if (replace) {
      window.history.replaceState({ type: 'view', view, subTab }, '', targetPath);
    } else {
      window.history.pushState({ type: 'view', view, subTab }, '', targetPath);
    }
  }
}

/**
 * Reliable Share Property Utility (Web Share API + Clipboard Fallback)
 */
export async function sharePropertyListing(
  listing: {
    id: string;
    title: string;
    universityName?: string;
    pricePerYear?: number;
    pricePerWeek?: number;
  },
  onToastNotice?: (message: string) => void
): Promise<boolean> {
  const canonicalUrl = getCanonicalPropertyUrl(listing.id);
  const formattedPrice = (listing.pricePerYear || (listing.pricePerWeek ? listing.pricePerWeek * 52 : 300000)).toLocaleString();
  const shareText = `Check out "${listing.title}" near ${listing.universityName || 'campus'} on Dormiqa Nigeria - ₦${formattedPrice}/yr!`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: listing.title,
        text: shareText,
        url: canonicalUrl
      });
      if (onToastNotice) onToastNotice('Property link shared successfully!');
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
      // Continue to clipboard fallback
    }
  }

  // Fallback: Copy Canonical URL to Clipboard
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(canonicalUrl);
      if (onToastNotice) onToastNotice('Property link copied to clipboard!');
      return true;
    }
  } catch (err) {
    console.warn("Clipboard write error:", err);
  }

  return false;
}
