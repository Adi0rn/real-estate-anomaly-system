"use client";

import React from "react";
import { FilterState } from "@/types";

type SearchFiltersProps = {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onSearchSubmit: (e?: React.FormEvent) => void;
  onResetFilters: () => void;
  isSemanticMode: boolean;
  onToggleMode: (semantic: boolean) => void;
  isLoading: boolean;
};

const SUGGESTIONS = [
  "Find a peaceful 3-bedroom villa near parks in Bangalore...",
  "Modern luxury penthouse in Mumbai with high ceilings",
  "Affordable 2 BHK apartment in Pune near tech parks",
  "Spacious independent house with garden in Hyderabad",
];

export default function SearchFilters({
  searchQuery,
  onSearchQueryChange,
  filters,
  onFilterChange,
  onSearchSubmit,
  onResetFilters,
  isSemanticMode,
  onToggleMode,
  isLoading,
}: SearchFiltersProps) {
  const handleInputChange = (key: keyof FilterState, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    Boolean(filters.city) ||
    Boolean(filters.propertyType) ||
    Boolean(filters.listingType) ||
    Boolean(filters.minPrice) ||
    Boolean(filters.maxPrice) ||
    Boolean(filters.bedrooms);

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <form onSubmit={onSearchSubmit} className="space-y-4">
        {/* Main Search Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <span>{isSemanticMode ? "✨ Natural-Language Vector Search" : "🔍 Property Search"}</span>
            </label>

            <button
              type="button"
              onClick={() => onToggleMode(!isSemanticMode)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                isSemanticMode
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {isSemanticMode ? "Mode: AI Semantic (MiniLM + pgvector)" : "Mode: Keyword & Filters"}
            </button>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400">
                {isSemanticMode ? (
                  <span className="text-lg">✨</span>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Find a peaceful 3-bedroom villa near parks in Bangalore..."
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-3.5 pl-12 pr-4 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-indigo-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-all dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {isLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Searching...
                </>
              ) : isSemanticMode ? (
                "Search with AI"
              ) : (
                "Filter Properties"
              )}
            </button>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-zinc-400">Try asking:</span>
            {SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSearchQueryChange(suggestion);
                  if (!isSemanticMode) onToggleMode(true);
                }}
                className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Structured Filter Row */}
        <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {/* City */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                City
              </label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                placeholder="e.g. Bangalore"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                Property Type
              </label>
              <select
                value={filters.propertyType}
                onChange={(e) => handleInputChange("propertyType", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              >
                <option value="">All Types</option>
                <option value="APARTMENT">Apartment</option>
                <option value="VILLA">Villa</option>
                <option value="INDEPENDENT_HOUSE">Independent House</option>
                <option value="PENTHOUSE">Penthouse</option>
                <option value="STUDIO">Studio</option>
              </select>
            </div>

            {/* Listing Type - only active for standard search */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                Listing Type {isSemanticMode && "(Standard only)"}
              </label>
              <select
                value={filters.listingType}
                disabled={isSemanticMode}
                onChange={(e) => handleInputChange("listingType", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-indigo-500 focus:bg-white disabled:opacity-40 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              >
                <option value="">All Listings</option>
                <option value="SALE">For Sale</option>
                <option value="RENT">For Rent</option>
              </select>
            </div>

            {/* Bedrooms */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                Bedrooms
              </label>
              <select
                value={filters.bedrooms}
                onChange={(e) => handleInputChange("bedrooms", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              >
                <option value="">Any Bedrooms</option>
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4 BHK</option>
                <option value="5">5+ BHK</option>
              </select>
            </div>

            {/* Min Price */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                Min Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={filters.minPrice}
                onChange={(e) => handleInputChange("minPrice", e.target.value)}
                placeholder="Min"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                Max Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={filters.maxPrice}
                onChange={(e) => handleInputChange("maxPrice", e.target.value)}
                placeholder="Max"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
          </div>
        </div>

        {/* Clear Filters bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between border-t border-zinc-100 pt-2 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-400">
              Active filters applied
            </span>
            <button
              type="button"
              onClick={onResetFilters}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              Reset all filters ✕
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
