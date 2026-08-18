import { calculateHaversineDistanceKm } from '../utils/distance';

export type RouteMode = 'walking' | 'driving' | 'bicycling';

export interface RouteResult {
  mode: RouteMode;
  distanceKm: number;
  durationMinutes: number;
  distanceMeters: number;
  durationSeconds: number;
  isAvailable: boolean;
  reason?: string;
  source: 'osrm' | 'route_calculation';
  retrievedAt: string;
}

export interface PropertyMultiModeRoutes {
  walking: RouteResult;
  driving: RouteResult;
  bicycling: RouteResult;
}

// Client-side cache keyed by `${propertyId}:${campusId}`
const clientRouteCache = new Map<string, { routes: PropertyMultiModeRoutes; timestamp: number }>();

export function getCachedRoutes(propertyId: string, campusId: string): PropertyMultiModeRoutes | null {
  const key = `${propertyId}:${campusId}`;
  const entry = clientRouteCache.get(key);
  if (entry && (Date.now() - entry.timestamp < 15 * 60 * 1000)) {
    return entry.routes;
  }
  return null;
}

export function computeLocalFallbackRoutes(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): PropertyMultiModeRoutes {
  const straightKm = calculateHaversineDistanceKm(originLat, originLng, destLat, destLng);
  const nowIso = new Date().toISOString();

  // Route distances with road tortuosity
  const walkKm = Math.round(straightKm * 1.2 * 10) / 10;
  const driveKm = Math.round(straightKm * 1.3 * 10) / 10;
  const bikeKm = Math.round(straightKm * 1.25 * 10) / 10;

  // Durations
  const walkMin = Math.max(1, Math.round((walkKm / 4.8) * 60));
  const driveMin = Math.max(1, Math.round((driveKm / 32) * 60));
  const bikeMin = Math.max(1, Math.round((bikeKm / 15) * 60));

  const isWalkAvailable = walkKm <= 15;

  return {
    walking: {
      mode: 'walking',
      distanceKm: walkKm,
      durationMinutes: walkMin,
      distanceMeters: Math.round(walkKm * 1000),
      durationSeconds: walkMin * 60,
      isAvailable: isWalkAvailable,
      reason: !isWalkAvailable ? 'Distance too far for walking' : undefined,
      source: 'route_calculation',
      retrievedAt: nowIso
    },
    driving: {
      mode: 'driving',
      distanceKm: driveKm,
      durationMinutes: driveMin,
      distanceMeters: Math.round(driveKm * 1000),
      durationSeconds: driveMin * 60,
      isAvailable: true,
      source: 'route_calculation',
      retrievedAt: nowIso
    },
    bicycling: {
      mode: 'bicycling',
      distanceKm: bikeKm,
      durationMinutes: bikeMin,
      distanceMeters: Math.round(bikeKm * 1000),
      durationSeconds: bikeMin * 60,
      isAvailable: true,
      source: 'route_calculation',
      retrievedAt: nowIso
    }
  };
}

export async function fetchPropertyRoutes(
  propertyId: string,
  originLat: number,
  originLng: number,
  campusId: string,
  destLat: number,
  destLng: number
): Promise<PropertyMultiModeRoutes> {
  const key = `${propertyId}:${campusId}`;
  const cached = getCachedRoutes(propertyId, campusId);
  if (cached) return cached;

  try {
    const response = await fetch('/api/routes-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: propertyId, originLat, originLng, destLat, destLng }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.routes?.[propertyId]) {
        const routes = data.routes[propertyId] as PropertyMultiModeRoutes;
        clientRouteCache.set(key, { routes, timestamp: Date.now() });
        return routes;
      }
    }
  } catch (err) {
    // Graceful fallback to client-side network route engine
  }

  const fallback = computeLocalFallbackRoutes(originLat, originLng, destLat, destLng);
  clientRouteCache.set(key, { routes: fallback, timestamp: Date.now() });
  return fallback;
}

export async function fetchBatchPropertyRoutes(
  campusId: string,
  destLat: number,
  destLng: number,
  properties: Array<{ id: string; lat: number; lng: number }>
): Promise<Record<string, PropertyMultiModeRoutes>> {
  const missingItems: Array<{ id: string; originLat: number; originLng: number; destLat: number; destLng: number }> = [];
  const results: Record<string, PropertyMultiModeRoutes> = {};

  for (const prop of properties) {
    const cached = getCachedRoutes(prop.id, campusId);
    if (cached) {
      results[prop.id] = cached;
    } else {
      missingItems.push({
        id: prop.id,
        originLat: prop.lat,
        originLng: prop.lng,
        destLat,
        destLng
      });
    }
  }

  if (missingItems.length > 0) {
    try {
      const response = await fetch('/api/routes-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: missingItems })
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.routes) {
          Object.entries(data.routes).forEach(([propId, routeData]) => {
            const routes = routeData as PropertyMultiModeRoutes;
            clientRouteCache.set(`${propId}:${campusId}`, { routes, timestamp: Date.now() });
            results[propId] = routes;
          });
        }
      }
    } catch (err) {
      // Fallback
    }

    // Fill any missing with local compute
    missingItems.forEach(item => {
      if (!results[item.id]) {
        const fallback = computeLocalFallbackRoutes(item.originLat, item.originLng, destLat, destLng);
        clientRouteCache.set(`${item.id}:${campusId}`, { routes: fallback, timestamp: Date.now() });
        results[item.id] = fallback;
      }
    });
  }

  return results;
}

export function formatTimeAgo(isoTimestamp: string): string {
  if (!isoTimestamp) return 'Just now';
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 30) return 'Just now';
  if (diffSec < 60) return '30 sec ago';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return '1 min ago';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ago`;
}
