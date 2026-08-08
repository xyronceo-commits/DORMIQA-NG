import { Listing } from '../types';

interface PageSeoParams {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  imageUrl?: string;
  type?: 'website' | 'article';
}

/**
 * Dynamically updates document head metadata (title, meta tags, og tags, twitter tags, canonical URL)
 * for search engine discoverability & social card previews.
 */
export function updateDocumentSeo(params: PageSeoParams) {
  const siteName = 'Campora';
  const defaultDescription = 'Campora helps students discover, compare, and book verified hostels and apartments near their campus with ease.';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://campora.ng';

  const title = params.title 
    ? `${params.title} | ${siteName}`
    : `${siteName} - Verified Student Housing & Hostels Near Campus Gate`;

  const description = params.description || defaultDescription;
  const canonicalUrl = params.canonicalUrl || (typeof window !== 'undefined' ? window.location.href : baseUrl);
  const imageUrl = params.imageUrl || `${baseUrl}/og-image.svg`;

  // 1. Update Document Title
  document.title = title;

  // 2. Helper to set or update meta tags by name or property
  const setMetaTag = (attribute: 'name' | 'property', key: string, content: string) => {
    let element = document.querySelector(`meta[${attribute}="${key}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, key);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  // Standard Meta Tags
  setMetaTag('name', 'description', description);
  setMetaTag('name', 'title', title);

  // Open Graph
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', canonicalUrl);
  setMetaTag('property', 'og:image', imageUrl);
  setMetaTag('property', 'og:type', params.type || 'website');

  // Twitter Cards
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', imageUrl);
  setMetaTag('name', 'twitter:url', canonicalUrl);

  // Canonical Link
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);
}

/**
 * Formats property listing details into rich SEO metadata tags.
 */
export function updateListingSeo(listing: Listing | null) {
  if (!listing) {
    updateDocumentSeo({});
    return;
  }

  const title = `${listing.title} at ${listing.hotelName}`;
  const description = `${listing.title} (${listing.propertyType || 'Apartment'}) - ₦${(listing.pricePerYear || 0).toLocaleString()}/yr. ${listing.address}, servicing ${listing.universityName || 'campus'}. Verified student housing on Campora.`;
  const primaryImage = listing.photos && listing.photos.length > 0 ? listing.photos[0] : undefined;
  const canonicalUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/?listing=${listing.id}` 
    : undefined;

  updateDocumentSeo({
    title,
    description,
    imageUrl: primaryImage,
    canonicalUrl,
    type: 'article'
  });
}
