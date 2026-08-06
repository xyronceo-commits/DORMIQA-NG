import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  SlidersHorizontal, 
  Footprints, 
  Map as MapIcon, 
  LayoutGrid, 
  X, 
  Check, 
  RotateCcw,
  GraduationCap,
  Building2
} from 'lucide-react';
import { University, PropertyType, SearchFilters } from '../types';

interface SearchAndFilterBarProps {
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  universities: University[];
  viewMode: 'grid' | 'map';
  setViewMode: (mode: 'grid' | 'map') => void;
  totalResults: number;
}

const PROPERTY_TYPES: { key: PropertyType; label: string }[] = [
  { key: 'self_contain', label: 'Self-Contain Studio' },
  { key: 'single_room', label: 'Single Room' },
  { key: 'one_bedroom', label: '1 Bedroom Flat' },
  { key: 'shared_flat', label: 'Shared Flat' },
  { key: 'bedspace', label: 'Bedspace Share' },
  { key: 'studio', label: 'Private Lodge' }
];

const INSTITUTION_TYPES = [
  { key: 'all', label: 'All Institutions' },
  { key: 'federal', label: 'Federal Uni' },
  { key: 'state', label: 'State Uni' },
  { key: 'private', label: 'Private Uni' },
  { key: 'polytechnic', label: 'Polytechnics' }
];

const NIGERIAN_FACILITIES = [
  '24/7 Solar / Inverter Light',
  'Borehole Water Supply',
  'Gated Compound & Security Guard',
  'Prepaid Electricity Meter',
  'Ensuite Bathroom',
  'Private Kitchenette',
  'Reading Desk & Wardrobe',
  'High-Speed Wi-Fi',
  'Resident Caretaker'
];

