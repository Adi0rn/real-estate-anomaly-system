"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import SearchFilters from "@/components/SearchFilters";
import PropertyCard from "@/components/PropertyCard";
import PropertyDetailModal from "@/components/PropertyDetailModal";
import DatabaseNotice from "@/components/DatabaseNotice";
import { Property, SearchResult, FilterState } from "@/types";

const initialFilters: FilterState = {
  city: "",
  propertyType: "",
  listingType: "",
  minPrice: "",
  maxPrice: "",
  bedrooms: "",
};

export default function Home() {
  const [activeMode, setActiveMode] = useState<"explore" | "semantic">("explore");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Data states
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // UI / Status states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  // Fetch properties using standard API filters
  const fetchProperties = useCallback(async (currentFilters = filters) => {
    try {
      const params = new URLSearchParams();
      if (currentFilters.city.trim()) params.append("city", currentFilters.city.trim());
      if (currentFilters.propertyType) params.append("propertyType", currentFilters.propertyType);
      if (currentFilters.listingType) params.append("listingType", currentFilters.listingType);
      if (currentFilters.minPrice) params.append("minPrice", currentFilters.minPrice);
      if (currentFilters.maxPrice) params.append("maxPrice", currentFilters.maxPrice);
      if (currentFilters.bedrooms) params.append("bedrooms", currentFilters.bedrooms);

      const url = `/api/properties${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsDbConnected(false);
        throw new Error(data.error || "Failed to retrieve properties from the server.");
      }

      setIsDbConnected(true);
      setProperties(data.properties || []);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred while fetching properties";
      setError(message);
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Fetch semantic search using /api/search (only supported filters: city, propertyType, minPrice, maxPrice, bedrooms)
  const executeSemanticSearch = useCallback(async (queryText: string, currentFilters = filters) => {
    if (!queryText.trim()) {
      setActiveMode("explore");
      return fetchProperties(currentFilters);
    }

    try {
      const params = new URLSearchParams();
      params.append("q", queryText.trim());
      if (currentFilters.city.trim()) params.append("city", currentFilters.city.trim());
      if (currentFilters.propertyType) params.append("propertyType", currentFilters.propertyType);
      if (currentFilters.minPrice) params.append("minPrice", currentFilters.minPrice);
      if (currentFilters.maxPrice) params.append("maxPrice", currentFilters.maxPrice);
      if (currentFilters.bedrooms) params.append("bedrooms", currentFilters.bedrooms);

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsDbConnected(false);
        throw new Error(data.error || "Semantic vector search failed.");
      }

      setIsDbConnected(true);
      setSearchResults(data.results || []);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Semantic search failed";
      setError(message);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchProperties, filters]);

  // Initial load
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const res = await fetch("/api/properties");
        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.success) {
          setProperties(data.properties || []);
          setIsDbConnected(true);
          setError(null);
        } else {
          setIsDbConnected(false);
          setError(data.error || "Failed to retrieve properties from the server.");
        }
      } catch (err: unknown) {
        if (isMounted) {
          setIsDbConnected(false);
          setError(err instanceof Error ? err.message : "Network error");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handler for search form submission
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    if (activeMode === "semantic" || searchQuery.trim().length > 0) {
      setActiveMode("semantic");
      executeSemanticSearch(searchQuery);
    } else {
      fetchProperties();
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setFilters(initialFilters);
    setSearchResults([]);
    setActiveMode("explore");
    setIsLoading(true);
    fetchProperties(initialFilters);
  };

  // Toggle mode
  const handleToggleMode = (semantic: boolean) => {
    const nextMode = semantic ? "semantic" : "explore";
    setActiveMode(nextMode);
    setError(null);
    setIsLoading(true);

    if (nextMode === "semantic" && searchQuery.trim()) {
      executeSemanticSearch(searchQuery);
    } else {
      fetchProperties();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
      {/* Header & Navigation */}
      <Navbar
        isDbConnected={isDbConnected}
        activeSection={activeMode}
        onSectionSelect={(section) => {
          handleToggleMode(section === "semantic");
          const el = document.getElementById(section === "semantic" ? "semantic" : "browse");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 space-y-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-indigo-950 to-zinc-900 px-6 py-12 sm:px-12 sm:py-16 text-white shadow-xl">
          <div className="absolute right-0 top-0 -mt-16 -mr-16 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 -mb-16 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md border border-white/10 text-indigo-200 mb-4">
              <span>🛡️</span> Real-Estate Valuation & Anomaly Detection System
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Discover Verified Homes. <br />
              <span className="bg-gradient-to-r from-indigo-300 via-violet-200 to-indigo-100 bg-clip-text text-transparent">
                Flag Statistical Pricing Outliers.
              </span>
            </h1>

            <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl">
              Query properties using natural language semantic similarity or structured local filters. Every listing is audited against comparable local market valuation to detect anomalies.
            </p>

            {/* Hero Quick Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-8 flex flex-col sm:flex-row gap-2.5 max-w-2xl bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/15"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find a peaceful 3-bedroom villa near parks in Bangalore..."
                  className="w-full rounded-xl bg-white/90 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-400 dark:bg-zinc-800/90 dark:text-zinc-50 dark:placeholder:text-zinc-400"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors shrink-0 flex items-center justify-center gap-2"
              >
                <span>✨</span>
                <span>Search</span>
              </button>
            </form>
          </div>
        </section>

        {/* Database Offline Notice */}
        {isDbConnected === false && (
          <DatabaseNotice
            errorMessage={error || undefined}
            onRetry={() => {
              setIsLoading(true);
              fetchProperties();
            }}
            isRetrying={isLoading}
          />
        )}

        {/* Search & Filter Controls Section */}
        <section id="semantic" className="scroll-mt-24">
          <SearchFilters
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            filters={filters}
            onFilterChange={setFilters}
            onSearchSubmit={handleSearchSubmit}
            onResetFilters={handleResetFilters}
            isSemanticMode={activeMode === "semantic"}
            onToggleMode={handleToggleMode}
            isLoading={isLoading}
          />
        </section>

        {/* Properties Browsing Section */}
        <section id="browse" className="scroll-mt-24 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <span>{activeMode === "semantic" ? "✨ AI Semantic Matches" : "🏠 Available Properties"}</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {activeMode === "semantic"
                  ? `${searchResults.length} property matches ordered by 384-dimensional cosine similarity`
                  : `${properties.length} active listings matching current filters`}
              </p>
            </div>

            {activeMode === "semantic" && (
              <button
                type="button"
                onClick={() => handleToggleMode(false)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline self-start sm:self-auto"
              >
                Switch to Standard Browsing →
              </button>
            )}
          </div>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex justify-between mb-4">
                    <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                  <div className="h-6 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800 mb-2" />
                  <div className="h-4 w-1/2 rounded bg-zinc-100 dark:bg-zinc-850 mb-8" />
                  <div className="h-12 w-full rounded bg-zinc-100 dark:bg-zinc-850" />
                </div>
              ))}
            </div>
          )}

          {/* Listings Grid */}
          {!isLoading && (
            <>
              {activeMode === "semantic" ? (
                searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {searchResults.map((result) => (
                      <PropertyCard
                        key={result.propertyId}
                        property={result}
                        similarity={result.similarity}
                        onQuickView={(id) => setSelectedPropertyId(id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <span className="text-4xl">🔍</span>
                    <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-50">
                      {searchQuery.trim()
                        ? "No semantic matches found"
                        : "Enter a query for semantic search"}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                      {searchQuery.trim()
                        ? "Try adjusting your query description or removing filter constraints."
                        : "Describe the ideal property in plain text above, and the pgvector model will rank listings by semantic relevance."}
                    </p>
                  </div>
                )
              ) : properties.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {properties.map((property) => (
                    <PropertyCard
                      key={property.propertyId}
                      property={property}
                      onQuickView={(id) => setSelectedPropertyId(id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="text-4xl">🏠</span>
                  <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-50">
                    {isDbConnected === false
                      ? "Database Offline"
                      : "No listings match your criteria"}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                    {isDbConnected === false
                      ? "The application requires a PostgreSQL connection string in DATABASE_URL to load real estate records."
                      : "Try loosening your price boundaries, bedroom requirements, or city search filter."}
                  </p>
                  {isDbConnected !== false && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-4 rounded-xl bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* Quick View Modal */}
      <PropertyDetailModal
        propertyId={selectedPropertyId}
        onClose={() => setSelectedPropertyId(null)}
      />
    </div>
  );
}
