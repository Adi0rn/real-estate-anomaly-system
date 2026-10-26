"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Property, SearchResult } from "@/types";
import {
  IconBed,
  IconBath,
  IconMaximize,
  IconMapPin,
  IconAlertTriangle,
  IconSparkles,
} from "@/components/icons";
import { getPropertyImage, getPropertyFallback, formatINR } from "@/src/lib/property-images";

type PropertyCardProps = {
  property: Property | SearchResult;
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
  const [imageError, setImageError] = useState(false);
  const imageUrl = getPropertyImage(property.propertyId, property.propertyType);

  const priceNum = property.price ? parseFloat(property.price) : null;
  const areaSqft = property.areaSqft;
  const pricePerSqft = priceNum && areaSqft && areaSqft > 0 ? Math.round(priceNum / areaSqft) : null;

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-lg border border-slate-200/90 dark:border-[#30363d] bg-white dark:bg-[#191c1f] transition-all duration-150 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs">
      <div>
        {/* Photo Container */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-[#111315]">
          <Link href={`/properties/${property.propertyId}`} className="block h-full w-full">
            <Image
              src={imageError ? getPropertyFallback(property.propertyType) : imageUrl}
              alt={property.title || "Property listing"}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onError={() => setImageError(true)}
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </Link>

          {/* Top Overlays */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-1.5 p-2.5 sm:p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {property.propertyType && (
                <span className="rounded bg-slate-900/85 dark:bg-black/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-white shadow-xs">
                  {property.propertyType}
                </span>
              )}
              {property.listingType && (
                <span className="rounded bg-white/90 dark:bg-[#202428]/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-slate-800 dark:text-slate-200 shadow-xs border border-slate-200/60 dark:border-[#30363d]">
                  {property.listingType}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {similarity !== undefined && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-900/90 dark:bg-[#202428]/95 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-slate-100 shadow-xs border border-transparent dark:border-[#30363d]">
                  <IconSparkles className="w-3 h-3 text-emerald-400" />
                  <span>{(similarity * 100).toFixed(0)}% Match</span>
                </span>
              )}

              {hasAnomaly && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/95 dark:bg-amber-600/95 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-slate-950 shadow-xs">
                  <IconAlertTriangle className="w-3 h-3" />
                  <span>Alert {anomalyScore ? `(${parseFloat(anomalyScore).toFixed(2)})` : ""}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4">
          {/* Price & Rate */}
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums font-sans">
                {property.price ? formatINR(property.price, true) : "Price on Request"}
              </span>
              {property.listingType === "RENT" && (
                <span className="text-xs text-slate-500 dark:text-[#a1a8b0] font-normal ml-1">/ month</span>
              )}
            </div>

            {pricePerSqft && (
              <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-[#a1a8b0]">
                ₹{pricePerSqft.toLocaleString("en-IN")}/sqft
              </span>
            )}
          </div>

          {/* Title */}
          <Link href={`/properties/${property.propertyId}`}>
            <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white transition-colors">
              {property.title}
            </h3>
          </Link>

          {/* Location */}
          {property.city ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#a1a8b0]">
              <IconMapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="truncate">
                {property.address ? `${property.address}, ` : ""}
                {property.city}
                {property.state ? `, ${property.state}` : ""}
              </span>
            </p>
          ) : property.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-[#a1a8b0]">
              {property.description}
            </p>
          ) : null}

          {/* Specs Grid */}
          <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-[#30363d] pt-3 text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5 text-xs">
              <IconBed className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                {property.bedrooms ?? "—"}
              </span>
              <span className="text-slate-500 dark:text-[#a1a8b0] text-[11px]">Beds</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <IconBath className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                {property.bathrooms ?? "—"}
              </span>
              <span className="text-slate-500 dark:text-[#a1a8b0] text-[11px]">Baths</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <IconMaximize className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                {property.areaSqft ? property.areaSqft.toLocaleString("en-IN") : "—"}
              </span>
              <span className="text-slate-500 dark:text-[#a1a8b0] text-[11px]">sqft</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#30363d] bg-slate-50/60 dark:bg-[#15181b]/80 px-4 py-2.5 text-xs">
        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
          ID #{property.propertyId}
        </span>

        <div className="flex items-center gap-2">
          {onQuickView && (
            <button
              type="button"
              onClick={() => onQuickView(property.propertyId)}
              className="font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Quick Spec
            </button>
          )}

          <Link
            href={`/properties/${property.propertyId}`}
            className="inline-flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <span>Inspect</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
