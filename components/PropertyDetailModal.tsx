"use client";

import React, { useEffect, useState } from "react";
import { PropertyDetail } from "@/types";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="h-8 w-8 animate-spin text-indigo-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-3 text-sm text-zinc-500">Loading property profile #{propertyId}...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              ⚠️
            </div>
            <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-50">
              Failed to load property details
            </h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-xl bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            >
              Close
            </button>
          </div>
        ) : detail ? (
          <div className="space-y-6">
            {/* Header info */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                  {detail.propertyType}
                </span>
                <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                  FOR {detail.listingType}
                </span>
                <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  ID: #{detail.propertyId}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {detail.title}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {detail.address}, {detail.city}, {detail.state} - {detail.pincode}
              </p>
            </div>

            {/* Price & specs highlight */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
              <div>
                <span className="block text-[11px] font-medium text-zinc-400">
                  {detail.listingType === "RENT" ? "Monthly Rent" : "Listing Price"}
                </span>
                <span className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {formatPrice(detail.price)}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-zinc-400">Bedrooms</span>
                <span className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {detail.bedrooms} BHK
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-zinc-400">Bathrooms</span>
                <span className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {detail.bathrooms} Baths
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-zinc-400">Built-up Area</span>
                <span className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {detail.areaSqft} sqft
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Description
              </h4>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {detail.description}
              </p>
            </div>

            {/* Amenities */}
            {detail.amenities && detail.amenities.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Amenities
                </h4>
                <div className="flex flex-wrap gap-2">
                  {detail.amenities.map((item) => (
                    <span
                      key={item.amenityId}
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 shadow-2xs"
                    >
                      ✓ {item.amenity.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Anomaly Detection Section */}
            {detail.anomalies && detail.anomalies.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">⚠️</span>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Anomaly Detection Analysis
                  </h4>
                </div>

                {detail.anomalies.map((anomaly) => (
                  <div key={anomaly.anomalyId} className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="block text-amber-800/70 dark:text-amber-300/70">
                          Expected Price
                        </span>
                        <span className="font-bold text-amber-950 dark:text-amber-100">
                          {formatPrice(anomaly.expectedPrice)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-amber-800/70 dark:text-amber-300/70">
                          Price Difference
                        </span>
                        <span className="font-bold text-amber-950 dark:text-amber-100">
                          {formatPrice(anomaly.priceDifference)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-amber-800/70 dark:text-amber-300/70">
                          Anomaly Score
                        </span>
                        <span className="font-bold text-amber-950 dark:text-amber-100">
                          {Number(anomaly.anomalyScore).toFixed(3)} / 1.000
                        </span>
                      </div>
                      <div>
                        <span className="block text-amber-800/70 dark:text-amber-300/70">
                          Status
                        </span>
                        <span className="inline-block rounded-md bg-amber-200/80 px-2 py-0.5 font-bold text-[11px] text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                          {anomaly.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-amber-900/90 dark:text-amber-200/90 bg-amber-100/60 p-2.5 rounded-lg dark:bg-amber-900/30">
                      <strong>Reason:</strong> {anomaly.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Price History Timeline */}
            {detail.priceHistory && detail.priceHistory.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Price History
                </h4>
                <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <table className="min-w-full divide-y divide-zinc-200 text-left text-xs dark:divide-zinc-800">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500">
                      <tr>
                        <th className="px-3.5 py-2 font-medium">Recorded Date</th>
                        <th className="px-3.5 py-2 font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {detail.priceHistory.map((item) => (
                        <tr key={item.priceId}>
                          <td className="px-3.5 py-2 text-zinc-600 dark:text-zinc-400">
                            {formatDate(item.recordedAt)}
                          </td>
                          <td className="px-3.5 py-2 font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatPrice(item.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Owner info */}
            {detail.owner && (
              <div className="flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800 text-xs text-zinc-500">
                <span>Listed by: <strong className="text-zinc-700 dark:text-zinc-300">{detail.owner.name}</strong></span>
                <span>Added: {formatDate(detail.createdAt)}</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
