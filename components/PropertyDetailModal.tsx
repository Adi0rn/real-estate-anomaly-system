"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PropertyDetail } from "@/types";
import {
  IconBed,
  IconBath,
  IconMaximize,
  IconMapPin,
  IconAlertTriangle,
  IconX,
} from "@/components/icons";
import { getPropertyImage, formatINR } from "@/src/lib/property-images";

type PropertyDetailModalProps = {
  propertyId: number | null;
  onClose: () => void;
};

export default function PropertyDetailModal({
  propertyId,
  onClose,
}: PropertyDetailModalProps) {
  const [detail, setDetail] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) return;

    let isMounted = true;

    const loadDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/properties/${propertyId}`);
        const data = await res.json();
        if (!isMounted) return;
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load property details");
        }
        setDetail(data.property);
        setError(null);
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load property details");
          setDetail(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  if (!propertyId) return null;

  const imageUrl = getPropertyImage(propertyId, detail?.propertyType);
  const anomaly = detail?.anomalies && detail.anomalies.length > 0 ? detail.anomalies[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Dim Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-2xl max-h-[calc(100vh-2.5rem)] overflow-y-auto rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] shadow-xl my-8 transition-colors">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-20 rounded-full bg-white/90 dark:bg-[#202428]/90 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#272c33] transition-colors shadow-xs"
        >
          <IconX className="h-4 w-4" />
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-800 dark:border-white border-t-transparent" />
            <p className="mt-3 text-xs text-slate-500 dark:text-[#a1a8b0] font-mono">Fetching Property #{propertyId}...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-slate-600 dark:text-slate-400">
            <p className="text-rose-700 dark:text-rose-400 font-medium mb-3">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 dark:border-[#30363d] px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#202428]"
            >
              Dismiss
            </button>
          </div>
        ) : detail ? (
          <div>
            {/* Header Photo Crop */}
            <div className="relative aspect-[21/9] w-full bg-slate-100 dark:bg-[#111315] overflow-hidden">
              <Image
                src={imageUrl}
                alt={detail.title}
                fill
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-cover"
              />
              <div className="absolute top-3 left-3 flex gap-1.5">
                <span className="rounded bg-slate-900/85 dark:bg-black/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                  {detail.propertyType}
                </span>
                <span className="rounded bg-white/90 dark:bg-[#202428]/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#30363d]">
                  FOR {detail.listingType}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Title & Price */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white">
                    {detail.title}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-[#a1a8b0]">
                    <IconMapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>{detail.address}, {detail.city}</span>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xl font-bold tracking-tight text-slate-950 dark:text-white tabular-nums">
                    {formatINR(detail.price)}
                  </span>
                  {detail.listingType === "RENT" && (
                    <span className="text-xs text-slate-500 dark:text-[#a1a8b0] block">/ month</span>
                  )}
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-3 gap-2 border-y border-slate-100 dark:border-[#30363d] py-3 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <IconBed className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span className="font-semibold text-slate-900 dark:text-white">{detail.bedrooms}</span>
                  <span className="text-slate-500 dark:text-[#a1a8b0]">BHK</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <IconBath className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span className="font-semibold text-slate-900 dark:text-white">{detail.bathrooms}</span>
                  <span className="text-slate-500 dark:text-[#a1a8b0]">Baths</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <IconMaximize className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span className="font-semibold text-slate-900 dark:text-white font-mono">{detail.areaSqft}</span>
                  <span className="text-slate-500 dark:text-[#a1a8b0]">sqft</span>
                </div>
              </div>

              {/* Description Snippet */}
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                {detail.description}
              </p>

              {/* Anomaly Callout if present */}
              {anomaly && (
                <div className="rounded border border-amber-300 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] mb-1">
                    <IconAlertTriangle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    <span>Statistical Anomaly Flagged (Score {parseFloat(anomaly.anomalyScore).toFixed(2)})</span>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-normal">
                    {anomaly.reason}
                  </p>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#30363d] pt-3">
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  Unit Reference #{propertyId}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded border border-slate-200 dark:border-[#30363d] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#202428] transition-colors"
                  >
                    Close
                  </button>
                  <Link
                    href={`/properties/${propertyId}`}
                    onClick={onClose}
                    className="rounded bg-slate-900 dark:bg-white px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                  >
                    Full Profile →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
