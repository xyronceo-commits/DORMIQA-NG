import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Listing, University } from '../types';
import { Footprints, MapPin, ShieldCheck, Heart, Calendar } from 'lucide-react';

interface InteractiveMapViewProps {
  listings: Listing[];
  selectedUniversity: University;
  activeListingId: string | null;
  onSelectListing: (listing: Listing) => void;
  onBookInspection: (listing: Listing) => void;
  savedIds: string[];
  onToggleSave: (listingId: string) => void;
}

export const InteractiveMapView: React.FC<InteractiveMapViewProps> = ({
  listings,
  selectedUniversity,
  activeListingId,
  onSelectListing,
  onBookInspection,
  savedIds,
  onToggleSave
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if not already created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false
      }).setView([selectedUniversity.lat, selectedUniversity.lng], 14);

      // Clean, elegant tile layer (CartoDB Positron for light Google/Apple map style)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19
      }).addTo(map);

      // Add zoom control top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstanceRef.current = map;
    } else {
      // Re-center on university change
      mapInstanceRef.current.setView([selectedUniversity.lat, selectedUniversity.lng], 14);
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    Object.values(markersRef.current).forEach((m: L.Marker) => m.remove());
    markersRef.current = {};

    // Add University Marker
    const uniIcon = L.divIcon({
      className: 'custom-uni-marker-wrapper',
      html: `<div class="campora-uni-pin">🎓 ${selectedUniversity.code} Campus</div>`,
      iconSize: [120, 32],
      iconAnchor: [60, 16]
    });

    L.marker([selectedUniversity.lat, selectedUniversity.lng], { icon: uniIcon })
      .addTo(map)
      .bindPopup(`
        <div class="p-2 font-sans">
          <div class="text-xs font-bold text-slate-900">${selectedUniversity.name}</div>
          <div class="text-[11px] text-slate-500">${selectedUniversity.description}</div>
        </div>
      `);

    // Add Property Markers & Polylines
    listings.forEach(listing => {
      const isSelected = listing.id === activeListingId;

      const markerIcon = L.divIcon({
        className: 'custom-property-marker-wrapper',
        html: `<div class="campora-map-pin ${isSelected ? 'active' : ''}">₦${Math.round((listing.pricePerYear || (listing.pricePerWeek ? listing.pricePerWeek * 52 : 300000)) / 1000)}k/yr</div>`,
        iconSize: [80, 26],
        iconAnchor: [40, 13]
      });

      const marker = L.marker([listing.lat, listing.lng], { icon: markerIcon }).addTo(map);

      marker.on('click', () => {
        onSelectListing(listing);
      });

      markersRef.current[listing.id] = marker;
    });

  }, [listings, selectedUniversity, activeListingId]);

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-neutral-200 shadow-sm bg-neutral-100">
      <div ref={mapContainerRef} className="w-full h-full min-h-[500px]" />
      
      {/* Floating University Info Header */}
      <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-neutral-200 shadow-md flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
        <span className="text-xs font-bold text-neutral-900">
          Center: {selectedUniversity.name}
        </span>
      </div>
    </div>
  );
};
