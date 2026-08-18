import { Campus } from '../types';

export function calculateHaversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 0;
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

export interface PropertyCampusDistance {
  distanceKm: number;
  isWalkable: boolean;
  walkingMinutes: number;
  drivingMinutes: number;
  badgeText: string;
  detailText: string;
  campusName: string;
  campusShortName: string;
  transportIcon: 'walk' | 'drive' | 'location';
}

export function getPropertyDistanceToCampus(
  propertyLat: number,
  propertyLng: number,
  campus: Campus,
  overrideWalkMin?: number
): PropertyCampusDistance {
  const distanceKm = calculateHaversineDistanceKm(propertyLat, propertyLng, campus.lat, campus.lng);
  
  // Walkable threshold: <= 1.5 km
  const isWalkable = distanceKm <= 1.5;

  // Average walking speed: ~4.8 km/h => 12.5 mins per km
  const estimatedWalkMin = Math.max(2, Math.round(distanceKm * 12.5));
  const walkingMinutes = (isWalkable && overrideWalkMin && overrideWalkMin > 0)
    ? overrideWalkMin
    : estimatedWalkMin;

  // Average driving speed: ~35-40 km/h in local town/traffic (~1.8 min per km)
  const drivingMinutes = Math.max(3, Math.round(distanceKm * 1.8));

  const campusDisplayName = campus.name || `${campus.city} Campus`;
  const campusShortName = campus.shortName || campus.name;

  if (isWalkable) {
    return {
      distanceKm,
      isWalkable: true,
      walkingMinutes,
      drivingMinutes,
      badgeText: `🚶 ${walkingMinutes} min walk to ${campusShortName}`,
      detailText: `🚶 ${walkingMinutes} min walk (${distanceKm} km) to ${campusDisplayName}`,
      campusName: campusDisplayName,
      campusShortName,
      transportIcon: 'walk'
    };
  } else if (distanceKm <= 12) {
    return {
      distanceKm,
      isWalkable: false,
      walkingMinutes,
      drivingMinutes,
      badgeText: `🚗 ${drivingMinutes} min drive (${distanceKm} km) to ${campusShortName}`,
      detailText: `🚗 ${drivingMinutes} min drive (${distanceKm} km) to ${campusDisplayName}`,
      campusName: campusDisplayName,
      campusShortName,
      transportIcon: 'drive'
    };
  } else {
    return {
      distanceKm,
      isWalkable: false,
      walkingMinutes,
      drivingMinutes,
      badgeText: `📍 ${distanceKm} km from ${campusShortName}`,
      detailText: `📍 ${distanceKm} km away from ${campusDisplayName}`,
      campusName: campusDisplayName,
      campusShortName,
      transportIcon: 'location'
    };
  }
}
