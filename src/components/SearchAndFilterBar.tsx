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
  Building2,
  Navigation
} from 'lucide-react';
import { University, PropertyType, SearchFilters } from '../types';
import { CampusSelector } from './CampusSelector';
import { getDefaultCampusForUniversity } from '../data/campuses';

interface SearchAndFilterBarProps {
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  universities: University[];
  viewMode: 'grid' | 'map';
  setViewMode: (mode: 'grid' | 'map') => void;
  totalResults: number;
  onSelectNonUniosun?: (uniId: string) => void;
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
  totalResults,
  onSelectNonUniosun
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
    const defaultUniId = universities[0]?.id || 'unilag';
    const defaultCamp = getDefaultCampusForUniversity(defaultUniId, universities);
    setFilters({
      universityId: defaultUniId,
      selectedCampusId: defaultCamp.id,
      maxDistanceKm: 0,
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
    <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 sticky top-16 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">

        {/* Main Search Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
          
          {/* Left inputs */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            
            {/* University / Institution Selector */}
            <div className="relative flex-1 min-w-[210px]" data-tour="university-filter">
              <div className="flex items-center gap-2.5 px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800/90 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 focus-within:border-emerald-600 dark:focus-within:border-emerald-500 transition-colors">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400 dark:text-neutral-500 -mb-0.5 leading-none">
                    University
                  </span>
                  <select
                    value={filters.universityId}
                    onChange={(e) => {
                      const newUniId = e.target.value;
                      if (newUniId !== 'uniosun' && onSelectNonUniosun) {
                        onSelectNonUniosun(newUniId);
                        return;
                      }
                      const defaultCamp = getDefaultCampusForUniversity(newUniId, universities);
                      setFilters(prev => ({ 
                        ...prev, 
                        universityId: newUniId,
                        selectedCampusId: defaultCamp.id
                      }));
                    }}
                    className="bg-transparent text-xs font-bold text-neutral-900 dark:text-white focus:outline-none w-full cursor-pointer truncate"
                  >
                    {Object.entries(
                      filteredUniversities.reduce((acc, u) => {
                        const st = u.state || 'Other State';
                        if (!acc[st]) acc[st] = [];
                        acc[st].push(u);
                        return acc;
                      }, {} as Record<string, University[]>)
                    ).map(([stateName, unis]) => (
                      <optgroup key={stateName} label={`📍 ${stateName}`} className="dark:bg-neutral-900">
                        {(unis as University[]).map(u => (
                          <option key={u.id} value={u.id} className="dark:bg-neutral-900">
                            {u.name} ({u.city}) {u.id !== 'uniosun' ? '• Coming Soon' : '• LIVE'}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Campus Selector Component */}
            <div className="relative flex-1 min-w-[210px]">
              <CampusSelector
                universityId={filters.universityId}
                selectedCampusId={filters.selectedCampusId}
                onSelectCampus={(campusId) => setFilters(prev => ({ ...prev, selectedCampusId: campusId }))}
                universities={universities}
              />
            </div>

            {/* Budget Filter Dropdown */}
            <div className="relative flex-1 min-w-[170px]" data-tour="budget-distance-filters">
              <div className="flex items-center gap-2 px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800/90 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 focus-within:border-emerald-600 dark:focus-within:border-emerald-500 transition-colors">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400 dark:text-neutral-500 -mb-0.5 leading-none">
                    Max Budget
                  </span>
                  <select
                    value={filters.maxPrice || 0}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
                    className="bg-transparent text-xs font-bold text-neutral-900 dark:text-white focus:outline-none w-full cursor-pointer truncate"
                    aria-label="Select Maximum Rent Budget"
                  >
                    <option value={0} className="dark:bg-neutral-900">Any Budget</option>
                    <option value={250000} className="dark:bg-neutral-900">Under ₦250,000 /yr</option>
                    <option value={350000} className="dark:bg-neutral-900">Under ₦350,000 /yr</option>
                    <option value={500000} className="dark:bg-neutral-900">Under ₦500,000 /yr</option>
                    <option value={750000} className="dark:bg-neutral-900">Under ₦750,000 /yr</option>
                    <option value={1000000} className="dark:bg-neutral-900">Under ₦1,000,000 /yr</option>
                    <option value={1500000} className="dark:bg-neutral-900">Under ₦1,500,000 /yr</option>
                    <option value={2000000} className="dark:bg-neutral-900">Under ₦2,000,000 /yr</option>
                  </select>
                </div>
              </div>
            </div>

            {/* More Filters Toggle */}
            <button
              data-tour="property-filters"
              onClick={() => setExpandedDrawer(!expandedDrawer)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer shrink-0 ${
                expandedDrawer || filters.propertyTypes.length > 0 || filters.facilities.length > 0
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600'
                  : 'bg-neutral-50 dark:bg-neutral-800/90 text-neutral-700 dark:text-neutral-200 border-neutral-200/80 dark:border-neutral-700/80 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {(filters.propertyTypes.length + filters.facilities.length) > 0 && (
                <span className="bg-emerald-600 dark:bg-white dark:text-neutral-900 text-white text-[10px] font-black w-4 h-4 rounded-md flex items-center justify-center">
                  {filters.propertyTypes.length + filters.facilities.length}
                </span>
              )}
            </button>

          </div>

          {/* Right controls: View Toggle & Sort */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-100 dark:border-neutral-800 shrink-0">
            
            {/* Sort selector */}
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              className="text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-800/90 border border-neutral-200/80 dark:border-neutral-700/80 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
            >
              <option value="distance" className="dark:bg-neutral-900">Closest to Campus</option>
              <option value="price_asc" className="dark:bg-neutral-900">Price: Low to High</option>
              <option value="price_desc" className="dark:bg-neutral-900">Price: High to Low</option>
              <option value="rating" className="dark:bg-neutral-900">Highest Rated</option>
            </select>

            {/* View Switcher: Grid vs Interactive Map */}
            <div className="flex items-center bg-neutral-50 dark:bg-neutral-800/90 p-1 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 shadow-2xs' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'map' ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-2xs' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
                title="Interactive Map View"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Map</span>
              </button>
            </div>

          </div>

        </div>

        {/* Expanded Filters Drawer */}
        {expandedDrawer && (
          <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 animate-in fade-in space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              
              {/* Campus Distance Filter */}
              <div>
                <label className="text-[11px] font-extrabold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-2">
                  Campus Distance Radius
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Any Distance', value: 0 },
                    { label: 'Within 1 km', value: 1 },
                    { label: 'Within 3 km', value: 3 },
                    { label: 'Within 5 km', value: 5 },
                    { label: 'Within 10 km', value: 10 },
                    { label: 'Within 25 km', value: 25 }
                  ].map(dist => (
                    <button
                      key={dist.value}
                      onClick={() => setFilters(prev => ({ ...prev, maxDistanceKm: dist.value }))}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        (filters.maxDistanceKm || 0) === dist.value
                          ? 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-600 dark:border-emerald-600'
                          : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      {dist.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Institution Type */}
              <div>
                <label className="text-[11px] font-extrabold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-2">
                  Institution Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {INSTITUTION_TYPES.map(type => (
                    <button
                      key={type.key}
                      onClick={() => {
                        setFilters(prev => ({ ...prev, institutionType: type.key }));
                        const matching = universities.filter(u => type.key === 'all' || u.type === type.key);
                        if (matching.length > 0 && !matching.some(m => m.id === filters.universityId)) {
                          setFilters(prev => ({ ...prev, universityId: matching[0].id }));
                        }
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        (filters.institutionType || 'all') === type.key
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600'
                          : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Property Types */}
              <div>
                <label className="text-[11px] font-extrabold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-2">
                  Housing Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PROPERTY_TYPES.map(t => (
                    <button
                      key={t.key}
                      onClick={() => togglePropertyType(t.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        filters.propertyTypes.includes(t.key)
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600'
                          : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferences */}
              <div>
                <label className="text-[11px] font-extrabold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-2">
                  Lodge Features
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-neutral-800 dark:text-neutral-200 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={filters.billsIncludedOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, billsIncludedOnly: e.target.checked }))}
                      className="rounded text-emerald-600 focus:ring-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    24/7 Power or Solar Inverter Guaranteed
                  </label>
                  
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Gender Preference:</span>
                    {['all', 'female_only', 'male_only'].map(g => (
                      <button
                        key={g}
                        onClick={() => setFilters(prev => ({ ...prev, genderPreference: g }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize cursor-pointer ${
                          filters.genderPreference === g
                            ? 'bg-slate-900 text-white dark:bg-emerald-600'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
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
                <label className="text-[11px] font-extrabold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-2">
                  Amenities & Facilities
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {NIGERIAN_FACILITIES.map(fac => (
                    <button
                      key={fac}
                      onClick={() => toggleFacility(fac)}
                      className={`text-left text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border transition-colors flex items-center justify-between cursor-pointer ${
                        filters.facilities.includes(fac)
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600'
                          : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                      }`}
                    >
                      <span className="truncate">{fac}</span>
                      {filters.facilities.includes(fac) && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer Row */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
              <button
                onClick={resetFilters}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset all filters
              </button>

              <button
                onClick={() => setExpandedDrawer(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-2xs hover:bg-slate-800 dark:hover:bg-emerald-500 transition-all cursor-pointer"
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
