import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth";
import {
  getAnomalyReviewQueueWithJoins,
  getCityPropertyTypeAggregates,
  getValuationZScoreOutliers,
  getPriceHistoryLagAudit,
  getPropertiesAbovePeerAverage,
  queryPropertyDashboardSummary,
} from "@/src/lib/dbms-analytics";

export async function GET(request: NextRequest) {
  try {
    // 1. Mandatory Admin Authentication Guard
    const authCheck = await requireAdmin(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "all";
    const city = searchParams.get("city") || undefined;
    const propertyType = searchParams.get("propertyType") || undefined;
    const limit = searchParams.get("limit") ? Math.min(200, Math.max(1, parseInt(searchParams.get("limit")!, 10) || 50)) : 50;

    // Numerical params with safe fallbacks
    const zThreshold = searchParams.get("zThreshold") ? parseFloat(searchParams.get("zThreshold")!) : 1.5;
    const minPeerCount = searchParams.get("minPeerCount") ? parseInt(searchParams.get("minPeerCount")!, 10) : 3;
    const minPropertiesPerGroup = searchParams.get("minGroupCount") ? parseInt(searchParams.get("minGroupCount")!, 10) : 1;
    const propertyId = searchParams.get("propertyId") ? parseInt(searchParams.get("propertyId")!, 10) : undefined;

    // Validate params
    if (isNaN(zThreshold) || zThreshold < 0) {
      return NextResponse.json(
        { success: false, error: "Invalid zThreshold parameter. Must be a non-negative number." },
        { status: 400 }
      );
    }

    if (isNaN(minPeerCount) || minPeerCount < 1) {
      return NextResponse.json(
        { success: false, error: "Invalid minPeerCount parameter. Must be an integer >= 1." },
        { status: 400 }
      );
    }

    // Dispatch by requested tab
    switch (tab) {
      case "joins": {
        const joins = await getAnomalyReviewQueueWithJoins({ city, limit });
        return NextResponse.json({
          success: true,
          concept: "Multi-Table JOINs (PropertyAnomaly + Property + User Owner + User Reviewer)",
          count: joins.length,
          data: joins,
        });
      }

      case "aggregates": {
        const aggregates = await getCityPropertyTypeAggregates({ minPropertiesPerGroup, city });
        return NextResponse.json({
          success: true,
          concept: "GROUP BY, HAVING, and Aggregate Metrics (AVG, MIN, MAX, Price/SqFt)",
          count: aggregates.length,
          data: aggregates,
        });
      }

      case "outliers": {
        const outliers = await getValuationZScoreOutliers({ zThreshold, minPeerCount, city, limit });
        return NextResponse.json({
          success: true,
          concept: "CTEs (WITH clauses) and Window Functions (AVG OVER, STDDEV_SAMP OVER, Z-score)",
          count: outliers.length,
          data: outliers,
        });
      }

      case "price-history": {
        const priceHistory = await getPriceHistoryLagAudit({ propertyId, limit });
        return NextResponse.json({
          success: true,
          concept: "Window Function LAG() for Longitudinal Price Audit Trail",
          count: priceHistory.length,
          data: priceHistory,
        });
      }

      case "subquery-excess": {
        const excess = await getPropertiesAbovePeerAverage({ minPeerCount, city, limit });
        return NextResponse.json({
          success: true,
          concept: "Correlated Subqueries (Properties exceeding peer group average)",
          count: excess.length,
          data: excess,
        });
      }

      case "dashboard-view": {
        const viewRows = await queryPropertyDashboardSummary({ city, propertyType, limit });
        return NextResponse.json({
          success: true,
          concept: "Database View (PropertyDashboardSummary with COUNT(DISTINCT ...))",
          count: viewRows.length,
          data: viewRows,
        });
      }

      case "all":
      default: {
        const [joins, aggregates, outliers, priceHistory, excess, viewSummary] = await Promise.all([
          getAnomalyReviewQueueWithJoins({ city, limit: 10 }),
          getCityPropertyTypeAggregates({ minPropertiesPerGroup, city }),
          getValuationZScoreOutliers({ zThreshold: 1.5, minPeerCount: 3, city, limit: 10 }),
          getPriceHistoryLagAudit({ propertyId, limit: 10 }),
          getPropertiesAbovePeerAverage({ minPeerCount: 3, city, limit: 10 }),
          queryPropertyDashboardSummary({ city, propertyType, limit: 10 }),
        ]);

        return NextResponse.json({
          success: true,
          timestamp: new Date().toISOString(),
          data: {
            joins,
            aggregates,
            outliers,
            priceHistory,
            excess,
            viewSummary,
          },
        });
      }
    }
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "digest" in error) {
      const digest = (error as { digest?: unknown }).digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_")) {
        throw error;
      }
    }
    console.error("Admin Analytics API error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
