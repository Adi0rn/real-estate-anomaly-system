"use client";

import React from "react";
import { AnomalyRecord } from "@/types";

type AnomalyRadarProps = {
  anomalies: AnomalyRecord[];
  isLoading: boolean;
  error: string | null;
  onSelectProperty: (propertyId: number) => void;
  onRefresh: () => void;
  isAdmin?: boolean;
  onReviewAnomaly?: (anomalyId: number, decision: "CONFIRMED" | "DISMISSED") => Promise<void>;
  isReviewingId?: number | null;
  reviewMessage?: { text: string; type: "success" | "error" } | null;
};

export default function AnomalyRadar({
  anomalies,
  isLoading,
  error,
  onSelectProperty,
  onRefresh,
  isAdmin,
  onReviewAnomaly,
  isReviewingId,
  reviewMessage,
}: AnomalyRadarProps) {
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingCount = anomalies.filter((a) => a.status === "PENDING").length;
  const confirmedCount = anomalies.filter((a) => a.status === "CONFIRMED").length;
  const dismissedCount = anomalies.filter((a) => a.status === "DISMISSED").length;

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span>⚠️</span> Anomaly Detection Radar
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Properties flagged with statistically significant deviation from comparable market pricing.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-850"
        >
          <svg
            className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh Feed
        </button>
      </div>

      {/* Review Feedback Message Banner */}
      {reviewMessage && (
        <div
          className={`rounded-2xl p-4 text-xs font-medium ${
            reviewMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
          }`}
        >
          {reviewMessage.text}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-2xs">
          <span className="block text-[11px] font-medium text-zinc-400">Total Flagged</span>
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {isLoading ? "-" : anomalies.length}
          </span>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 shadow-2xs">
          <span className="block text-[11px] font-medium text-amber-800/80 dark:text-amber-300/80">Pending Review</span>
          <span className="text-2xl font-bold text-amber-950 dark:text-amber-100">
            {isLoading ? "-" : pendingCount}
          </span>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20 shadow-2xs">
          <span className="block text-[11px] font-medium text-red-800/80 dark:text-red-300/80">Confirmed Anomalies</span>
          <span className="text-2xl font-bold text-red-950 dark:text-red-100">
            {isLoading ? "-" : confirmedCount}
          </span>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 shadow-2xs">
          <span className="block text-[11px] font-medium text-zinc-400">Dismissed</span>
          <span className="text-2xl font-bold text-zinc-700 dark:text-zinc-300">
            {isLoading ? "-" : dismissedCount}
          </span>
        </div>
      </div>

      {/* Content Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-850"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-3xl">⚠️</span>
          <h3 className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
            Could not retrieve anomalies
          </h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-md mx-auto">{error}</p>
        </div>
      ) : anomalies.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-4xl">✅</span>
          <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-50">
            No active anomalies detected
          </h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
            All evaluated properties currently fall within expected statistical pricing thresholds for their local market.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {anomalies.map((item) => {
            const scoreNum = Number(item.anomalyScore);
            const scorePercent = Math.min(100, Math.round(scoreNum * 100));
            const isPending = item.status === "PENDING";
            const isReviewingThis = isReviewingId === item.anomalyId;

            return (
              <div
                key={item.anomalyId}
                className="group flex flex-col justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs transition-all duration-200 hover:border-amber-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-900/60 sm:flex-row sm:items-center"
              >
                <div
                  className="space-y-1.5 flex-1 cursor-pointer"
                  onClick={() => onSelectProperty(item.propertyId)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        item.status === "PENDING"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                          : item.status === "CONFIRMED"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="text-xs font-semibold text-zinc-500">
                      Property #{item.propertyId}
                    </span>
                    {item.property?.city && (
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {item.property.city}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-zinc-900 group-hover:text-amber-600 dark:text-zinc-50 dark:group-hover:text-amber-400 transition-colors">
                    {item.property?.title || `Property ID ${item.propertyId}`}
                  </h3>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    {item.reason}
                  </p>

                  <div className="text-[10px] text-zinc-400">
                    Detected: {formatDate(item.detectedAt)}
                  </div>
                </div>

                {/* Numbers, Score & Actions */}
                <div className="flex shrink-0 flex-col sm:items-end gap-2.5 border-t border-zinc-100 pt-3 sm:border-t-0 sm:pt-0 dark:border-zinc-800">
                  <div className="text-left sm:text-right">
                    <div className="text-xs text-zinc-400">
                      Actual:{" "}
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {formatPrice(item.actualPrice)}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Expected:{" "}
                      <span className="font-medium text-zinc-600 dark:text-zinc-400">
                        {formatPrice(item.expectedPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Anomaly score progress */}
                  <div className="w-full sm:w-36">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-0.5">
                      <span>Anomaly Score</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {scoreNum.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-300"
                        style={{ width: `${scorePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-end">
                    {/* Admin Review Actions - Only shown to authenticated ADMIN for PENDING anomalies */}
                    {isAdmin && isPending && onReviewAnomaly && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={Boolean(isReviewingId)}
                          onClick={() => onReviewAnomaly(item.anomalyId, "CONFIRMED")}
                          className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-red-700 disabled:opacity-50 transition-colors"
                          title="Confirm this price anomaly"
                        >
                          {isReviewingThis ? "..." : "Confirm"}
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(isReviewingId)}
                          onClick={() => onReviewAnomaly(item.anomalyId, "DISMISSED")}
                          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 transition-colors"
                          title="Dismiss this anomaly"
                        >
                          {isReviewingThis ? "..." : "Dismiss"}
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectProperty(item.propertyId)}
                      className="rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      Profile →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
