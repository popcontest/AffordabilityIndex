'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  geoType: string;
  geoId: string;
  label: string;
  state: string | null;
  canonicalUrl: string;
  ratio: number | null;
  homeValue: number | null;
  income: number | null;
  asOfDate: string | null;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  count: number;
}

export function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Perform search
  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`);
        if (response.ok) {
          const data: SearchResponse = await response.json();
          setResults(data.results);
          setIsOpen(data.results.length > 0);
          setSelectedIndex(-1);
        } else {
          setResults([]);
          setIsOpen(false);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300); // Debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle search submission (Enter key or Search button click)
  async function handleSearch() {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) return;

    // Check if query is a 5-digit ZIP code
    if (/^\d{5}$/.test(trimmedQuery)) {
      // Navigate directly to ZIP page
      setIsOpen(false);
      setQuery('');
      router.push(`/zip/${trimmedQuery}/`);
      return;
    }

    // If we already have results loaded and exactly 1 result, navigate to it
    if (results.length === 1) {
      navigateToResult(results[0]);
      return;
    }

    // If we have multiple results, show dropdown (already open from autocomplete)
    if (results.length > 0) {
      setIsOpen(true);
      return;
    }

    // If no results yet, fetch them
    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`);
      if (response.ok) {
        const data: SearchResponse = await response.json();
        if (data.results.length === 1) {
          // Exactly 1 result: navigate directly
          navigateToResult(data.results[0]);
        } else if (data.results.length > 1) {
          // Multiple results: show dropdown
          setResults(data.results);
          setIsOpen(true);
          setSelectedIndex(-1);
        } else {
          // No results: show empty state
          setResults([]);
          setIsOpen(true);
        }
      } else {
        setResults([]);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If dropdown is open and item is selected, navigate to it
      if (isOpen && selectedIndex >= 0 && selectedIndex < results.length) {
        navigateToResult(results[selectedIndex]);
      } else {
        // Otherwise, trigger search
        handleSearch();
      }
      return;
    }

    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }

  function navigateToResult(result: SearchResult) {
    setIsOpen(false);
    setQuery('');
    router.push(result.canonicalUrl);
  }

  return (
    <div ref={searchRef} className="relative w-full" role="search">
      <label htmlFor="search-input" className="sr-only">
        Search by city, state, or ZIP code
      </label>
      {/* Search Input + Button */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            id="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by city, state, or ZIP code..."
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen && results.length > 0}
            aria-controls="search-results-list"
            aria-activedescendant={selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={isLoading || query.trim().length === 0}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          aria-label="Search"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </span>
          ) : (
            'Search'
          )}
        </button>
      </div>

      {/* Loading Skeleton */}
      {isOpen && isLoading && query.trim().length >= 2 && (
        <div
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="px-4 py-3 text-sm text-gray-600">
            Searching...
          </div>
        </div>
      )}

      {/* Results Dropdown */}
      {isOpen && !isLoading && results.length > 0 && (
        <ul
          id="search-results-list"
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          role="listbox"
          aria-label="Search results"
        >
          {results.map((result, index) => (
            <li
              key={`${result.geoType}-${result.geoId}`}
              id={`search-result-${index}`}
              role="option"
              aria-selected={selectedIndex === index}
            >
              <button
                onClick={() => navigateToResult(result)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition ${
                  index === selectedIndex ? 'bg-blue-50' : ''
                }`}
                tabIndex={selectedIndex === index ? 0 : -1}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {result.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {result.geoType === 'ZCTA'
                        ? 'ZIP Code'
                        : result.geoType === 'STATE'
                        ? 'State Overview'
                        : 'City'}
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* No results message */}
      {isOpen && !isLoading && query.trim().length >= 2 && results.length === 0 && (
        <div
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-6 text-center"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-gray-600">
            No results found for &ldquo;{query}&rdquo;
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Try searching for a city name or ZIP code
          </p>
        </div>
      )}
    </div>
  );
}
