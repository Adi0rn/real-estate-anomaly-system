"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import SearchFilters from "@/components/SearchFilters";
import PropertyCard from "@/components/PropertyCard";
import PropertyDetailModal from "@/components/PropertyDetailModal";
import DatabaseNotice from "@/components/DatabaseNotice";
import { Property, SearchResult, FilterState } from "@/types";
import { IconSparkles, IconBuilding } from "@/components/icons";

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

  // Fetch semantic search using /api/search (supported filters: city, propertyType, minPrice, maxPrice, bedrooms)
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
    <div className="min-h-screen bg-[#fbfbfa] text-slate-900">
      {/* Institutional Top Navbar */}
      <Navbar
        isDbConnected={isDbConnected}
        activeSection={activeMode}
        onSectionSelect={(section) => {
          handleToggleMode(section === "semantic");
          const el = document.getElementById(section === "semantic" ? "semantic" : "browse");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        {/* Editorial Page Header */}
        <div className="border-b border-slate-200/90 pb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                <IconBuilding className="w-3.5 h-3.5 text-slate-700" />
                <span>Market Directory & Valuation System</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                Institutional Real Estate Index
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                Browse verified residential and commercial assets with automated benchmark pricing audit. Flag statistical anomalies against comparable market median metrics.
              </p>
            </div>

            {/* Quick KPI Strip */}
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums border border-slate-200 bg-white px-3.5 py-2 rounded-md shadow-2xs self-start md:self-auto">
              <div>
                <span className="block text-[10px] uppercase font-sans text-slate-400">Tracked Units</span>
                <span className="font-semibold text-slate-900">{isDbConnected ? "100" : "—"}</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="block text-[10px] uppercase font-sans text-slate-400">Audit Alerts</span>
                <span className="font-semibold text-amber-700">{isDbConnected ? "7 Flagged" : "—"}</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="block text-[10px] uppercase font-sans text-slate-400">Embedding Engine</span>
                <span className="font-semibold text-slate-700">MiniLM-L6</span>
              </div>
            </div>
          </div>
        </div>

        {/* Database Notice if disconnected */}
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

        {/* Unified Search & Filters Bar */}
        <section id="semantic" className="scroll-mt-20">
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

        {/* Listings Section */}
        <section id="browse" className="scroll-mt-20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {activeMode === "semantic" ? "Semantic Vector Matches" : "Active Market Inventory"}
              </h2>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                ({activeMode === "semantic" ? searchResults.length : properties.length} properties)
              </span>
            </div>

            {activeMode === "semantic" && (
              <button
                type="button"
                onClick={() => handleToggleMode(false)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 underline self-start sm:self-auto"
              >
                Return to standard listings view
              </button>
            )}
          </div>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                >
                  <div className="aspect-[16/10] w-full animate-pulse bg-slate-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                    <div className="h-6 w-full animate-pulse rounded bg-slate-100 pt-2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Listings Grid */}
          {!isLoading && (
            <>
              {activeMode === "semantic" ? (
                searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                  <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 mb-3">
                      <IconSparkles className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {searchQuery.trim()
                        ? "No semantic matches found for this query"
                        : "Enter a prompt to run vector similarity search"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      {searchQuery.trim()
                        ? "Try rephrasing your search or widening numeric filter constraints."
                        : "Describe property features, location preferences, or design attributes in plain English."}
                    </p>
                  </div>
                )
              ) : properties.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {properties.map((property) => (
                    <PropertyCard
                      key={property.propertyId}
                      property={property}
                      onQuickView={(id) => setSelectedPropertyId(id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 mb-3">
                    <IconBuilding className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {isDbConnected === false
                      ? "Database Offline"
                      : "No properties match the selected criteria"}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    {isDbConnected === false
                      ? "A valid PostgreSQL connection string is required in DATABASE_URL."
                      : "Try clearing specific filters, widening the price range, or selecting all cities."}
                  </p>
                  {isDbConnected !== false && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-4 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* Quick Spec Modal */}
      <PropertyDetailModal
        propertyId={selectedPropertyId}
        onClose={() => setSelectedPropertyId(null)}
      />
    </div>
  );
}
