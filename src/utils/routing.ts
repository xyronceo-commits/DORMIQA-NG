/**
 * DORMIQA Client-Side Routing and Share URL Utilities
 */

export interface ParsedRoute {
  type: 'property' | 'view' | '404';
  propertyId?: string;
  view?: 'landing' | 'onboarding' | 'business-verification' | 'search' | 'saved' | 'messages' | 'student-dash' | 'agent-dash' | 'admin-dash';
}

const KNOWN_VIEW_PATHS: Record<string, ParsedRoute['view']> = {
  '/': 'landing',
  '/search': 'search',
  '/discover': 'search',
  '/saved': 'saved',
  '/messages': 'messages',
  '/chats': 'messages',
  '/onboarding': 'onboarding',
  '/business-verification': 'business-verification',
  '/student-dashboard': 'student-dash',
  '/agent-dashboard': 'agent-dash',
  '/admin-dashboard': 'admin-dash',
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

  // 3. Check known top-level view paths
  if (KNOWN_VIEW_PATHS[pathname]) {
    return { type: 'view', view: KNOWN_VIEW_PATHS[pathname] };
  }

  // 4. Default root path /
  if (pathname === '/') {
    return { type: 'view', view: 'landing' };
  }

  // 5. Unknown route -> 404
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
export function pushViewUrl(view: string, replace = false) {
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
    'admin-dash': '/admin-dashboard'
  };

  const targetPath = pathMap[view] || '/';
  if (window.location.pathname !== targetPath) {
    if (replace) {
      window.history.replaceState({ type: 'view', view }, '', targetPath);
    } else {
      window.history.pushState({ type: 'view', view }, '', targetPath);
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
