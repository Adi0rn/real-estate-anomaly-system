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
        <div className="rounded-lg border border-slate-200/90 bg-white p-4 shadow-2xs">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Total Flagged Units
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {isLoading ? "—" : anomalies.length}
            </span>
            <span className="text-[11px] text-slate-500 font-sans">listings</span>
          </div>
        </div>

        {/* Pending Review */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-amber-800">
            Pending Audit
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-950 font-mono tabular-nums">
              {isLoading ? "—" : pendingCount}
            </span>
            <span className="text-[11px] text-amber-800/80 font-sans">awaiting decision</span>
          </div>
        </div>

        {/* Confirmed Outliers */}
        <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4 shadow-2xs">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-rose-800">
            Confirmed Mispriced
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-rose-950 font-mono tabular-nums">
              {isLoading ? "—" : confirmedCount}
            </span>
            <span className="text-[11px] text-rose-800/80 font-sans">verified anomalies</span>
          </div>
        </div>

        {/* Dismissed False Positives */}
        <div className="rounded-lg border border-slate-200/90 bg-white p-4 shadow-2xs">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Dismissed / Clean
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-700 font-mono tabular-nums">
              {isLoading ? "—" : dismissedCount}
            </span>
            <span className="text-[11px] text-slate-500 font-sans">false alarms</span>
          </div>
        </div>
      </div>

      {/* Review Feedback Banner */}
      {reviewMessage && (
        <div
          className={`rounded-md p-3 text-xs font-medium flex items-center justify-between ${
            reviewMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <span>{reviewMessage.text}</span>
        </div>
      )}

      {/* Audit Table Container */}
      <div className="rounded-lg border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        {/* Table Control Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 p-4 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Pricing Anomaly Audit Queue
            </span>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              ({filteredAnomalies.length} items)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Tabs */}
            <div className="inline-flex rounded border border-slate-200 bg-white p-0.5 text-xs">
              {(["ALL", "PENDING", "CONFIRMED", "DISMISSED"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    statusFilter === tab
                      ? "bg-slate-900 text-white font-semibold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
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
              className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
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
              <div key={i} className="h-10 w-full animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <IconAlertTriangle className="mx-auto h-6 w-6 text-amber-600 mb-2" />
            <p className="font-semibold text-slate-800">Failed to load anomaly records</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : filteredAnomalies.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <IconShieldCheck className="mx-auto h-6 w-6 text-emerald-600 mb-2" />
            <p className="font-semibold text-slate-800">No anomalies in this category</p>
            <p className="mt-1">All properties conform to benchmark parameters or have been handled.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Property Asset</th>
                  <th className="px-4 py-3">Listed Asking Price</th>
                  <th className="px-4 py-3">Model Benchmark</th>
                  <th className="px-4 py-3">Variance</th>
                  <th className="px-4 py-3">Anomaly Score</th>
                  <th className="px-4 py-3">Audit Status</th>
                  <th className="px-4 py-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredAnomalies.map((item) => {
                  const scoreNum = parseFloat(item.anomalyScore);
                  const isPending = item.status === "PENDING";
                  const isReviewingThis = isReviewingId === item.anomalyId;

                  const diffNum = parseFloat(item.priceDifference);
                  const isOverpriced = diffNum > 0;

                  return (
                    <tr
                      key={item.anomalyId}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Property Title & ID */}
                      <td className="px-4 py-3 max-w-[240px]">
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectProperty(item.propertyId)}
                            className="font-semibold text-slate-900 hover:underline line-clamp-1 text-left"
                          >
                            {item.property?.title || `Property #${item.propertyId}`}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono">#{item.propertyId}</span>
                          <span>•</span>
                          <span>{item.property?.city || "Unknown"}</span>
                          <span>•</span>
                          <span>{item.property?.propertyType || "Unit"}</span>
                        </div>
                      </td>

                      {/* Actual Price */}
                      <td className="px-4 py-3 font-mono font-semibold text-slate-950 tabular-nums">
                        {formatINR(item.actualPrice)}
                      </td>

                      {/* Expected Price */}
                      <td className="px-4 py-3 font-mono text-slate-600 tabular-nums">
                        {formatINR(item.expectedPrice)}
                      </td>

                      {/* Variance */}
                      <td className="px-4 py-3 font-mono tabular-nums">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isOverpriced ? "text-amber-700" : "text-indigo-700"
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
                                ? "text-rose-700"
                                : scoreNum >= 0.4
                                ? "text-amber-700"
                                : "text-slate-700"
                            }`}
                          >
                            {scoreNum.toFixed(3)}
                          </span>
                          <div className="h-1.5 w-12 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={`h-full ${
                                scoreNum >= 0.7
                                  ? "bg-rose-600"
                                  : scoreNum >= 0.4
                                  ? "bg-amber-600"
                                  : "bg-slate-700"
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
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : item.status === "CONFIRMED"
                              ? "bg-rose-100 text-rose-900 border border-rose-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {isAdmin && isPending && onReviewAnomaly && (
                            <>
                              <button
                                type="button"
                                disabled={Boolean(isReviewingId)}
                                onClick={() => onReviewAnomaly(item.anomalyId, "CONFIRMED")}
                                className="rounded bg-rose-700 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-rose-800 disabled:opacity-50 transition-colors"
                                title="Confirm this pricing outlier"
                              >
                                {isReviewingThis ? "..." : "Confirm"}
                              </button>
                              <button
                                type="button"
                                disabled={Boolean(isReviewingId)}
                                onClick={() => onReviewAnomaly(item.anomalyId, "DISMISSED")}
                                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                title="Dismiss this false positive"
                              >
                                {isReviewingThis ? "..." : "Dismiss"}
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedAnomalyForDrawer(item)}
                            className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          <div className="relative z-10 w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Statistical Audit Breakdown
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Anomaly #{selectedAnomalyForDrawer.anomalyId} (Property #{selectedAnomalyForDrawer.propertyId})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnomalyForDrawer(null)}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded bg-slate-50 p-3 font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-sans block">Listed Price</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatINR(selectedAnomalyForDrawer.actualPrice)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-sans block">Benchmark Model</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatINR(selectedAnomalyForDrawer.expectedPrice)}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-900 block mb-1">
                  Algorithmic Deviation Justification:
                </span>
                <div className="rounded border border-amber-200 bg-amber-50/50 p-3 text-slate-800 leading-relaxed font-sans">
                  {selectedAnomalyForDrawer.reason}
                </div>
              </div>

              <div className="flex items-center justify-between text-slate-500 pt-2 border-t border-slate-100">
                <span>Detected: {formatDate(selectedAnomalyForDrawer.detectedAt)}</span>
                <Link
                  href={`/properties/${selectedAnomalyForDrawer.propertyId}`}
                  className="font-semibold text-slate-900 hover:underline"
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
