"use client";

import React, { use, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { PropertyDetail } from "@/types";

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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
      <Navbar isDbConnected={isDbConnected} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to All Properties
          </Link>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="h-40 animate-pulse rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="h-6 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800 mb-4" />
              <div className="h-4 w-1/2 rounded bg-zinc-100 dark:bg-zinc-850" />
            </div>
            <div className="h-64 animate-pulse rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900" />
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              ⚠️
            </div>
            <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Property #{propertyId} Unavailable
            </h2>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              {error}
            </p>
            {isDbConnected === false && (
              <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
                Live property records require configuring <code className="font-mono">DATABASE_URL</code> in your environment.
              </p>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
              >
                Browse Listings
              </Link>
            </div>
          </div>
        ) : detail ? (
          <div className="space-y-6">
            {/* Main Header Card */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    {detail.propertyType}
                  </span>
                  <span
                    className={`rounded-lg px-3 py-1 text-xs font-bold ${
                      detail.listingType === "RENT"
                        ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                    }`}
                  >
                    FOR {detail.listingType}
                  </span>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {detail.status}
                  </span>
                </div>

                <span className="text-xs font-medium text-zinc-400">
                  Property ID #{detail.propertyId}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
                {detail.title}
              </h1>

              <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {detail.address}, {detail.city}, {detail.state} - {detail.pincode}
              </p>

              {/* Price & Specs Banner */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-2xl bg-zinc-50 p-5 dark:bg-zinc-850/60 border border-zinc-100 dark:border-zinc-800">
                <div>
                  <span className="block text-xs font-medium text-zinc-400">
                    {detail.listingType === "RENT" ? "Monthly Rent" : "Asking Price"}
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {formatPrice(detail.price)}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-zinc-400">Configuration</span>
                  <span className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {detail.bedrooms} Bedrooms
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-zinc-400">Bathrooms</span>
                  <span className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {detail.bathrooms} Baths
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-zinc-400">Area</span>
                  <span className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {detail.areaSqft} sqft
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">
                About this Property
              </h2>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
                {detail.description}
              </p>
            </div>

            {/* Amenities */}
            {detail.amenities && detail.amenities.length > 0 && (
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">
                  Amenities & Features
                </h2>
                <div className="flex flex-wrap gap-2.5">
                  {detail.amenities.map((item) => (
                    <span
                      key={item.amenityId}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 shadow-2xs"
                    >
                      ✓ {item.amenity.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Anomaly Detection Section */}
            {detail.anomalies && detail.anomalies.length > 0 && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-6 sm:p-8 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">⚠️</span>
                  <h2 className="text-base font-bold text-amber-950 dark:text-amber-200">
                    Anomaly Detection Analysis
                  </h2>
                </div>

                {detail.anomalies.map((anomaly) => (
                  <div key={anomaly.anomalyId} className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="block text-amber-800/70 dark:text-amber-300/70">
                          Expected Market Value
                        </span>
                        <span className="text-base font-bold text-amber-950 dark:text-amber-100">
                          {formatPrice(anomaly.expectedPrice)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-amber-800/70 dark:text-amber-300/70">
                          Price Difference
                        </span>
                        <span className="text-base font-bold text-amber-950 dark:text-amber-100">
                          {formatPrice(anomaly.priceDifference)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-amber-800/70 dark:text-amber-300/70">
                          Anomaly Severity Score
                        </span>
                        <span className="text-base font-bold text-amber-950 dark:text-amber-100">
                          {Number(anomaly.anomalyScore).toFixed(3)} / 1.000
                        </span>
                      </div>
                      <div>
                        <span className="block text-amber-800/70 dark:text-amber-300/70">
                          Review Status
                        </span>
                        <span className="inline-block mt-0.5 rounded-md bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-900/80 dark:text-amber-200">
                          {anomaly.status}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-amber-100/70 p-3.5 text-xs text-amber-950 dark:bg-amber-900/40 dark:text-amber-200 leading-relaxed">
                      <strong>Statistical Finding:</strong> {anomaly.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Price History Timeline */}
            {detail.priceHistory && detail.priceHistory.length > 0 && (
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">
                  Price History
                </h2>
                <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <table className="min-w-full divide-y divide-zinc-200 text-left text-xs dark:divide-zinc-800">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold">
                      <tr>
                        <th className="px-4 py-3">Recorded Date</th>
                        <th className="px-4 py-3">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {detail.priceHistory.map((item) => (
                        <tr key={item.priceId}>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                            {formatDate(item.recordedAt)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatPrice(item.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Owner & Meta footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-4 text-xs text-zinc-400 dark:border-zinc-800">
              {detail.owner && (
                <span>Listed by: <strong className="text-zinc-700 dark:text-zinc-300">{detail.owner.name}</strong></span>
              )}
              <span>Listing Registered: {formatDate(detail.createdAt)}</span>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default function PropertyDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 font-sans antialiased dark:bg-zinc-950 p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mx-auto" />
            <p className="mt-3 text-xs text-zinc-400">Loading property profile...</p>
          </div>
        </div>
      }
    >
      <PropertyDetailContent params={params} />
    </Suspense>
  );
}
