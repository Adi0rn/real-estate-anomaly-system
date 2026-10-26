"use client";

import React from "react";
import { FilterState } from "@/types";
import {
  IconSearch,
  IconSparkles,
  IconX,
} from "@/components/icons";

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

const PROMPT_SUGGESTIONS = [
  "Find a 3-bedroom villa with private garden in Bangalore",
  "Modern luxury penthouse in Mumbai with high ceilings",
  "Affordable 2 BHK apartment near tech hubs in Pune",
  "Spacious independent home in Hyderabad for rent",
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

  const activeFilterEntries = Object.entries(filters).filter(
    ([, val]) => val && val.trim().length > 0
  );

  const hasAnyFilters = searchQuery.trim().length > 0 || activeFilterEntries.length > 0;

  return (
    <div className="rounded-lg border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs">
      <form onSubmit={onSearchSubmit} className="space-y-4">
        {/* Top Control Bar: Search Input & Mode Selector */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {isSemanticMode ? "AI Semantic Vector Search" : "Structured Property Search"}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-[11px] text-slate-500">
                {isSemanticMode
                  ? "Ranks 384-dimensional pgvector cosine distance"
                  : "Database keyword and parametric match"}
              </span>
            </div>

            {/* Mode Switcher */}
            <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onToggleMode(false)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  !isSemanticMode
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Standard Filters
              </button>
              <button
                type="button"
                onClick={() => onToggleMode(true)}
                className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  isSemanticMode
                    ? "bg-slate-900 text-white shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <IconSparkles className="w-3 h-3" />
                <span>Semantic AI</span>
              </button>
            </div>
          </div>

          {/* Search Box Input */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                {isSemanticMode ? (
                  <IconSparkles className="h-4 w-4 text-slate-700" />
                ) : (
                  <IconSearch className="h-4 w-4 text-slate-400" />
                )}
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder={
                  isSemanticMode
                    ? "Describe your ideal residence in plain text (e.g. peaceful 3-bedroom villa near parks in Bangalore)..."
                    : "Search by title, locality, or keyword..."
                }
                className="w-full rounded-md border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-800/10"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <IconSearch className="w-3.5 h-3.5" />
                  <span>Run Search</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Prompts for Semantic Mode */}
          {isSemanticMode && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span className="text-[11px] font-medium text-slate-400">Examples:</span>
              {PROMPT_SUGGESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSearchQueryChange(item);
                  }}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:border-slate-300 hover:bg-white transition-colors text-left"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Structured Filter Grid */}
        <div className="border-t border-slate-100 pt-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {/* City */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                City
              </label>
              <select
                value={filters.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-800"
              >
                <option value="">All Cities</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
                <option value="Pune">Pune</option>
                <option value="Hyderabad">Hyderabad</option>
              </select>
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Property Type
              </label>
              <select
                value={filters.propertyType}
                onChange={(e) => handleInputChange("propertyType", e.target.value)}
                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-800"
              >
                <option value="">All Types</option>
                <option value="APARTMENT">Apartment</option>
                <option value="VILLA">Villa</option>
                <option value="PENTHOUSE">Penthouse</option>
                <option value="STUDIO">Studio</option>
                <option value="COMMERCIAL">Commercial</option>
              </select>
            </div>

            {/* Listing Type (Rent vs Sale) */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Listing Type
              </label>
              <select
                value={filters.listingType}
                onChange={(e) => handleInputChange("listingType", e.target.value)}
                disabled={isSemanticMode}
                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">All Listings</option>
                <option value="SALE">For Sale</option>
                <option value="RENT">For Rent</option>
              </select>
            </div>

            {/* Bedrooms */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Bedrooms (BHK)
              </label>
              <select
                value={filters.bedrooms}
                onChange={(e) => handleInputChange("bedrooms", e.target.value)}
                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-800"
              >
                <option value="">Any BHK</option>
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4+ BHK</option>
              </select>
            </div>

            {/* Min Price */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Min Price (₹)
              </label>
              <input
                type="number"
                placeholder="Min INR"
                value={filters.minPrice}
                onChange={(e) => handleInputChange("minPrice", e.target.value)}
                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-800 font-mono"
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Max Price (₹)
              </label>
              <input
                type="number"
                placeholder="Max INR"
                value={filters.maxPrice}
                onChange={(e) => handleInputChange("maxPrice", e.target.value)}
                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-800 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Active Filters Pill Row */}
        {hasAnyFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400">Active Criteria:</span>

              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-800">
                  <span>Query: &quot;{searchQuery}&quot;</span>
                  <button
                    type="button"
                    onClick={() => onSearchQueryChange("")}
                    className="hover:text-slate-900"
                  >
                    <IconX className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.city && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-800">
                  <span>City: {filters.city}</span>
                  <button
                    type="button"
                    onClick={() => handleInputChange("city", "")}
                    className="hover:text-slate-900"
                  >
                    <IconX className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.propertyType && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-800">
                  <span>Type: {filters.propertyType}</span>
                  <button
                    type="button"
                    onClick={() => handleInputChange("propertyType", "")}
                    className="hover:text-slate-900"
                  >
                    <IconX className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.listingType && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-800">
                  <span>Listing: {filters.listingType}</span>
                  <button
                    type="button"
                    onClick={() => handleInputChange("listingType", "")}
                    className="hover:text-slate-900"
                  >
                    <IconX className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.bedrooms && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-800">
                  <span>{filters.bedrooms} BHK</span>
                  <button
                    type="button"
                    onClick={() => handleInputChange("bedrooms", "")}
                    className="hover:text-slate-900"
                  >
                    <IconX className="w-3 h-3" />
                  </button>
                </span>
              )}

              {(filters.minPrice || filters.maxPrice) && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-800 font-mono">
                  <span>
                    Price: {filters.minPrice ? `₹${filters.minPrice}` : "0"} — {filters.maxPrice ? `₹${filters.maxPrice}` : "Any"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange("minPrice", "");
                      handleInputChange("maxPrice", "");
                    }}
                    className="hover:text-slate-900"
                  >
                    <IconX className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onResetFilters}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 underline"
            >
              Reset all criteria
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
