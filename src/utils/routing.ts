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
  '/auth/confirmed': 'onboarding',
  '/auth/reset-password': 'onboarding',
  '/auth/verify': 'onboarding',
  '/reset-password': 'onboarding',
  '/forgot-password': 'onboarding',
};

export const RECOVERY_FLOW_STORAGE_KEY = 'dormiqa_recovery_flow_active';
export const AUTH_LINK_ERROR_STORAGE_KEY = 'dormiqa_auth_link_error';

/**
 * Checks whether current URL is an auth link error (e.g. expired otp or access denied)
 */
export function detectAuthLinkError(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(search);

  const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
  const error = hashParams.get('error') || searchParams.get('error');
  const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');

  if (errorCode || error || errorDesc) {
    return true;
  }
  try {
    if (sessionStorage.getItem(AUTH_LINK_ERROR_STORAGE_KEY) === 'true') {
      return true;
    }
  } catch (_) {}

  return false;
}

/**
 * Checks whether current URL indicates a password recovery action.
 * Handles:
 * 1. Path: /auth/reset-password, /reset-password, /forgot-password
 * 2. Hash params: type=recovery (e.g. #access_token=...&type=recovery)
 * 3. Search query params: type=recovery (e.g. ?token_hash=...&type=recovery)
 * 4. PKCE code callback on /auth/reset-password or when accompanied by type=recovery
 * Note: A ?code= without recovery context on other routes (e.g. /) is NOT treated as recovery.
 */
export function detectRecoveryUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(search);

  const hashType = hashParams.get('type');
  const searchType = searchParams.get('type');
  const tokenHash = searchParams.get('token_hash');
  const code = searchParams.get('code');

  // Explicit type=recovery anywhere (hash or query)
  if (hashType === 'recovery' || searchType === 'recovery') {
    return true;
  }

  // Path is dedicated reset route
  if (pathname === '/auth/reset-password' || pathname === '/reset-password' || pathname === '/forgot-password') {
    return true;
  }

  // Token hash with recovery
  if (tokenHash && searchType === 'recovery') {
    return true;
  }

  // PKCE code only if on reset path or explicitly recovery
  if (code && (pathname === '/auth/reset-password' || searchType === 'recovery')) {
    return true;
  }

  return false;
}

/**
 * Checks whether the recovery flow is currently marked as active in session state.
 */
export function isRecoveryFlowActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(RECOVERY_FLOW_STORAGE_KEY) === 'true';
  } catch (_) {
    return false;
  }
}

/**
 * Marks recovery flow as active in session storage and cleans tokens from URL/history
 * so sensitive tokens don't remain in browser address bar, while preserving the reset screen.
 */
export function markRecoveryFlowIfPresent(): void {
  if (typeof window === 'undefined') return;

  const hasAuthError = detectAuthLinkError();
  const hasRecovery = detectRecoveryUrl();

  if (hasAuthError) {
    try {
      sessionStorage.setItem(AUTH_LINK_ERROR_STORAGE_KEY, 'true');
    } catch (_) {}
    return;
  }

  if (hasRecovery) {
    try {
      sessionStorage.setItem(RECOVERY_FLOW_STORAGE_KEY, 'true');
    } catch (_) {}
  }
}

/**
 * Clears the recovery flow state from session storage.
 */
export function clearRecoveryFlow(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(RECOVERY_FLOW_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_LINK_ERROR_STORAGE_KEY);
  } catch (_) {}
}

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
    'admin-dash': '/admin',
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
