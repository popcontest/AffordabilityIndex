'use client';

import { useState } from 'react';
import { US_STATES } from '@/lib/usStates';

export type SortOption = 'name' | 'ratio-asc' | 'ratio-desc' | 'income' | 'price';
export type AffordabilityFilter = 'all' | 'very-affordable' | 'affordable' | 'moderate' | 'challenging' | 'very-challenging';

interface FilterBarProps {
  onStateFilter?: (state: string) => void;
  onAffordabilityFilter?: (level: AffordabilityFilter) => void;
  onSort?: (sort: SortOption) => void;
  className?: string;
}

/**
 * Interactive filter and sort bar for rankings
 *
 * Allows users to:
 * - Filter by state
 * - Filter by affordability level
 * - Sort by various criteria
 */
export function FilterBar({
  onStateFilter,
  onAffordabilityFilter,
  onSort,
  className = '',
}: FilterBarProps) {
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<AffordabilityFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('ratio-asc');
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setIsStateDropdownOpen(false);
    onStateFilter?.(state);
  };

  const handleLevelChange = (level: AffordabilityFilter) => {
    setSelectedLevel(level);
    onAffordabilityFilter?.(level);
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    onSort?.(sort);
  };

  const affordabilityLevels: { value: AffordabilityFilter; label: string; color: string }[] = [
    { value: 'all', label: 'All Levels', color: 'text-gray-700' },
    { value: 'very-affordable', label: 'Very Affordable', color: 'text-emerald-700' },
    { value: 'affordable', label: 'Affordable', color: 'text-green-700' },
    { value: 'moderate', label: 'Moderate', color: 'text-amber-700' },
    { value: 'challenging', label: 'Challenging', color: 'text-orange-700' },
    { value: 'very-challenging', label: 'Very Challenging', color: 'text-red-700' },
  ];

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* State Filter */}
        <div className="relative">
          <label id="state-filter-label" className="block text-xs font-semibold text-gray-700 mb-1.5">
            Filter by State
          </label>
          <div className="relative">
            <button
              onClick={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
              aria-expanded={isStateDropdownOpen}
              aria-haspopup="listbox"
              aria-labelledby="state-filter-label"
              className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-lg hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
            >
              <span className={selectedState === 'all' ? 'text-gray-500' : 'text-gray-900'}>
                {selectedState === 'all' ? 'All States' : US_STATES.find(s => s.abbr === selectedState)?.name || selectedState}
              </span>
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isStateDropdownOpen && (
              <div role="listbox" aria-labelledby="state-filter-label" className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <button
                  onClick={() => handleStateChange('all')}
                  role="option"
                  aria-selected={selectedState === 'all'}
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${selectedState === 'all' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-900'}`}
                >
                  All States
                </button>
                {US_STATES.map((state) => (
                  <button
                    key={state.abbr}
                    onClick={() => handleStateChange(state.abbr)}
                    role="option"
                    aria-selected={selectedState === state.abbr}
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${selectedState === state.abbr ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-900'}`}
                  >
                    {state.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Affordability Level Filter */}
        <div>
          <label htmlFor="affordability-level-select" className="block text-xs font-semibold text-gray-700 mb-1.5">
            Affordability Level
          </label>
          <select
            id="affordability-level-select"
            value={selectedLevel}
            onChange={(e) => handleLevelChange(e.target.value as AffordabilityFilter)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
          >
            {affordabilityLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label htmlFor="sort-by-select" className="block text-xs font-semibold text-gray-700 mb-1.5">
            Sort By
          </label>
          <select
            id="sort-by-select"
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as SortOption)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
          >
            <option value="ratio-asc">Most Affordable First</option>
            <option value="ratio-desc">Least Affordable First</option>
            <option value="name">Name (A-Z)</option>
            <option value="income">Income (High-Low)</option>
            <option value="price">Home Price (High-Low)</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {(selectedState !== 'all' || selectedLevel !== 'all') && (
        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-600">Active filters:</span>
          {selectedState !== 'all' && (
            <button
              onClick={() => handleStateChange('all')}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition"
            >
              {US_STATES.find(s => s.abbr === selectedState)?.name}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {selectedLevel !== 'all' && (
            <button
              onClick={() => handleLevelChange('all')}
              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium hover:bg-purple-200 transition"
            >
              {affordabilityLevels.find(l => l.value === selectedLevel)?.label}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button
            onClick={() => {
              handleStateChange('all');
              handleLevelChange('all');
            }}
            className="text-xs text-gray-600 hover:text-gray-900 underline ml-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
