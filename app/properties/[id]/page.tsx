"use client";

import React, { use, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { PropertyDetail } from "@/types";
import {
  IconMapPin,
  IconAlertTriangle,
  IconShieldCheck,
  IconCheck,
} from "@/components/icons";
import { getPropertyGallery, formatINR } from "@/src/lib/property-images";

type PageProps = {
  params: Promise<{ id: string }>;
};

function PropertyDetailContent({ params }: PageProps) {
  const { id } = use(params);
  const propertyId = Number(id);

  const [detail, setDetail] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    const loadProperty = async () => {
      try {
        const res = await fetch(`/api/properties/${propertyId}`);
        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok || !data.success) {
          setIsDbConnected(false);
          throw new Error(data.error || "Failed to retrieve property details.");
        }

        setIsDbConnected(true);
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

    loadProperty();

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const galleryImages = getPropertyGallery(propertyId, detail?.propertyType);
  const priceNum = detail?.price ? parseFloat(detail.price) : null;
  const areaSqft = detail?.areaSqft;
  const pricePerSqft = priceNum && areaSqft && areaSqft > 0 ? Math.round(priceNum / areaSqft) : null;
  const anomaly = detail?.anomalies && detail.anomalies.length > 0 ? detail.anomalies[0] : null;

  return (
    <div className="min-h-screen bg-[#fbfbfa] dark:bg-[#111315] text-slate-900 dark:text-[#f3f4f6] transition-colors duration-150">
      <Navbar isDbConnected={isDbConnected} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#a1a8b0]">
          <Link href="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Marketplace
          </Link>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          {detail?.city && (
            <>
              <span className="text-slate-600 dark:text-slate-300">{detail.city}</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
            </>
          )}
          <span className="font-mono text-slate-700 dark:text-slate-300">Listing #{propertyId}</span>
        </nav>

        {loading ? (
          <div className="space-y-6">
            <div className="aspect-[21/9] w-full animate-pulse rounded-lg bg-slate-200 dark:bg-[#202428]" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-[#202428]" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-[#202428]" />
                <div className="h-32 w-full animate-pulse rounded bg-slate-100 dark:bg-[#191c1f]" />
              </div>
              <div className="h-64 animate-pulse rounded bg-slate-100 dark:bg-[#191c1f]" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-12 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 mb-3">
              <IconAlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Property #{propertyId} Unavailable
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-[#a1a8b0] max-w-md mx-auto">{error}</p>
            <div className="mt-5">
              <Link
                href="/"
                className="inline-flex rounded-md bg-slate-900 dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-slate-900 shadow-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
              >
                Back to Marketplace
              </Link>
            </div>
          </div>
        ) : detail ? (
          <div className="space-y-6">
            {/* Architectural Photo Gallery Mosaic */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 overflow-hidden rounded-lg border border-slate-200/90 dark:border-[#30363d] bg-slate-100 dark:bg-[#111315]">
              {/* Primary Main Image */}
              <div className="relative aspect-[16/10] md:col-span-3 md:aspect-auto md:h-[420px] overflow-hidden">
                <Image
                  src={galleryImages[selectedGalleryIndex]}
                  alt={detail.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 75vw"
                  className="object-cover transition-opacity duration-200"
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

              {/* Thumbnail strip */}
              <div className="grid grid-cols-3 md:grid-cols-1 gap-2 p-2 bg-slate-50 dark:bg-[#15181b]">
                {galleryImages.slice(1, 4).map((img, idx) => {
                  const actualIdx = idx + 1;
                  return (
                    <button
                      key={actualIdx}
                      type="button"
                      onClick={() => setSelectedGalleryIndex(actualIdx)}
                      className={`relative aspect-[16/10] md:aspect-auto md:h-[128px] overflow-hidden rounded border transition-all ${
                        selectedGalleryIndex === actualIdx
                          ? "border-slate-900 dark:border-white ring-1 ring-slate-900 dark:ring-white"
                          : "border-slate-200 dark:border-[#30363d] hover:opacity-90"
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`Photo view ${actualIdx}`}
                        fill
                        sizes="(max-width: 768px) 33vw, 25vw"
                        className="object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Core Listing Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200/90 dark:border-[#30363d] pb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {detail.title}
                </h1>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#a1a8b0]">
                  <IconMapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>{detail.address}, {detail.city}, {detail.state} — {detail.pincode}</span>
                </p>
              </div>

              <div className="text-left md:text-right shrink-0">
                <div className="flex items-baseline md:justify-end gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white font-sans tabular-nums">
                    {formatINR(detail.price)}
                  </span>
                  {detail.listingType === "RENT" && (
                    <span className="text-xs text-slate-500 dark:text-[#a1a8b0] font-medium">/ month</span>
                  )}
                </div>
                {pricePerSqft && (
                  <p className="text-xs font-mono text-slate-500 dark:text-[#a1a8b0] tabular-nums mt-0.5">
                    ₹{pricePerSqft.toLocaleString("en-IN")} per sqft
                  </p>
                )}
              </div>
            </div>

            {/* Two-Column Structured Architecture */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Specifications, Overview, Amenities, History */}
              <div className="lg:col-span-2 space-y-6">
                {/* Specifications Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-4 text-xs shadow-2xs">
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Configuration</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                      {detail.bedrooms} Bedrooms (BHK)
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Bathrooms</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                      {detail.bathrooms} Baths
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Carpet Area</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tabular-nums font-mono">
                      {detail.areaSqft.toLocaleString("en-IN")} sqft
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Listing Status</span>
                    <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                      {detail.status}
                    </span>
                  </div>
                </div>

                {/* Property Description */}
                <div className="rounded-lg border border-slate-200/90 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-5 shadow-2xs">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#a1a8b0] mb-2">
                    Property Overview & Notes
                  </h2>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {detail.description}
                  </p>
                </div>

                {/* Amenities */}
                {detail.amenities && detail.amenities.length > 0 && (
                  <div className="rounded-lg border border-slate-200/90 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-5 shadow-2xs">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#a1a8b0] mb-3">
                      Features & Infrastructure
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {detail.amenities.map((item) => (
                        <div
                          key={item.amenityId}
                          className="flex items-center gap-2 rounded border border-slate-100 dark:border-[#30363d] bg-slate-50/70 dark:bg-[#202428] px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300"
                        >
                          <IconCheck className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
                          <span>{item.amenity.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price History Timeline */}
                {detail.priceHistory && detail.priceHistory.length > 0 && (
                  <div className="rounded-lg border border-slate-200/90 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-5 shadow-2xs">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#a1a8b0] mb-3">
                      Historical Price Valuation Log
                    </h2>
                    <div className="overflow-hidden rounded border border-slate-200 dark:border-[#30363d]">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-[#30363d] text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-[#202428] font-medium text-slate-500 dark:text-[#a1a8b0]">
                          <tr>
                            <th className="px-3.5 py-2">Recorded Timestamp</th>
                            <th className="px-3.5 py-2">Listed Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#30363d]">
                          {detail.priceHistory.map((item) => (
                            <tr key={item.priceId}>
                              <td className="px-3.5 py-2 text-slate-600 dark:text-[#a1a8b0] font-mono">
                                {formatDate(item.recordedAt)}
                              </td>
                              <td className="px-3.5 py-2 font-semibold text-slate-900 dark:text-white font-mono tabular-nums">
                                {formatINR(item.price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Valuation & Anomaly Assessment Panel */}
              <div className="space-y-4">
                {/* Quantitative Anomaly Audit Box */}
                {anomaly ? (
                  <div className="rounded-lg border border-amber-300 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 p-5 shadow-xs">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 mb-3">
                      <IconAlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                      <h3 className="text-xs font-bold uppercase tracking-wider">
                        Valuation Anomaly Flagged
                      </h3>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between border-b border-amber-200/60 dark:border-amber-900/40 pb-2">
                        <span className="text-slate-600 dark:text-[#a1a8b0]">Actual Asking Price</span>
                        <span className="font-bold text-slate-950 dark:text-white font-mono tabular-nums">
                          {formatINR(anomaly.actualPrice)}
                        </span>
                      </div>

                      <div className="flex justify-between border-b border-amber-200/60 dark:border-amber-900/40 pb-2">
                        <span className="text-slate-600 dark:text-[#a1a8b0]">Model Expected Benchmark</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono tabular-nums">
                          {formatINR(anomaly.expectedPrice)}
                        </span>
                      </div>

                      <div className="flex justify-between border-b border-amber-200/60 dark:border-amber-900/40 pb-2">
                        <span className="text-slate-600 dark:text-[#a1a8b0]">Valuation Discrepancy</span>
                        <span className="font-bold text-amber-900 dark:text-amber-300 font-mono tabular-nums">
                          {formatINR(anomaly.priceDifference)}
                        </span>
                      </div>

                      <div className="flex justify-between border-b border-amber-200/60 dark:border-amber-900/40 pb-2">
                        <span className="text-slate-600 dark:text-[#a1a8b0]">Statistical Anomaly Score</span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                          {parseFloat(anomaly.anomalyScore).toFixed(3)} / 1.000
                        </span>
                      </div>

                      <div className="flex justify-between border-b border-amber-200/60 dark:border-amber-900/40 pb-2">
                        <span className="text-slate-600 dark:text-[#a1a8b0]">Audit Status</span>
                        <span className="font-bold uppercase tracking-wider text-[10px] text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
                          {anomaly.status}
                        </span>
                      </div>

                      <div className="mt-2 rounded bg-white dark:bg-[#191c1f] p-2.5 border border-amber-200 dark:border-amber-900/60 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                        <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">Model Justification:</span>
                        {anomaly.reason}
                      </div>

                      <div className="pt-1">
                        <Link
                          href="/admin"
                          className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 dark:bg-white py-2 text-xs font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                        >
                          Review in Admin Console →
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-5 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white mb-2">
                      <IconShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider">
                        Valuation Integrity Verified
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-[#a1a8b0] leading-relaxed">
                      Asking price conforms to local benchmark models based on historical comparable sales within {detail.city}.
                    </p>
                  </div>
                )}

                {/* Owner / Broker Info */}
                <div className="rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-5 text-xs shadow-2xs">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#a1a8b0] mb-3">
                    Listing Authority
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-[#a1a8b0]">Representative:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{detail.owner?.name || "Verified Broker"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-[#a1a8b0]">Listed Date:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{formatDate(detail.createdAt)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-[#a1a8b0]">Verification:</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">Verified Record</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#30363d]">
                    <button
                      type="button"
                      onClick={() => alert(`Direct inquiry request sent for Property #${propertyId}.`)}
                      className="w-full rounded-md border border-slate-300 dark:border-[#30363d] bg-slate-50 dark:bg-[#202428] py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#272c33] transition-colors"
                    >
                      Inquire on this Listing
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default function PropertyDetailPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fbfbfa] dark:bg-[#111315]">
          <header className="h-14 border-b border-slate-200/90 dark:border-[#30363d] bg-white/95 dark:bg-[#191c1f]/95" />
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="aspect-[21/9] w-full animate-pulse rounded-lg bg-slate-200 dark:bg-[#202428]" />
          </div>
        </div>
      }
    >
      <PropertyDetailContent {...props} />
    </Suspense>
  );
}
