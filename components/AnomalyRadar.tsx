"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AnomalyRecord } from "@/types";
import {
  IconAlertTriangle,
  IconShieldCheck,
  IconX,
  IconRefresh,
  IconTrendingUp,
  IconTrendingDown,
} from "@/components/icons";
import { formatINR } from "@/src/lib/property-images";

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
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "CONFIRMED" | "DISMISSED">("ALL");
  const [selectedAnomalyForDrawer, setSelectedAnomalyForDrawer] = useState<AnomalyRecord | null>(null);

  const pendingCount = anomalies.filter((a) => a.status === "PENDING").length;
  const confirmedCount = anomalies.filter((a) => a.status === "CONFIRMED").length;
  const dismissedCount = anomalies.filter((a) => a.status === "DISMISSED").length;

  const filteredAnomalies = anomalies.filter((item) => {
    if (statusFilter === "ALL") return true;
    return item.status === statusFilter;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Flagged */}
        <div className="rounded-lg border border-slate-200/90 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-4 shadow-2xs transition-colors">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#a1a8b0]">
            Total Flagged Units
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {isLoading ? "—" : anomalies.length}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-[#a1a8b0] font-sans">listings</span>
          </div>
        </div>

        {/* Pending Review */}
        <div className="rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 shadow-2xs transition-colors">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            Pending Audit
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-950 dark:text-amber-200 font-mono tabular-nums">
              {isLoading ? "—" : pendingCount}
            </span>
            <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-sans">awaiting decision</span>
          </div>
        </div>

        {/* Confirmed Outliers */}
        <div className="rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 shadow-2xs transition-colors">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-300">
            Confirmed Mispriced
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-rose-950 dark:text-rose-200 font-mono tabular-nums">
              {isLoading ? "—" : confirmedCount}
            </span>
            <span className="text-[11px] text-rose-800/80 dark:text-rose-300/80 font-sans">verified anomalies</span>
          </div>
        </div>

        {/* Dismissed False Positives */}
        <div className="rounded-lg border border-slate-200/90 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-4 shadow-2xs transition-colors">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#a1a8b0]">
            Dismissed / Clean
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-700 dark:text-slate-300 font-mono tabular-nums">
              {isLoading ? "—" : dismissedCount}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-[#a1a8b0] font-sans">false alarms</span>
          </div>
        </div>
      </div>

      {/* Review Feedback Banner */}
      {reviewMessage && (
        <div
          className={`rounded-md p-3 text-xs font-medium flex items-center justify-between ${
            reviewMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
              : "bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
          }`}
        >
          <span>{reviewMessage.text}</span>
        </div>
      )}

      {/* Audit Table Container */}
      <div className="rounded-lg border border-slate-200/90 dark:border-[#30363d] bg-white dark:bg-[#191c1f] shadow-2xs overflow-hidden transition-colors">
        {/* Table Control Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#30363d] p-4 bg-slate-50/60 dark:bg-[#15181b]/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Pricing Anomaly Audit Queue
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono tabular-nums">
              ({filteredAnomalies.length} items)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tabs */}
            <div className="inline-flex rounded border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#111315] p-0.5 text-xs">
              {(["ALL", "PENDING", "CONFIRMED", "DISMISSED"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    statusFilter === tab
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs"
                      : "text-slate-600 dark:text-[#a1a8b0] hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Refresh Feed */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#202428] px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#272c33] disabled:opacity-50 transition-colors"
            >
              <IconRefresh className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded bg-slate-100 dark:bg-[#202428]" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center text-xs text-slate-500 dark:text-[#a1a8b0]">
            <IconAlertTriangle className="mx-auto h-6 w-6 text-amber-600 dark:text-amber-400 mb-2" />
            <p className="font-semibold text-slate-800 dark:text-slate-200">Failed to load anomaly records</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : filteredAnomalies.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 dark:text-[#a1a8b0]">
            <IconShieldCheck className="mx-auto h-6 w-6 text-emerald-600 dark:text-emerald-400 mb-2" />
            <p className="font-semibold text-slate-800 dark:text-slate-200">No anomalies in this category</p>
            <p className="mt-1">All properties conform to benchmark parameters or have been handled.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-xs divide-y divide-slate-200 dark:divide-[#30363d]">
              <thead className="bg-slate-50 dark:bg-[#202428] text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#a1a8b0]">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Property Asset</th>
                  <th className="px-4 py-3 whitespace-nowrap">Listed Asking Price</th>
                  <th className="px-4 py-3 whitespace-nowrap">Model Benchmark</th>
                  <th className="px-4 py-3 whitespace-nowrap">Variance</th>
                  <th className="px-4 py-3 whitespace-nowrap">Anomaly Score</th>
                  <th className="px-4 py-3 whitespace-nowrap">Audit Status</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#30363d] font-sans">
                {filteredAnomalies.map((item) => {
                  const scoreNum = parseFloat(item.anomalyScore);
                  const isPending = item.status === "PENDING";
                  const isReviewingThis = isReviewingId === item.anomalyId;

                  const diffNum = parseFloat(item.priceDifference);
                  const isOverpriced = diffNum > 0;

                  return (
                    <tr
                      key={item.anomalyId}
                      className="hover:bg-slate-50/70 dark:hover:bg-[#202428]/60 transition-colors"
                    >
                      {/* Property Title & ID */}
                      <td className="px-4 py-3 max-w-[240px]">
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectProperty(item.propertyId)}
                            className="font-semibold text-slate-900 dark:text-white hover:underline line-clamp-1 text-left"
                          >
                            {item.property?.title || `Property #${item.propertyId}`}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#a1a8b0] mt-0.5">
                          <span className="font-mono">#{item.propertyId}</span>
                          <span>•</span>
                          <span>{item.property?.city || "Unknown"}</span>
                          <span>•</span>
                          <span>{item.property?.propertyType || "Unit"}</span>
                        </div>
                      </td>

                      {/* Actual Price */}
                      <td className="px-4 py-3 font-mono font-semibold text-slate-950 dark:text-white tabular-nums">
                        {formatINR(item.actualPrice)}
                      </td>

                      {/* Expected Price */}
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-[#a1a8b0] tabular-nums">
                        {formatINR(item.expectedPrice)}
                      </td>

                      {/* Variance */}
                      <td className="px-4 py-3 font-mono tabular-nums">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isOverpriced ? "text-amber-700 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400"
                          }`}
                        >
                          {isOverpriced ? (
                            <IconTrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <IconTrendingDown className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isOverpriced ? "+" : ""}
                            {formatINR(item.priceDifference)}
                          </span>
                        </span>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3 font-mono tabular-nums">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              scoreNum >= 0.7
                                ? "text-rose-700 dark:text-rose-400"
                                : scoreNum >= 0.4
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {scoreNum.toFixed(3)}
                          </span>
                          <div className="h-1.5 w-12 rounded-full bg-slate-200 dark:bg-[#272c33] overflow-hidden">
                            <div
                              className={`h-full ${
                                scoreNum >= 0.7
                                  ? "bg-rose-600 dark:bg-rose-500"
                                  : scoreNum >= 0.4
                                  ? "bg-amber-600 dark:bg-amber-500"
                                  : "bg-slate-700 dark:bg-slate-400"
                              }`}
                              style={{ width: `${Math.min(100, Math.round(scoreNum * 100))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            item.status === "PENDING"
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                              : item.status === "CONFIRMED"
                              ? "bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
                              : "bg-slate-100 dark:bg-[#202428] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#30363d]"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {isAdmin && isPending && onReviewAnomaly && (
                            <>
                              <button
                                type="button"
                                disabled={Boolean(isReviewingId)}
                                onClick={() => onReviewAnomaly(item.anomalyId, "CONFIRMED")}
                                className="rounded bg-rose-700 dark:bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-rose-800 dark:hover:bg-rose-700 disabled:opacity-50 transition-colors"
                                title="Confirm this pricing outlier"
                              >
                                {isReviewingThis ? "..." : "Confirm"}
                              </button>
                              <button
                                type="button"
                                disabled={Boolean(isReviewingId)}
                                onClick={() => onReviewAnomaly(item.anomalyId, "DISMISSED")}
                                className="rounded border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#202428] px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-[#272c33] disabled:opacity-50 transition-colors"
                                title="Dismiss this false positive"
                              >
                                {isReviewingThis ? "..." : "Dismiss"}
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedAnomalyForDrawer(item)}
                            className="rounded border border-slate-200 dark:border-[#30363d] bg-slate-50 dark:bg-[#202428] px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#272c33] transition-colors"
                          >
                            Inspect Reason
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reason Details Modal Drawer */}
      {selectedAnomalyForDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedAnomalyForDrawer(null)}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs"
          />

          <div className="relative z-10 w-full max-w-lg max-h-[calc(100vh-2.5rem)] overflow-y-auto rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-6 shadow-xl transition-colors">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#30363d] pb-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Statistical Audit Breakdown
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Anomaly #{selectedAnomalyForDrawer.anomalyId} (Property #{selectedAnomalyForDrawer.propertyId})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnomalyForDrawer(null)}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded bg-slate-50 dark:bg-[#202428] p-3 font-mono">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-sans block">Listed Price</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {formatINR(selectedAnomalyForDrawer.actualPrice)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-sans block">Benchmark Model</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {formatINR(selectedAnomalyForDrawer.expectedPrice)}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-900 dark:text-white block mb-1">
                  Algorithmic Deviation Justification:
                </span>
                <div className="rounded border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                  {selectedAnomalyForDrawer.reason}
                </div>
              </div>

              <div className="flex items-center justify-between text-slate-500 dark:text-[#a1a8b0] pt-2 border-t border-slate-100 dark:border-[#30363d]">
                <span>Detected: {formatDate(selectedAnomalyForDrawer.detectedAt)}</span>
                <Link
                  href={`/properties/${selectedAnomalyForDrawer.propertyId}`}
                  className="font-semibold text-slate-900 dark:text-white hover:underline"
                >
                  View Property Page →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