export const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  filters,
  setFilters,
  universities,
  viewMode,
  setViewMode,
  totalResults
}) => {
  const [expandedDrawer, setExpandedDrawer] = useState(false);

  // Filter universities based on institution type filter
  const filteredUniversities = universities.filter(u => {
    if (!filters.institutionType || filters.institutionType === 'all') return true;
    return u.type === filters.institutionType;
  });

  const selectedUni = universities.find(u => u.id === filters.universityId);

  const togglePropertyType = (type: PropertyType) => {
    setFilters(prev => {
      const exists = prev.propertyTypes.includes(type);
      return {
        ...prev,
        propertyTypes: exists 
          ? prev.propertyTypes.filter(t => t !== type)
          : [...prev.propertyTypes, type]
      };
    });
  };

  const toggleFacility = (facility: string) => {
    setFilters(prev => {
      const exists = prev.facilities.includes(facility);
      return {
        ...prev,
        facilities: exists
          ? prev.facilities.filter(f => f !== facility)
          : [...prev.facilities, facility]
      };
    });
  };

  const resetFilters = () => {
    setFilters({
      universityId: universities[0]?.id || 'unilag',
      institutionType: 'all',
      stateFilter: 'all',
      minPrice: 0,
      maxPrice: 1000000,
      propertyTypes: [],
      facilities: [],
      maxWalkingMinutes: 20,
      genderPreference: 'all',
      billsIncludedOnly: false,
      sortBy: 'distance'
    });
  };

  return (
    <div className="bg-white border-b border-neutral-200 sticky top-16 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        
        {/* Top Institution Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-2 border-b border-neutral-100">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <GraduationCap className="w-3.5 h-3.5 text-neutral-600" /> Type:
          </span>
          {INSTITUTION_TYPES.map(type => (
            <button
              key={type.key}
              onClick={() => {
                setFilters(prev => ({ ...prev, institutionType: type.key }));
                // Auto reset selected university if not in the new filtered list
                const matching = universities.filter(u => type.key === 'all' || u.type === type.key);
                if (matching.length > 0 && !matching.some(m => m.id === filters.universityId)) {
                  setFilters(prev => ({ ...prev, universityId: matching[0].id }));
                }
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                (filters.institutionType || 'all') === type.key
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Main Search Row */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          
          {/* Left inputs */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            
            {/* University / Institution Selector */}
            <div className="relative flex-1 min-w-[220px]">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 rounded-md border border-neutral-200 focus-within:border-neutral-900 transition-colors">
                <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <select
                  value={filters.universityId}
                  onChange={(e) => setFilters(prev => ({ ...prev, universityId: e.target.value }))}
                  className="bg-transparent text-xs font-semibold text-neutral-900 focus:outline-none w-full cursor-pointer"
                >
                  {Object.entries(
                    filteredUniversities.reduce((acc, u) => {
                      const st = u.state || 'Other State';
                      if (!acc[st]) acc[st] = [];
                      acc[st].push(u);
                      return acc;
                    }, {} as Record<string, University[]>)
                  ).map(([stateName, unis]) => (
                    <optgroup key={stateName} label={`📍 ${stateName}`}>
                      {(unis as University[]).map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.city})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {/* Walking Distance Quick Pills */}
            <div className="hidden sm:flex items-center gap-1 bg-neutral-50 p-1 rounded-md border border-neutral-200">
              <span className="text-[10px] font-bold text-neutral-400 px-2 uppercase tracking-wider flex items-center gap-1">
                <Footprints className="w-3 h-3 text-neutral-500" /> Walk:
              </span>
              {[3, 5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setFilters(prev => ({ ...prev, maxWalkingMinutes: mins }))}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                    filters.maxWalkingMinutes === mins
                      ? 'bg-black text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  &lt;{mins}m
                </button>
              ))}
            </div>

            {/* Max Budget Input in NGN (Naira) */}
            <div className="flex items-center gap-1 px-3 py-1.5 bg-neutral-50 rounded-md border border-neutral-200 w-44">
              <span className="text-xs font-medium text-neutral-500">Max ₦</span>
              <input
                type="number"
                placeholder="500,000"
                value={filters.maxPrice || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: Number(e.target.value) || 0 }))}
                className="w-full text-xs font-semibold text-neutral-900 bg-transparent focus:outline-none"
              />
              <span className="text-[10px] text-neutral-400 font-medium">/yr</span>
            </div>

            {/* More Filters Toggle */}
            <button
              onClick={() => setExpandedDrawer(!expandedDrawer)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                expandedDrawer || filters.propertyTypes.length > 0 || filters.facilities.length > 0
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {(filters.propertyTypes.length + filters.facilities.length) > 0 && (
                <span className="bg-emerald-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {filters.propertyTypes.length + filters.facilities.length}
                </span>
              )}
            </button>

          </div>

          {/* Right controls: View Toggle & Sort */}
          <div className="flex items-center justify-between w-full lg:w-auto gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-100">
            
            <p className="text-xs text-neutral-500">
              <strong className="text-neutral-900 font-bold">{totalResults}</strong> properties near {selectedUni?.code || 'campus'}
            </p>

            <div className="flex items-center gap-2">
              {/* Sort selector */}
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                className="text-xs font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-md px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="distance">Sort: Closest to Gate</option>
                <option value="price_asc">Sort: Rent Low to High</option>
                <option value="price_desc">Sort: Rent High to Low</option>
                <option value="rating">Sort: Highest Rated</option>
              </select>

              {/* View Switcher: Grid vs Interactive Map */}
              <div className="flex items-center bg-neutral-50 p-1 rounded-md border border-neutral-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all ${
                    viewMode === 'grid' ? 'bg-white text-neutral-900 border border-neutral-200 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                  title="Grid Cards View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all ${
                    viewMode === 'map' ? 'bg-black text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                  title="Interactive Map View"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Expanded Filters Drawer */}
        {expandedDrawer && (
          <div className="mt-3 pt-3 border-t border-neutral-200 animate-in fade-in space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Property Types */}
              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">
                  Housing Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PROPERTY_TYPES.map(t => (
                    <button
                      key={t.key}
                      onClick={() => togglePropertyType(t.key)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                        filters.propertyTypes.includes(t.key)
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferences */}
              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">
                  Lodge Features
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.billsIncludedOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, billsIncludedOnly: e.target.checked }))}
                      className="rounded text-neutral-900 focus:ring-neutral-900 w-4 h-4"
                    />
                    24/7 Power or Solar Inverter Guaranteed
                  </label>
                  
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-neutral-500 font-medium">Gender Preference:</span>
                    {['all', 'female_only', 'male_only'].map(g => (
                      <button
                        key={g}
                        onClick={() => setFilters(prev => ({ ...prev, genderPreference: g }))}
                        className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                          filters.genderPreference === g
                            ? 'bg-black text-white'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        {g === 'all' ? 'Any' : g.replace('_only', ' only')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Facilities */}
              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">
                  Amenities & Facilities
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {NIGERIAN_FACILITIES.map(fac => (
                    <button
                      key={fac}
                      onClick={() => toggleFacility(fac)}
                      className={`text-left text-[11px] font-medium px-2 py-1 rounded border transition-colors flex items-center justify-between ${
                        filters.facilities.includes(fac)
                          ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="truncate">{fac}</span>
                      {filters.facilities.includes(fac) && <Check className="w-3 h-3 text-white shrink-0 ml-1" />}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer Row */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs">
              <button
                onClick={resetFilters}
                className="text-neutral-500 hover:text-neutral-900 font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset all filters
              </button>

              <button
                onClick={() => setExpandedDrawer(false)}
                className="px-4 py-1.5 bg-black text-white rounded-md font-semibold text-xs"
              >
                Apply Filters ({totalResults} properties)
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
