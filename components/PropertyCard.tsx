"use client";

import React from "react";
import Link from "next/link";
import { Property, SearchResult } from "@/types";

type PropertyCardProps = {
  property:
    | Property
    | (SearchResult & {
        city?: string;
        price?: string;
        propertyType?: string;
        listingType?: string;
        bedrooms?: number;
        bathrooms?: number;
        areaSqft?: number;
        address?: string;
        state?: string;
      });
  similarity?: number;
  hasAnomaly?: boolean;
  anomalyScore?: string;
  onQuickView?: (propertyId: number) => void;
};

export default function PropertyCard({
  property,
  similarity,
  hasAnomaly,
  anomalyScore,
  onQuickView,
}: PropertyCardProps) {
  const formatPrice = (priceStr?: string) => {
    if (!priceStr) return "N/A";
    const num = Number(priceStr);
    if (isNaN(num)) return priceStr;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const isSearchResultOnly = !property.city && similarity !== undefined;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {property.propertyType && (
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {property.propertyType}
              </span>
            )}
            {property.listingType && (
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  property.listingType === "RENT"
                    ? "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                }`}
              >
                FOR {property.listingType}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {similarity !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <span>✨</span>
                {(similarity * 100).toFixed(0)}% Match
              </span>
            )}

            {hasAnomaly && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span>⚠️</span>
                Anomaly {anomalyScore ? `(${Number(anomalyScore).toFixed(2)})` : ""}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <Link href={`/properties/${property.propertyId}`}>
          <h3 className="line-clamp-2 text-base font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors dark:text-zinc-50 dark:group-hover:text-indigo-400">
            {property.title}
          </h3>
        </Link>

        {/* Location */}
        {property.city ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <svg
              className="h-3.5 w-3.5 shrink-0 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="truncate">
              {property.address ? `${property.address}, ` : ""}
              {property.city}
              {property.state ? `, ${property.state}` : ""}
            </span>
          </p>
        ) : property.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
            {property.description}
          </p>
        ) : null}

        {/* Specs Row */}
        {!isSearchResultOnly && (
          <div className="mt-4 flex items-center justify-between border-y border-zinc-100 py-2.5 dark:border-zinc-800">
            <div className="text-center">
              <span className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {property.bedrooms ?? "-"} BHK
              </span>
              <span className="block text-[10px] text-zinc-400">Beds</span>
            </div>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="text-center">
              <span className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {property.bathrooms ?? "-"}
              </span>
              <span className="block text-[10px] text-zinc-400">Baths</span>
            </div>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="text-center">
              <span className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {property.areaSqft ? `${property.areaSqft} sqft` : "-"}
              </span>
              <span className="block text-[10px] text-zinc-400">Area</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Price & Actions */}
      <div className="mt-4 flex items-center justify-between pt-2">
        <div>
          {property.price ? (
            <>
              <span className="block text-[10px] font-medium text-zinc-400">
                {property.listingType === "RENT" ? "Monthly Rent" : "Asking Price"}
              </span>
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {formatPrice(property.price)}
              </span>
            </>
          ) : similarity !== undefined ? (
            <>
              <span className="block text-[10px] font-medium text-zinc-400">
                AI Match Score
              </span>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {(similarity * 100).toFixed(1)}% Relevance
              </span>
            </>
          ) : (
            <span className="text-sm font-medium text-zinc-400">Price on Request</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onQuickView && (
            <button
              type="button"
              onClick={() => onQuickView(property.propertyId)}
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              title="Quick modal view"
            >
              Quick View
            </button>
          )}

          <Link
            href={`/properties/${property.propertyId}`}
            className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition-colors hover:bg-indigo-600 hover:text-white dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-indigo-500 dark:hover:text-white"
          >
            Details →
          </Link>
        </div>
      </div>
    </div>
  );
}
