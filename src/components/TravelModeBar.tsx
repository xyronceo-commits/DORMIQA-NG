import React, { useState, useEffect } from 'react';
import { Campus } from '../types';
import { 
  fetchPropertyRoutes, 
  PropertyMultiModeRoutes, 
  RouteMode, 
  formatTimeAgo 
} from '../services/routeService';
import { Footprints, Car, Bike, Clock, AlertCircle } from 'lucide-react';

interface TravelModeBarProps {
  propertyId: string;
  propertyLat: number;
  propertyLng: number;
  selectedCampus?: Campus;
  compact?: boolean;
  className?: string;
  onModeChange?: (mode: RouteMode) => void;
}

export const TravelModeBar: React.FC<TravelModeBarProps> = ({
  propertyId,
  propertyLat,
  propertyLng,
  selectedCampus,
  compact = true,
  className = '',
  onModeChange
}) => {
  const [routes, setRoutes] = useState<PropertyMultiModeRoutes | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<RouteMode>('walking');
  const [expandedDetails, setExpandedDetails] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedCampus) return;

    let isMounted = true;
    setLoading(true);

    fetchPropertyRoutes(
      propertyId,
      propertyLat,
      propertyLng,
      selectedCampus.id,
      selectedCampus.lat,
      selectedCampus.lng
    ).then((res) => {
      if (isMounted) {
        setRoutes(res);
        setLoading(false);
        // If walking is unavailable for far distance (>15km), auto switch active mode highlight to driving
        if (!res.walking.isAvailable && activeMode === 'walking') {
          setActiveMode('driving');
        }
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [propertyId, propertyLat, propertyLng, selectedCampus?.id, selectedCampus?.lat, selectedCampus?.lng]);

  if (!selectedCampus) {
    return null;
  }

  const handleModeClick = (e: React.MouseEvent, mode: RouteMode) => {
    e.stopPropagation();
    setActiveMode(mode);
    setExpandedDetails(prev => activeMode === mode ? !prev : true);
    if (onModeChange) onModeChange(mode);
  };

  const activeRoute = routes ? routes[activeMode] : null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Three Travel Mode Buttons Bar */}
      <div className="flex items-center gap-1.5 w-full overflow-x-auto no-scrollbar py-0.5">
        
        {/* WALK Button */}
        <button
          type="button"
          onClick={(e) => handleModeClick(e, 'walking')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer shrink-0 ${
            activeMode === 'walking'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-neutral-50 dark:bg-slate-800 text-neutral-700 dark:text-slate-200 border-neutral-200 dark:border-slate-700 hover:border-emerald-500'
          }`}
          title="Walking route"
        >
          <Footprints className="w-3.5 h-3.5 shrink-0" />
          <span>
            {loading ? '...' : routes?.walking.isAvailable ? `${routes.walking.durationMinutes}m` : 'N/A'}
          </span>
        </button>

        {/* CAR / BUS Button */}
        <button
          type="button"
          onClick={(e) => handleModeClick(e, 'driving')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer shrink-0 ${
            activeMode === 'driving'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-neutral-50 dark:bg-slate-800 text-neutral-700 dark:text-slate-200 border-neutral-200 dark:border-slate-700 hover:border-emerald-500'
          }`}
          title="Car/Drive route"
        >
          <Car className="w-3.5 h-3.5 shrink-0" />
          <span>
            {loading ? '...' : routes ? `${routes.driving.durationMinutes}m` : '...'}
          </span>
        </button>

        {/* BIKE Button */}
        <button
          type="button"
          onClick={(e) => handleModeClick(e, 'bicycling')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer shrink-0 ${
            activeMode === 'bicycling'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-neutral-50 dark:bg-slate-800 text-neutral-700 dark:text-slate-200 border-neutral-200 dark:border-slate-700 hover:border-emerald-500'
          }`}
          title="Cycling route"
        >
          <Bike className="w-3.5 h-3.5 shrink-0" />
          <span>
            {loading ? '...' : routes ? `${routes.bicycling.durationMinutes}m` : '...'}
          </span>
        </button>

        {/* Live / Freshness indicator badge */}
        {routes && (
          <span className="ml-auto text-[10px] text-neutral-400 dark:text-slate-500 font-medium flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3 text-emerald-500" />
            <span>Updated {formatTimeAgo(routes[activeMode]?.retrievedAt)}</span>
          </span>
        )}
      </div>

      {/* Expanded Active Mode Info Panel */}
      {activeRoute && (
        <div className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 animate-in fade-in transition-all ${
          activeRoute.isAvailable
            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
        }`}>
          <div className="flex items-center gap-1.5 truncate">
            {activeRoute.mode === 'walking' && <Footprints className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
            {activeRoute.mode === 'driving' && <Car className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
            {activeRoute.mode === 'bicycling' && <Bike className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
            
            <span className="capitalize font-bold">{activeRoute.mode}:</span>

            {activeRoute.isAvailable ? (
              <span className="truncate">
                {activeRoute.distanceKm} km • ≈ {activeRoute.durationMinutes} mins to {selectedCampus.name || selectedCampus.shortName}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-bold">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{activeRoute.distanceKm} km (Walking route unavailable)</span>
              </span>
            )}
          </div>

          <span className="text-[10px] opacity-75 shrink-0 font-medium uppercase">
            {activeRoute.source === 'osrm' ? 'Real Route' : 'Road Route'}
          </span>
        </div>
      )}
    </div>
  );
};
