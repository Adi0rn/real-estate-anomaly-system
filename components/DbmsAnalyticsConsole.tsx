"use client";

import React, { useState, useEffect } from "react";
import {
  AnomalyReviewJoinRow,
  CityTypeAggregateRow,
  PeerGroupZScoreRow,
  PriceHistoryLagRow,
  CorrelatedSubqueryExcessRow,
  PropertyDashboardSummaryRow,
} from "@/types";
import { formatINR } from "@/src/lib/property-images";
import {
  IconBuilding,
  IconRefresh,
  IconTrendingUp,
  IconTrendingDown,
  IconMapPin,
} from "@/components/icons";

type TabKey =
  | "aggregates"
  | "outliers"
  | "price-history"
  | "subquery"
  | "joins"
  | "view-summary";

export default function DbmsAnalyticsConsole() {
  const [activeTab, setActiveTab] = useState<TabKey>("aggregates");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState<number>(0);

  // Tab Data States
  const [aggregates, setAggregates] = useState<CityTypeAggregateRow[]>([]);
  const [outliers, setOutliers] = useState<PeerGroupZScoreRow[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryLagRow[]>([]);
  const [subqueryRows, setSubqueryRows] = useState<CorrelatedSubqueryExcessRow[]>([]);
  const [joinRows, setJoinRows] = useState<AnomalyReviewJoinRow[]>([]);
  const [viewSummaryRows, setViewSummaryRows] = useState<PropertyDashboardSummaryRow[]>([]);

  // Interactive Query Parameters
  const [minGroupCount, setMinGroupCount] = useState<number>(1);
  const [zThreshold, setZThreshold] = useState<number>(1.5);
  const [minPeerCount, setMinPeerCount] = useState<number>(3);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let url = `/api/admin/analytics?tab=${
          activeTab === "subquery" ? "subquery-excess" : activeTab === "view-summary" ? "dashboard-view" : activeTab
        }`;

        if (activeTab === "aggregates") {
          url += `&minGroupCount=${minGroupCount}`;
        } else if (activeTab === "outliers") {
          url += `&zThreshold=${zThreshold}&minPeerCount=${minPeerCount}`;
        } else if (activeTab === "price-history" && selectedPropertyId) {
          url += `&propertyId=${selectedPropertyId}`;
        } else if (activeTab === "subquery") {
          url += `&minPeerCount=${minPeerCount}`;
        }

        const res = await fetch(url);
        const json = await res.json();
        if (ignore) return;

        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to fetch ${activeTab} data.`);
        }

        if (activeTab === "aggregates") setAggregates(json.data || []);
        else if (activeTab === "outliers") setOutliers(json.data || []);
        else if (activeTab === "price-history") setPriceHistory(json.data || []);
        else if (activeTab === "subquery") setSubqueryRows(json.data || []);
        else if (activeTab === "joins") setJoinRows(json.data || []);
        else if (activeTab === "view-summary") setViewSummaryRows(json.data || []);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Error executing analytical query.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      ignore = true;
    };
  }, [activeTab, minGroupCount, zThreshold, minPeerCount, selectedPropertyId, refreshIndex]);

  // Tabs metadata
  const tabs = [
    {
      key: "aggregates" as TabKey,
      label: "GROUP BY & Aggregates",
      concept: "GROUP BY, HAVING, AVG, MIN, MAX",
      badge: "Market Metrics",
    },
    {
      key: "outliers" as TabKey,
      label: "Valuation CTEs (Z-Scores)",
      concept: "WITH clauses, AVG OVER, STDDEV_SAMP OVER",
      badge: "Window Functions",
    },
    {
      key: "price-history" as TabKey,
      label: "Price Audit Trail (LAG)",
      concept: "LAG() OVER (PARTITION BY ... ORDER BY ...)",
      badge: "Historical Audit",
    },
    {
      key: "subquery" as TabKey,
      label: "Above-Peer Subquery",
      concept: "Correlated Subquery (WHERE price > (SELECT AVG...))",
      badge: "Subqueries",
    },
    {
      key: "joins" as TabKey,
      label: "Anomaly Review JOINs",
      concept: "JOIN PropertyAnomaly + Property + User (Owner & Reviewer)",
      badge: "Multi-Table JOINs",
    },
    {
      key: "view-summary" as TabKey,
      label: "Dashboard View (COUNT DISTINCT)",
      concept: "Database View + COUNT(DISTINCT) anti-inflation",
      badge: "SQL Views",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Console Section Header */}
      <div className="rounded-lg border border-slate-200/90 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-5 shadow-2xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-1">
              <IconBuilding className="w-3.5 h-3.5" />
              <span>Level 3 DBMS Analytical Query Engine</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Advanced Relational Database Analytics
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-[#a1a8b0] max-w-2xl leading-relaxed">
              Explore enterprise PostgreSQL analytics demonstrating relational JOINs, multi-level aggregation, correlated subqueries, multi-stage CTEs, and partition window functions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSqlModal(!showSqlModal)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-[#30363d] bg-slate-50 dark:bg-[#202428] px-3 py-1.5 text-xs font-mono font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#282d33] transition-colors"
            >
              <span>{showSqlModal ? "Hide Active SQL" : "View Active SQL"}</span>
            </button>

            <button
              type="button"
              onClick={() => setRefreshIndex((prev) => prev + 1)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#202428] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#282d33] disabled:opacity-50 transition-colors"
            >
              <IconRefresh className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Re-execute</span>
            </button>
          </div>
        </div>

        {/* Tab Selector Strip */}
        <div className="mt-5 border-t border-slate-200 dark:border-[#30363d] pt-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex flex-col items-start px-3 py-2 rounded-md border text-left transition-all whitespace-nowrap ${
                    isActive
                      ? "border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                      : "border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#15181b] text-slate-700 dark:text-[#a1a8b0] hover:border-slate-400 dark:hover:border-slate-600"
                  }`}
                >
                  <span className="text-xs font-semibold">{tab.label}</span>
                  <span
                    className={`text-[10px] font-mono mt-0.5 ${
                      isActive ? "text-slate-300 dark:text-slate-700" : "text-slate-500 dark:text-slate-500"
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SQL Inspection Drawer / Box */}
      {showSqlModal && (
        <div className="rounded-lg border border-slate-200 dark:border-[#30363d] bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-emerald-400 font-bold uppercase tracking-wider">
              Parameterized SQL Statement • Active Tab: {activeTab}
            </span>
            <span className="text-slate-400 text-[11px]">Dialect: PostgreSQL 16 (pgvector enabled)</span>
          </div>
          <pre className="text-slate-200 leading-relaxed overflow-x-auto whitespace-pre-wrap">
            {activeTab === "aggregates" &&
`SELECT
  p."city",
  p."propertyType",
  COUNT(*)::int AS "propertyCount",
  ROUND(AVG(p."price"), 2)::numeric AS "avgPrice",
  MIN(p."price")::numeric AS "minPrice",
  MAX(p."price")::numeric AS "maxPrice",
  ROUND(AVG(p."price" / NULLIF(p."areaSqft", 0)), 2)::numeric AS "avgPricePerSqft",
  ROUND(AVG(p."areaSqft"), 1)::numeric AS "avgAreaSqft"
FROM "Property" p
WHERE p."status" = 'ACTIVE'
GROUP BY p."city", p."propertyType"
HAVING COUNT(*) >= $1
ORDER BY p."city" ASC, ROUND(AVG(p."price"), 2) DESC;`}

            {activeTab === "outliers" &&
`WITH PropertyMetrics AS (
  SELECT
    p."propertyId", p."title", p."city", p."propertyType", p."listingType",
    p."price", p."areaSqft", p."bedrooms",
    (p."price" / NULLIF(p."areaSqft", 0)) AS "pricePerSqft"
  FROM "Property" p
  WHERE p."status" = 'ACTIVE'
),
PeerGroupStats AS (
  SELECT
    pm.*,
    AVG(pm."pricePerSqft") OVER (PARTITION BY pm."city", pm."propertyType") AS "peerAvgPricePerSqft",
    STDDEV_SAMP(pm."pricePerSqft") OVER (PARTITION BY pm."city", pm."propertyType") AS "peerStdDevPricePerSqft",
    COUNT(*) OVER (PARTITION BY pm."city", pm."propertyType") AS "peerCount"
  FROM PropertyMetrics pm
),
ValuationScores AS (
  SELECT
    pg.*,
    CASE
      WHEN pg."peerStdDevPricePerSqft" IS NULL OR pg."peerStdDevPricePerSqft" = 0 THEN 0
      ELSE (pg."pricePerSqft" - pg."peerAvgPricePerSqft") / pg."peerStdDevPricePerSqft"
    END AS "zScore",
    ROUND(pg."pricePerSqft", 2) AS "roundedPricePerSqft",
    ROUND(pg."peerAvgPricePerSqft", 2) AS "roundedPeerAvgPricePerSqft"
  FROM PeerGroupStats pg
  WHERE pg."peerCount" >= $2
)
SELECT * FROM ValuationScores vs
WHERE ABS(vs."zScore") >= $1
ORDER BY ABS(vs."zScore") DESC;`}

            {activeTab === "price-history" &&
`WITH PriceAuditTrail AS (
  SELECT
    ph."priceId", ph."propertyId", p."title" AS "propertyTitle", p."city", p."propertyType",
    ph."price" AS "currentPrice",
    LAG(ph."price") OVER (PARTITION BY ph."propertyId" ORDER BY ph."recordedAt" ASC, ph."priceId" ASC) AS "previousPrice",
    ph."recordedAt",
    LAG(ph."recordedAt") OVER (PARTITION BY ph."propertyId" ORDER BY ph."recordedAt" ASC, ph."priceId" ASC) AS "previousRecordedAt"
  FROM "PriceHistory" ph
  JOIN "Property" p ON ph."propertyId" = p."propertyId"
  WHERE ($1::int IS NULL OR ph."propertyId" = $1)
)
SELECT
  pat.*,
  (pat."currentPrice" - pat."previousPrice") AS "priceDifference",
  ROUND(((pat."currentPrice" - pat."previousPrice") / pat."previousPrice") * 100, 2) AS "percentChange"
FROM PriceAuditTrail pat
WHERE pat."previousPrice" IS NOT NULL
ORDER BY pat."propertyId" ASC, pat."recordedAt" DESC, pat."priceId" DESC;`}

            {activeTab === "subquery" &&
`SELECT
  p1."propertyId", p1."title", p1."city", p1."propertyType",
  p1."price" AS "actualPrice", p1."areaSqft", p1."bedrooms",
  ROUND((
    SELECT AVG(p2."price") FROM "Property" p2
    WHERE p2."city" = p1."city" AND p2."propertyType" = p1."propertyType"
      AND p2."propertyId" != p1."propertyId" AND p2."status" = 'ACTIVE'
  ), 2) AS "peerGroupAvgPrice",
  ROUND(p1."price" - (
    SELECT AVG(p2."price") FROM "Property" p2
    WHERE p2."city" = p1."city" AND p2."propertyType" = p1."propertyType"
      AND p2."propertyId" != p1."propertyId" AND p2."status" = 'ACTIVE'
  ), 2) AS "excessAmount"
FROM "Property" p1
WHERE p1."status" = 'ACTIVE'
  AND p1."price" > (
    SELECT AVG(p2."price") FROM "Property" p2
    WHERE p2."city" = p1."city" AND p2."propertyType" = p1."propertyType"
      AND p2."propertyId" != p1."propertyId" AND p2."status" = 'ACTIVE'
  )
ORDER BY "excessAmount" DESC;`}

            {activeTab === "joins" &&
`SELECT
  pa."anomalyId", pa."propertyId", pa."anomalyScore", pa."status" AS "anomalyStatus",
  p."title" AS "propertyTitle", p."city", p."propertyType", p."price",
  owner."userId" AS "ownerId", owner."name" AS "ownerName", owner."email" AS "ownerEmail",
  reviewer."userId" AS "reviewerId", reviewer."name" AS "reviewerName", reviewer."email" AS "reviewerEmail"
FROM "PropertyAnomaly" pa
JOIN "Property" p ON pa."propertyId" = p."propertyId"
JOIN "User" owner ON p."ownerId" = owner."userId"
LEFT JOIN "User" reviewer ON pa."reviewedBy" = reviewer."userId"
ORDER BY pa."anomalyScore" DESC;`}

            {activeTab === "view-summary" &&
`-- VIEW DEFINITION (PropertyDashboardSummary)
CREATE OR REPLACE VIEW "PropertyDashboardSummary" AS
SELECT
  p."propertyId", p."title", p."propertyType", p."price", p."city",
  u."name" AS "ownerName", u."email" AS "ownerEmail",
  COUNT(DISTINCT ph."priceId")::int AS "priceHistoryCount",
  MAX(ph."recordedAt") AS "latestPriceDate",
  COUNT(DISTINCT pa."amenityId")::int AS "amenityCount",
  COALESCE(panom."status", 'NONE') AS "anomalyStatus"
FROM "Property" p
JOIN "User" u ON p."ownerId" = u."userId"
LEFT JOIN "PriceHistory" ph ON p."propertyId" = ph."propertyId"
LEFT JOIN "PropertyAmenity" pa ON p."propertyId" = pa."propertyId"
LEFT JOIN "PropertyAnomaly" panom ON p."propertyId" = panom."propertyId"
GROUP BY p."propertyId", p."title", p."propertyType", p."price", p."city",
         u."userId", u."name", u."email", panom."status", panom."anomalyScore";`}
          </pre>
        </div>
      )}

      {/* Main Tab Content Panel */}
      <div className="rounded-lg border border-slate-200/90 dark:border-[#30363d] bg-white dark:bg-[#191c1f] shadow-2xs overflow-hidden transition-colors">
        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border-b border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: GROUP BY & AGGREGATES */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "aggregates" && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-[#15181b] p-3 rounded-md border border-slate-200 dark:border-[#30363d]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                  Market Valuation Aggregates by City & Type
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-[#a1a8b0]">
                  Evaluates <code className="font-mono text-slate-700 dark:text-slate-300">GROUP BY p.city, p.propertyType</code> with aggregate functions <code className="font-mono text-slate-700 dark:text-slate-300">AVG()</code>, <code className="font-mono text-slate-700 dark:text-slate-300">MIN()</code>, <code className="font-mono text-slate-700 dark:text-slate-300">MAX()</code>.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <label className="text-slate-600 dark:text-slate-300 font-medium">
                  HAVING COUNT(*) &gt;=
                </label>
                <select
                  value={minGroupCount}
                  onChange={(e) => setMinGroupCount(Number(e.target.value))}
                  className="rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#202428] px-2 py-1 text-xs text-slate-900 dark:text-white"
                >
                  <option value={1}>1 listing</option>
                  <option value={3}>3 listings</option>
                  <option value={5}>5 listings</option>
                  <option value={7}>7 listings</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Computing SQL Aggregates...</div>
            ) : aggregates.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No groups satisfy HAVING condition.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#15181b]/50 text-slate-600 dark:text-[#a1a8b0] font-semibold">
                      <th className="py-2.5 px-3">City</th>
                      <th className="py-2.5 px-3">Property Type</th>
                      <th className="py-2.5 px-3 text-right">Sample Count</th>
                      <th className="py-2.5 px-3 text-right">Average Price</th>
                      <th className="py-2.5 px-3 text-right">Price Range (Min — Max)</th>
                      <th className="py-2.5 px-3 text-right">Avg Price / Sqft</th>
                      <th className="py-2.5 px-3 text-right">Avg Area (sqft)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#252a30]">
                    {aggregates.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-[#202428]/50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          <span className="inline-flex items-center gap-1">
                            <IconMapPin className="w-3 h-3 text-slate-400" />
                            {row.city}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {row.propertyType}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                          {row.propertyCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-950 dark:text-white">
                          {formatINR(row.avgPrice, true)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                          {formatINR(row.minPrice, true)} — {formatINR(row.maxPrice, true)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-200">
                          ₹{Number(row.avgPricePerSqft).toLocaleString("en-IN")}/sqft
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                          {row.avgAreaSqft} sqft
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: CTEs & WINDOW FUNCTIONS (Z-SCORES) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "outliers" && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-[#15181b] p-3 rounded-md border border-slate-200 dark:border-[#30363d]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                  Multi-Stage Statistical Z-Score Outlier Analysis
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-[#a1a8b0]">
                  Utilizes <code className="font-mono text-slate-700 dark:text-slate-300">WITH</code> clauses and window functions <code className="font-mono text-slate-700 dark:text-slate-300">AVG(...) OVER (PARTITION BY city, propertyType)</code> and <code className="font-mono text-slate-700 dark:text-slate-300">STDDEV_SAMP(...) OVER (...)</code> to calculate standard deviations.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <label className="text-slate-600 dark:text-slate-300 font-medium">|Z| Threshold:</label>
                  <select
                    value={zThreshold}
                    onChange={(e) => setZThreshold(Number(e.target.value))}
                    className="rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#202428] px-2 py-1 text-xs text-slate-900 dark:text-white"
                  >
                    <option value={1.0}>1.0 (Mild)</option>
                    <option value={1.5}>1.5 (Moderate)</option>
                    <option value={2.0}>2.0 (Extreme)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-slate-600 dark:text-slate-300 font-medium">Min Peers:</label>
                  <select
                    value={minPeerCount}
                    onChange={(e) => setMinPeerCount(Number(e.target.value))}
                    className="rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#202428] px-2 py-1 text-xs text-slate-900 dark:text-white"
                  >
                    <option value={3}>3 listings</option>
                    <option value={5}>5 listings</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 p-3 text-[11px] text-amber-900 dark:text-amber-300">
              <strong>Methodology Note:</strong> This query is an independent statistical benchmark computing Z-scores on price per sq.ft. It serves as an analytical comparison tool and does not replace the primary median-based ML anomaly detection pipeline.
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Calculating Window Functions...</div>
            ) : outliers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No properties exceed |Z| &gt;= {zThreshold}.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#15181b]/50 text-slate-600 dark:text-[#a1a8b0] font-semibold">
                      <th className="py-2.5 px-3">Listing</th>
                      <th className="py-2.5 px-3">Location &amp; Type</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-right">Unit Price/Sqft</th>
                      <th className="py-2.5 px-3 text-right">Peer Group Mean</th>
                      <th className="py-2.5 px-3 text-right">Peer Std Dev (σ)</th>
                      <th className="py-2.5 px-3 text-right">Z-Score</th>
                      <th className="py-2.5 px-3 text-center">Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#252a30]">
                    {outliers.map((row) => {
                      const isHigh = Number(row.zScore) > 0;
                      return (
                        <tr key={row.propertyId} className="hover:bg-slate-50/80 dark:hover:bg-[#202428]/50 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              #{row.propertyId} — {row.title}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {row.bedrooms} Beds • {row.areaSqft} sqft
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {row.city} • {row.propertyType}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatINR(row.price, true)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                            ₹{Number(row.pricePerSqft).toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            ₹{Number(row.peerAvgPricePerSqft).toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500 text-[11px]">
                            ±₹{Number(row.peerStdDevPricePerSqft).toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span className={isHigh ? "text-rose-600 dark:text-rose-400" : "text-sky-600 dark:text-sky-400"}>
                              {Number(row.zScore) > 0 ? `+${row.zScore}` : row.zScore}σ
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                row.classification.includes("HIGH")
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                  : "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                              }`}
                            >
                              {row.classification}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: PRICE AUDIT TRAIL (LAG) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "price-history" && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-[#15181b] p-3 rounded-md border border-slate-200 dark:border-[#30363d]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                  Longitudinal Price Revision Audit Trail
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-[#a1a8b0]">
                  Utilizes <code className="font-mono text-slate-700 dark:text-slate-300">LAG(price) OVER (PARTITION BY propertyId ORDER BY recordedAt ASC)</code> to detect historical price adjustments.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <label className="text-slate-600 dark:text-slate-300 font-medium">Filter Property ID:</label>
                <input
                  type="number"
                  placeholder="All (or e.g. 1)"
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-24 rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#202428] px-2 py-1 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Computing LAG() differences...</div>
            ) : priceHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No multi-revision price records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#15181b]/50 text-slate-600 dark:text-[#a1a8b0] font-semibold">
                      <th className="py-2.5 px-3">Property</th>
                      <th className="py-2.5 px-3">Market</th>
                      <th className="py-2.5 px-3 text-right">Previous Price</th>
                      <th className="py-2.5 px-3 text-right">Revised Price</th>
                      <th className="py-2.5 px-3 text-right">Delta (₹)</th>
                      <th className="py-2.5 px-3 text-right">Shift (%)</th>
                      <th className="py-2.5 px-3 text-right">Effective Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#252a30]">
                    {priceHistory.map((row) => {
                      const isUp = Number(row.percentChange) >= 0;
                      return (
                        <tr key={row.priceId} className="hover:bg-slate-50/80 dark:hover:bg-[#202428]/50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                            #{row.propertyId} — {row.propertyTitle}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {row.city} • {row.propertyType}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatINR(row.previousPrice, true)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatINR(row.currentPrice, true)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            <span className={isUp ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                              {isUp ? `+₹${Number(row.priceDifference).toLocaleString("en-IN")}` : `-₹${Math.abs(Number(row.priceDifference)).toLocaleString("en-IN")}`}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${
                                isUp
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              }`}
                            >
                              {isUp ? <IconTrendingUp className="w-3 h-3" /> : <IconTrendingDown className="w-3 h-3" />}
                              {Number(row.percentChange) > 0 ? `+${row.percentChange}%` : `${row.percentChange}%`}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500 text-[11px]">
                            {new Date(row.recordedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: ABOVE-PEER SUBQUERY */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "subquery" && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-[#15181b] p-3 rounded-md border border-slate-200 dark:border-[#30363d]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                  Correlated Subquery: Properties Priced Above Peer Average
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-[#a1a8b0]">
                  Evaluates <code className="font-mono text-slate-700 dark:text-slate-300">WHERE p1.price &gt; (SELECT AVG(p2.price) FROM Property p2 WHERE p2.city = p1.city AND p2.propertyType = p1.propertyType AND p2.propertyId != p1.propertyId)</code>.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <label className="text-slate-600 dark:text-slate-300 font-medium">Min Peers Required:</label>
                <select
                  value={minPeerCount}
                  onChange={(e) => setMinPeerCount(Number(e.target.value))}
                  className="rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#202428] px-2 py-1 text-xs text-slate-900 dark:text-white"
                >
                  <option value={2}>2 peers</option>
                  <option value={3}>3 peers</option>
                  <option value={5}>5 peers</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Executing Correlated Subquery...</div>
            ) : subqueryRows.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No properties exceed peer group average.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#15181b]/50 text-slate-600 dark:text-[#a1a8b0] font-semibold">
                      <th className="py-2.5 px-3">Property</th>
                      <th className="py-2.5 px-3">Market Segment</th>
                      <th className="py-2.5 px-3 text-right">Actual Price</th>
                      <th className="py-2.5 px-3 text-right">Peer Group Avg</th>
                      <th className="py-2.5 px-3 text-right">Excess Amount</th>
                      <th className="py-2.5 px-3 text-right">Premium Over Peers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#252a30]">
                    {subqueryRows.map((row) => (
                      <tr key={row.propertyId} className="hover:bg-slate-50/80 dark:hover:bg-[#202428]/50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          #{row.propertyId} — {row.title}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {row.city} • {row.propertyType}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatINR(row.actualPrice, true)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                          {formatINR(row.peerGroupAvgPrice, true)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-amber-700 dark:text-amber-400 font-semibold">
                          +₹{Number(row.excessAmount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          +{row.excessPercentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 5: ANOMALY REVIEW JOINS */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "joins" && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="bg-slate-50 dark:bg-[#15181b] p-3 rounded-md border border-slate-200 dark:border-[#30363d]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                Multi-Table Relational JOIN Audit
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#a1a8b0]">
                Joins <code className="font-mono text-slate-700 dark:text-slate-300">PropertyAnomaly</code>, <code className="font-mono text-slate-700 dark:text-slate-300">Property</code>, <code className="font-mono text-slate-700 dark:text-slate-300">User (as Property Owner)</code>, and <code className="font-mono text-slate-700 dark:text-slate-300">User (as Reviewer via LEFT JOIN)</code>.
              </p>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Executing Multi-Table JOIN...</div>
            ) : joinRows.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No anomalies recorded in database.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#15181b]/50 text-slate-600 dark:text-[#a1a8b0] font-semibold">
                      <th className="py-2.5 px-3">Anomaly</th>
                      <th className="py-2.5 px-3">Listing Details</th>
                      <th className="py-2.5 px-3">Property Owner (User Table)</th>
                      <th className="py-2.5 px-3">Reviewer (User Table)</th>
                      <th className="py-2.5 px-3 text-right">Anomaly Score</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#252a30]">
                    {joinRows.map((row) => (
                      <tr key={row.anomalyId} className="hover:bg-slate-50/80 dark:hover:bg-[#202428]/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 dark:text-white">#{row.anomalyId}</span>
                          <span className="block text-[10px] text-slate-500 font-mono">
                            {new Date(row.detectedAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            #{row.propertyId} — {row.propertyTitle}
                          </span>
                          <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                            {row.city} • {row.propertyType} • {formatINR(row.actualPrice, true)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                            {row.ownerName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">{row.ownerEmail}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          {row.reviewerName ? (
                            <div>
                              <span className="font-semibold text-indigo-700 dark:text-indigo-400 block">
                                {row.reviewerName}
                              </span>
                              <span className="font-mono text-[10px] text-slate-500">
                                {row.reviewedAt ? new Date(row.reviewedAt).toLocaleDateString() : ""}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 italic">Unassigned (Pending)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                          {row.anomalyScore}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              row.anomalyStatus === "CONFIRMED"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                : row.anomalyStatus === "DISMISSED"
                                ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {row.anomalyStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 6: DASHBOARD VIEW SUMMARY */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "view-summary" && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="bg-slate-50 dark:bg-[#15181b] p-3 rounded-md border border-slate-200 dark:border-[#30363d]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                PropertyDashboardSummary SQL View (Anti-Inflation Joins)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#a1a8b0]">
                Demonstrates a reusable database view combining property information, owner contacts, price revision count, and amenity counts using <code className="font-mono text-slate-700 dark:text-slate-300">COUNT(DISTINCT ph.priceId)</code> and <code className="font-mono text-slate-700 dark:text-slate-300">COUNT(DISTINCT pa.amenityId)</code>.
              </p>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Querying View Simulator...</div>
            ) : viewSummaryRows.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No properties found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#15181b]/50 text-slate-600 dark:text-[#a1a8b0] font-semibold">
                      <th className="py-2.5 px-3">Property</th>
                      <th className="py-2.5 px-3">Owner Details</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-center">Price History Count</th>
                      <th className="py-2.5 px-3 text-right">Latest Revision</th>
                      <th className="py-2.5 px-3 text-center">Amenities Count</th>
                      <th className="py-2.5 px-3 text-center">Anomaly Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#252a30]">
                    {viewSummaryRows.map((row) => (
                      <tr key={row.propertyId} className="hover:bg-slate-50/80 dark:hover:bg-[#202428]/50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          #{row.propertyId} — {row.title}
                          <span className="block text-[10px] text-slate-500 font-mono">
                            {row.city} • {row.propertyType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                            {row.ownerName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">{row.ownerEmail}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatINR(row.price, true)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">
                            {row.priceHistoryCount}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500 text-[11px]">
                          {row.latestPriceDate ? new Date(row.latestPriceDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold">
                            {row.amenityCount}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              row.anomalyStatus !== "NONE"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {row.anomalyStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
