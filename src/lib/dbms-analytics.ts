import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
});

export const db = new PrismaClient({ adapter });

/**
 * Raw Row Types from Database Queries
 */
type RawAnomalyJoinRow = {
  anomalyId: number | string;
  propertyId: number | string;
  expectedPrice: string;
  actualPrice: string;
  priceDifference: string;
  anomalyScore: string;
  reason: string;
  anomalyStatus: string;
  detectedAt: string;
  reviewedAt: string | null;
  propertyTitle: string;
  propertyType: string;
  listingType: string;
  city: string;
  state: string;
  areaSqft: number | string;
  bedrooms: number | string;
  bathrooms: number | string;
  propertyStatus: string;
  ownerId: number | string;
  ownerName: string;
  ownerEmail: string;
  reviewerId: number | string | null;
  reviewerName: string | null;
  reviewerEmail: string | null;
};

type RawCityAggregateRow = {
  city: string;
  propertyType: string;
  propertyCount: number | string;
  avgPrice: string;
  minPrice: string;
  maxPrice: string;
  avgPricePerSqft: string;
  avgAreaSqft: string;
};

type RawZScoreRow = {
  propertyId: number | string;
  title: string;
  city: string;
  propertyType: string;
  listingType: string;
  price: string;
  areaSqft: number | string;
  bedrooms: number | string;
  pricePerSqft: string;
  peerAvgPricePerSqft: string;
  peerStdDevPricePerSqft: string;
  peerCount: number | string;
  zScore: string;
  classification: "HIGH_OUTLIER" | "LOW_OUTLIER" | "MODERATE_HIGH" | "MODERATE_LOW" | "TYPICAL";
};

type RawPriceLagRow = {
  priceId: number | string;
  propertyId: number | string;
  propertyTitle: string;
  city: string;
  propertyType: string;
  currentPrice: string;
  previousPrice: string;
  priceDifference: string;
  percentChange: string;
  recordedAt: string;
  previousRecordedAt: string | null;
};

type RawSubqueryExcessRow = {
  propertyId: number | string;
  title: string;
  city: string;
  propertyType: string;
  actualPrice: string;
  areaSqft: number | string;
  bedrooms: number | string;
  peerGroupAvgPrice: string;
  excessAmount: string;
  excessPercentage: string;
};

type RawDashboardViewRow = {
  propertyId: number | string;
  title: string;
  propertyType: string;
  listingType: string;
  price: string;
  areaSqft: number | string;
  bedrooms: number | string;
  bathrooms: number | string;
  city: string;
  state: string;
  propertyStatus: string;
  ownerId: number | string;
  ownerName: string;
  ownerEmail: string;
  priceHistoryCount: number | string;
  latestPriceDate: string | null;
  amenityCount: number | string;
  anomalyStatus: string;
  anomalyScore: string | null;
};

type RawLockedPropertyRow = {
  propertyId: number | string;
  price: number | string;
};

type RawInsertedPriceHistoryRow = {
  priceId: number | string;
};

/**
 * Type definitions for DBMS Query Results
 */

export type AnomalyReviewJoinRow = {
  anomalyId: number;
  propertyId: number;
  expectedPrice: string;
  actualPrice: string;
  priceDifference: string;
  anomalyScore: string;
  reason: string;
  anomalyStatus: string;
  detectedAt: string;
  reviewedAt: string | null;
  propertyTitle: string;
  propertyType: string;
  listingType: string;
  city: string;
  state: string;
  areaSqft: number;
  bedrooms: number;
  bathrooms: number;
  propertyStatus: string;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  reviewerId: number | null;
  reviewerName: string | null;
  reviewerEmail: string | null;
};

export type CityTypeAggregateRow = {
  city: string;
  propertyType: string;
  propertyCount: number;
  avgPrice: string;
  minPrice: string;
  maxPrice: string;
  avgPricePerSqft: string;
  avgAreaSqft: string;
};

export type PeerGroupZScoreRow = {
  propertyId: number;
  title: string;
  city: string;
  propertyType: string;
  listingType: string;
  price: string;
  areaSqft: number;
  bedrooms: number;
  pricePerSqft: string;
  peerAvgPricePerSqft: string;
  peerStdDevPricePerSqft: string;
  peerCount: number;
  zScore: string;
  classification: "HIGH_OUTLIER" | "LOW_OUTLIER" | "MODERATE_HIGH" | "MODERATE_LOW" | "TYPICAL";
};

export type PriceHistoryLagRow = {
  priceId: number;
  propertyId: number;
  propertyTitle: string;
  city: string;
  propertyType: string;
  currentPrice: string;
  previousPrice: string;
  priceDifference: string;
  percentChange: string;
  recordedAt: string;
  previousRecordedAt: string | null;
};

export type CorrelatedSubqueryExcessRow = {
  propertyId: number;
  title: string;
  city: string;
  propertyType: string;
  actualPrice: string;
  areaSqft: number;
  bedrooms: number;
  peerGroupAvgPrice: string;
  excessAmount: string;
  excessPercentage: string;
};

export type PropertyDashboardSummaryRow = {
  propertyId: number;
  title: string;
  propertyType: string;
  listingType: string;
  price: string;
  areaSqft: number;
  bedrooms: number;
  bathrooms: number;
  city: string;
  state: string;
  propertyStatus: string;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  priceHistoryCount: number;
  latestPriceDate: string | null;
  amenityCount: number;
  anomalyStatus: string;
  anomalyScore: string | null;
};

// -----------------------------------------------------------------------------
// A. JOIN Query: Anomaly Review with Property, Owner & Reviewer
// -----------------------------------------------------------------------------
export async function getAnomalyReviewQueueWithJoins(options?: {
  status?: string;
  city?: string;
  limit?: number;
}): Promise<AnomalyReviewJoinRow[]> {
  const statusFilter = options?.status && options.status !== "ALL" ? options.status : null;
  const cityFilter = options?.city ? options.city.trim() : null;
  const limit = options?.limit && options.limit > 0 ? options.limit : 50;

  const rawRows = await db.$queryRaw<RawAnomalyJoinRow[]>`
    SELECT
      pa."anomalyId",
      pa."propertyId",
      pa."expectedPrice"::text AS "expectedPrice",
      pa."actualPrice"::text AS "actualPrice",
      pa."priceDifference"::text AS "priceDifference",
      pa."anomalyScore"::text AS "anomalyScore",
      pa."reason",
      pa."status" AS "anomalyStatus",
      pa."detectedAt"::text AS "detectedAt",
      pa."reviewedAt"::text AS "reviewedAt",
      p."title" AS "propertyTitle",
      p."propertyType",
      p."listingType",
      p."city",
      p."state",
      p."areaSqft",
      p."bedrooms",
      p."bathrooms",
      p."status" AS "propertyStatus",
      owner."userId" AS "ownerId",
      owner."name" AS "ownerName",
      owner."email" AS "ownerEmail",
      reviewer."userId" AS "reviewerId",
      reviewer."name" AS "reviewerName",
      reviewer."email" AS "reviewerEmail"
    FROM "PropertyAnomaly" pa
    JOIN "Property" p ON pa."propertyId" = p."propertyId"
    JOIN "User" owner ON p."ownerId" = owner."userId"
    LEFT JOIN "User" reviewer ON pa."reviewedBy" = reviewer."userId"
    WHERE (${statusFilter}::text IS NULL OR pa."status" = ${statusFilter})
      AND (${cityFilter}::text IS NULL OR p."city" = ${cityFilter})
    ORDER BY pa."anomalyScore" DESC, pa."detectedAt" DESC
    LIMIT ${limit};
  `;

  return rawRows.map((r) => ({
    anomalyId: Number(r.anomalyId),
    propertyId: Number(r.propertyId),
    expectedPrice: r.expectedPrice,
    actualPrice: r.actualPrice,
    priceDifference: r.priceDifference,
    anomalyScore: r.anomalyScore,
    reason: r.reason,
    anomalyStatus: r.anomalyStatus,
    detectedAt: r.detectedAt,
    reviewedAt: r.reviewedAt || null,
    propertyTitle: r.propertyTitle,
    propertyType: r.propertyType,
    listingType: r.listingType,
    city: r.city,
    state: r.state,
    areaSqft: Number(r.areaSqft),
    bedrooms: Number(r.bedrooms),
    bathrooms: Number(r.bathrooms),
    propertyStatus: r.propertyStatus,
    ownerId: Number(r.ownerId),
    ownerName: r.ownerName,
    ownerEmail: r.ownerEmail,
    reviewerId: r.reviewerId ? Number(r.reviewerId) : null,
    reviewerName: r.reviewerName || null,
    reviewerEmail: r.reviewerEmail || null,
  }));
}

// -----------------------------------------------------------------------------
// B. GROUP BY and HAVING: City and Property-Type Valuation Aggregates
// -----------------------------------------------------------------------------
export async function getCityPropertyTypeAggregates(options?: {
  minPropertiesPerGroup?: number;
  city?: string;
}): Promise<CityTypeAggregateRow[]> {
  const minCount = options?.minPropertiesPerGroup && options.minPropertiesPerGroup > 0
    ? options.minPropertiesPerGroup
    : 1;
  const cityFilter = options?.city ? options.city.trim() : null;

  const rawRows = await db.$queryRaw<RawCityAggregateRow[]>`
    SELECT
      p."city",
      p."propertyType",
      COUNT(*)::int AS "propertyCount",
      ROUND(AVG(p."price"), 2)::text AS "avgPrice",
      MIN(p."price")::text AS "minPrice",
      MAX(p."price")::text AS "maxPrice",
      ROUND(AVG(p."price" / NULLIF(p."areaSqft", 0)), 2)::text AS "avgPricePerSqft",
      ROUND(AVG(p."areaSqft"), 1)::text AS "avgAreaSqft"
    FROM "Property" p
    WHERE p."status" = 'ACTIVE'
      AND (${cityFilter}::text IS NULL OR p."city" = ${cityFilter})
    GROUP BY p."city", p."propertyType"
    HAVING COUNT(*) >= ${minCount}
    ORDER BY p."city" ASC, ROUND(AVG(p."price"), 2) DESC;
  `;

  return rawRows.map((r) => ({
    city: r.city,
    propertyType: r.propertyType,
    propertyCount: Number(r.propertyCount),
    avgPrice: r.avgPrice,
    minPrice: r.minPrice,
    maxPrice: r.maxPrice,
    avgPricePerSqft: r.avgPricePerSqft,
    avgAreaSqft: r.avgAreaSqft,
  }));
}

// -----------------------------------------------------------------------------
// C. CTEs and Window Functions: Multi-Stage Statistical Z-Score Outlier Analysis
// -----------------------------------------------------------------------------
export async function getValuationZScoreOutliers(options?: {
  zThreshold?: number;
  minPeerCount?: number;
  city?: string;
  limit?: number;
}): Promise<PeerGroupZScoreRow[]> {
  const zThreshold = options?.zThreshold !== undefined && options.zThreshold >= 0
    ? options.zThreshold
    : 1.5;
  const minPeerCount = options?.minPeerCount && options.minPeerCount > 0
    ? options.minPeerCount
    : 3;
  const cityFilter = options?.city ? options.city.trim() : null;
  const limit = options?.limit && options.limit > 0 ? options.limit : 50;

  const rawRows = await db.$queryRaw<RawZScoreRow[]>`
    WITH PropertyMetrics AS (
      SELECT
        p."propertyId",
        p."title",
        p."city",
        p."propertyType",
        p."listingType",
        p."price",
        p."areaSqft",
        p."bedrooms",
        (p."price" / NULLIF(p."areaSqft", 0)) AS "pricePerSqft"
      FROM "Property" p
      WHERE p."status" = 'ACTIVE'
        AND (${cityFilter}::text IS NULL OR p."city" = ${cityFilter})
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
        ROUND(pg."peerAvgPricePerSqft", 2) AS "roundedPeerAvgPricePerSqft",
        ROUND(COALESCE(pg."peerStdDevPricePerSqft", 0), 2) AS "roundedPeerStdDev"
      FROM PeerGroupStats pg
      WHERE pg."peerCount" >= ${minPeerCount}
    )
    SELECT
      vs."propertyId",
      vs."title",
      vs."city",
      vs."propertyType",
      vs."listingType",
      vs."price"::text AS "price",
      vs."areaSqft",
      vs."bedrooms",
      vs."roundedPricePerSqft"::text AS "pricePerSqft",
      vs."roundedPeerAvgPricePerSqft"::text AS "peerAvgPricePerSqft",
      vs."roundedPeerStdDev"::text AS "peerStdDevPricePerSqft",
      vs."peerCount"::int AS "peerCount",
      ROUND(vs."zScore"::numeric, 2)::text AS "zScore",
      CASE
        WHEN vs."zScore" >= 2.0 THEN 'HIGH_OUTLIER'
        WHEN vs."zScore" <= -2.0 THEN 'LOW_OUTLIER'
        WHEN vs."zScore" >= 1.5 THEN 'MODERATE_HIGH'
        WHEN vs."zScore" <= -1.5 THEN 'MODERATE_LOW'
        ELSE 'TYPICAL'
      END AS "classification"
    FROM ValuationScores vs
    WHERE ABS(vs."zScore") >= ${zThreshold}
    ORDER BY ABS(vs."zScore") DESC
    LIMIT ${limit};
  `;

  return rawRows.map((r) => ({
    propertyId: Number(r.propertyId),
    title: r.title,
    city: r.city,
    propertyType: r.propertyType,
    listingType: r.listingType,
    price: r.price,
    areaSqft: Number(r.areaSqft),
    bedrooms: Number(r.bedrooms),
    pricePerSqft: r.pricePerSqft,
    peerAvgPricePerSqft: r.peerAvgPricePerSqft,
    peerStdDevPricePerSqft: r.peerStdDevPricePerSqft,
    peerCount: Number(r.peerCount),
    zScore: r.zScore,
    classification: r.classification,
  }));
}

// -----------------------------------------------------------------------------
// D. Window Functions: Price-History Audit Trail using LAG()
// -----------------------------------------------------------------------------
export async function getPriceHistoryLagAudit(options?: {
  propertyId?: number;
  limit?: number;
}): Promise<PriceHistoryLagRow[]> {
  const propertyIdFilter = options?.propertyId && options.propertyId > 0 ? options.propertyId : null;
  const limit = options?.limit && options.limit > 0 ? options.limit : 50;

  const rawRows = await db.$queryRaw<RawPriceLagRow[]>`
    WITH PriceAuditTrail AS (
      SELECT
        ph."priceId",
        ph."propertyId",
        p."title" AS "propertyTitle",
        p."city",
        p."propertyType",
        ph."price" AS "currentPrice",
        LAG(ph."price") OVER (
          PARTITION BY ph."propertyId"
          ORDER BY ph."recordedAt" ASC, ph."priceId" ASC
        ) AS "previousPrice",
        ph."recordedAt",
        LAG(ph."recordedAt") OVER (
          PARTITION BY ph."propertyId"
          ORDER BY ph."recordedAt" ASC, ph."priceId" ASC
        ) AS "previousRecordedAt"
      FROM "PriceHistory" ph
      JOIN "Property" p ON ph."propertyId" = p."propertyId"
      WHERE (${propertyIdFilter}::int IS NULL OR ph."propertyId" = ${propertyIdFilter})
    )
    SELECT
      pat."priceId",
      pat."propertyId",
      pat."propertyTitle",
      pat."city",
      pat."propertyType",
      pat."currentPrice"::text AS "currentPrice",
      pat."previousPrice"::text AS "previousPrice",
      (pat."currentPrice" - pat."previousPrice")::text AS "priceDifference",
      ROUND(
        CASE
          WHEN pat."previousPrice" IS NULL OR pat."previousPrice" = 0 THEN 0
          ELSE ((pat."currentPrice" - pat."previousPrice") / pat."previousPrice") * 100
        END,
        2
      )::text AS "percentChange",
      pat."recordedAt"::text AS "recordedAt",
      pat."previousRecordedAt"::text AS "previousRecordedAt"
    FROM PriceAuditTrail pat
    WHERE pat."previousPrice" IS NOT NULL
    ORDER BY pat."propertyId" ASC, pat."recordedAt" DESC, pat."priceId" DESC
    LIMIT ${limit};
  `;

  return rawRows.map((r) => ({
    priceId: Number(r.priceId),
    propertyId: Number(r.propertyId),
    propertyTitle: r.propertyTitle,
    city: r.city,
    propertyType: r.propertyType,
    currentPrice: r.currentPrice,
    previousPrice: r.previousPrice,
    priceDifference: r.priceDifference,
    percentChange: r.percentChange,
    recordedAt: r.recordedAt,
    previousRecordedAt: r.previousRecordedAt || null,
  }));
}

// -----------------------------------------------------------------------------
// E. Correlated Subquery: Properties Priced Above Comparable Peer Average
// -----------------------------------------------------------------------------
export async function getPropertiesAbovePeerAverage(options?: {
  minPeerCount?: number;
  city?: string;
  limit?: number;
}): Promise<CorrelatedSubqueryExcessRow[]> {
  const minPeers = options?.minPeerCount && options.minPeerCount > 0 ? options.minPeerCount : 3;
  const cityFilter = options?.city ? options.city.trim() : null;
  const limit = options?.limit && options.limit > 0 ? options.limit : 50;

  const rawRows = await db.$queryRaw<RawSubqueryExcessRow[]>`
    SELECT
      p1."propertyId",
      p1."title",
      p1."city",
      p1."propertyType",
      p1."price"::text AS "actualPrice",
      p1."areaSqft",
      p1."bedrooms",
      ROUND(
        (
          SELECT AVG(p2."price")
          FROM "Property" p2
          WHERE p2."city" = p1."city"
            AND p2."propertyType" = p1."propertyType"
            AND p2."propertyId" != p1."propertyId"
            AND p2."status" = 'ACTIVE'
        ),
        2
      )::text AS "peerGroupAvgPrice",
      ROUND(
        p1."price" - (
          SELECT AVG(p2."price")
          FROM "Property" p2
          WHERE p2."city" = p1."city"
            AND p2."propertyType" = p1."propertyType"
            AND p2."propertyId" != p1."propertyId"
            AND p2."status" = 'ACTIVE'
        ),
        2
      )::text AS "excessAmount",
      ROUND(
        (
          (p1."price" - (
            SELECT AVG(p2."price")
            FROM "Property" p2
            WHERE p2."city" = p1."city"
              AND p2."propertyType" = p1."propertyType"
              AND p2."propertyId" != p1."propertyId"
              AND p2."status" = 'ACTIVE'
          )) / NULLIF(
            (
              SELECT AVG(p2."price")
              FROM "Property" p2
              WHERE p2."city" = p1."city"
                AND p2."propertyType" = p1."propertyType"
                AND p2."propertyId" != p1."propertyId"
                AND p2."status" = 'ACTIVE'
            ),
            0
          )
        ) * 100,
        2
      )::text AS "excessPercentage"
    FROM "Property" p1
    WHERE p1."status" = 'ACTIVE'
      AND (${cityFilter}::text IS NULL OR p1."city" = ${cityFilter})
      AND p1."price" > (
        SELECT AVG(p2."price")
        FROM "Property" p2
        WHERE p2."city" = p1."city"
          AND p2."propertyType" = p1."propertyType"
          AND p2."propertyId" != p1."propertyId"
          AND p2."status" = 'ACTIVE'
      )
      AND (
        SELECT COUNT(*)
        FROM "Property" p2
        WHERE p2."city" = p1."city"
          AND p2."propertyType" = p1."propertyType"
          AND p2."propertyId" != p1."propertyId"
          AND p2."status" = 'ACTIVE'
      ) >= ${minPeers}
    ORDER BY (
      (p1."price" - (
        SELECT AVG(p2."price")
        FROM "Property" p2
        WHERE p2."city" = p1."city"
          AND p2."propertyType" = p1."propertyType"
          AND p2."propertyId" != p1."propertyId"
          AND p2."status" = 'ACTIVE'
      )) / NULLIF(
        (
          SELECT AVG(p2."price")
          FROM "Property" p2
          WHERE p2."city" = p1."city"
            AND p2."propertyType" = p1."propertyType"
            AND p2."propertyId" != p1."propertyId"
            AND p2."status" = 'ACTIVE'
        ),
        0
      )
    ) DESC
    LIMIT ${limit};
  `;

  return rawRows.map((r) => ({
    propertyId: Number(r.propertyId),
    title: r.title,
    city: r.city,
    propertyType: r.propertyType,
    actualPrice: r.actualPrice,
    areaSqft: Number(r.areaSqft),
    bedrooms: Number(r.bedrooms),
    peerGroupAvgPrice: r.peerGroupAvgPrice,
    excessAmount: r.excessAmount,
    excessPercentage: r.excessPercentage,
  }));
}

// -----------------------------------------------------------------------------
// F. Reusable View Query Definition: PropertyDashboardSummary
// -----------------------------------------------------------------------------
export const PROPERTY_DASHBOARD_SUMMARY_VIEW_SQL = `
CREATE OR REPLACE VIEW "PropertyDashboardSummary" AS
SELECT
  p."propertyId",
  p."title",
  p."propertyType",
  p."listingType",
  p."price"::text AS "price",
  p."areaSqft",
  p."bedrooms",
  p."bathrooms",
  p."city",
  p."state",
  p."status" AS "propertyStatus",
  u."userId" AS "ownerId",
  u."name" AS "ownerName",
  u."email" AS "ownerEmail",
  COUNT(DISTINCT ph."priceId")::int AS "priceHistoryCount",
  MAX(ph."recordedAt")::text AS "latestPriceDate",
  COUNT(DISTINCT pa."amenityId")::int AS "amenityCount",
  COALESCE(panom."status", 'NONE') AS "anomalyStatus",
  panom."anomalyScore"::text AS "anomalyScore"
FROM "Property" p
JOIN "User" u ON p."ownerId" = u."userId"
LEFT JOIN "PriceHistory" ph ON p."propertyId" = ph."propertyId"
LEFT JOIN "PropertyAmenity" pa ON p."propertyId" = pa."propertyId"
LEFT JOIN "PropertyAnomaly" panom ON p."propertyId" = panom."propertyId"
GROUP BY
  p."propertyId",
  p."title",
  p."propertyType",
  p."listingType",
  p."price",
  p."areaSqft",
  p."bedrooms",
  p."bathrooms",
  p."city",
  p."state",
  p."status",
  u."userId",
  u."name",
  u."email",
  panom."status",
  panom."anomalyScore";
`;

/**
 * Executes a simulated query matching the exact projection and logic of the
 * PropertyDashboardSummary view without mutating the live database schema.
 */
export async function queryPropertyDashboardSummary(options?: {
  city?: string;
  propertyType?: string;
  limit?: number;
}): Promise<PropertyDashboardSummaryRow[]> {
  const cityFilter = options?.city ? options.city.trim() : null;
  const typeFilter = options?.propertyType ? options.propertyType.trim().toUpperCase() : null;
  const limit = options?.limit && options.limit > 0 ? options.limit : 50;

  const rawRows = await db.$queryRaw<RawDashboardViewRow[]>`
    SELECT
      p."propertyId",
      p."title",
      p."propertyType",
      p."listingType",
      p."price"::text AS "price",
      p."areaSqft",
      p."bedrooms",
      p."bathrooms",
      p."city",
      p."state",
      p."status" AS "propertyStatus",
      u."userId" AS "ownerId",
      u."name" AS "ownerName",
      u."email" AS "ownerEmail",
      COUNT(DISTINCT ph."priceId")::int AS "priceHistoryCount",
      MAX(ph."recordedAt")::text AS "latestPriceDate",
      COUNT(DISTINCT pa."amenityId")::int AS "amenityCount",
      COALESCE(panom."status", 'NONE') AS "anomalyStatus",
      panom."anomalyScore"::text AS "anomalyScore"
    FROM "Property" p
    JOIN "User" u ON p."ownerId" = u."userId"
    LEFT JOIN "PriceHistory" ph ON p."propertyId" = ph."propertyId"
    LEFT JOIN "PropertyAmenity" pa ON p."propertyId" = pa."propertyId"
    LEFT JOIN "PropertyAnomaly" panom ON p."propertyId" = panom."propertyId"
    WHERE (${cityFilter}::text IS NULL OR p."city" = ${cityFilter})
      AND (${typeFilter}::text IS NULL OR p."propertyType" = ${typeFilter})
    GROUP BY
      p."propertyId",
      p."title",
      p."propertyType",
      p."listingType",
      p."price",
      p."areaSqft",
      p."bedrooms",
      p."bathrooms",
      p."city",
      p."state",
      p."status",
      u."userId",
      u."name",
      u."email",
      panom."status",
      panom."anomalyScore"
    ORDER BY p."propertyId" ASC
    LIMIT ${limit};
  `;

  return rawRows.map((r) => ({
    propertyId: Number(r.propertyId),
    title: r.title,
    propertyType: r.propertyType,
    listingType: r.listingType,
    price: r.price,
    areaSqft: Number(r.areaSqft),
    bedrooms: Number(r.bedrooms),
    bathrooms: Number(r.bathrooms),
    city: r.city,
    state: r.state,
    propertyStatus: r.propertyStatus,
    ownerId: Number(r.ownerId),
    ownerName: r.ownerName,
    ownerEmail: r.ownerEmail,
    priceHistoryCount: Number(r.priceHistoryCount),
    latestPriceDate: r.latestPriceDate || null,
    amenityCount: Number(r.amenityCount),
    anomalyStatus: r.anomalyStatus,
    anomalyScore: r.anomalyScore || null,
  }));
}

// -----------------------------------------------------------------------------
// G. Atomic Transaction Demonstration (Update Property + Insert PriceHistory)
// -----------------------------------------------------------------------------
export async function executeAtomicPriceUpdateTransaction(
  propertyId: number,
  newPrice: number,
  options?: { shouldRollback?: boolean }
): Promise<{
  success: boolean;
  propertyId: number;
  oldPrice: number;
  newPrice: number;
  priceHistoryId: number;
  rolledBack: boolean;
}> {
  return await db.$transaction(async (tx) => {
    // 1. Lock target property row for update
    const [current] = await tx.$queryRaw<RawLockedPropertyRow[]>`
      SELECT "propertyId", "price"::numeric FROM "Property"
      WHERE "propertyId" = ${propertyId}
      FOR UPDATE;
    `;

    if (!current) {
      throw new Error(`Property #${propertyId} does not exist.`);
    }

    const oldPrice = Number(current.price);

    // 2. Insert into PriceHistory audit log
    const [insertedHistory] = await tx.$queryRaw<RawInsertedPriceHistoryRow[]>`
      INSERT INTO "PriceHistory" ("propertyId", "price", "recordedAt")
      VALUES (${propertyId}, ${newPrice}, NOW())
      RETURNING "priceId";
    `;

    // 3. Atomically update Property price and updatedAt
    await tx.$executeRaw`
      UPDATE "Property"
      SET "price" = ${newPrice}, "updatedAt" = NOW()
      WHERE "propertyId" = ${propertyId};
    `;

    if (options?.shouldRollback) {
      throw new Error("ATOMIC_TRANSACTION_TEST_ROLLBACK: Cleanly reverting demonstration transaction.");
    }

    return {
      success: true,
      propertyId,
      oldPrice,
      newPrice,
      priceHistoryId: Number(insertedHistory.priceId),
      rolledBack: false,
    };
  }).catch((err) => {
    if (err.message.includes("ATOMIC_TRANSACTION_TEST_ROLLBACK")) {
      return {
        success: true,
        propertyId,
        oldPrice: 0,
        newPrice,
        priceHistoryId: 0,
        rolledBack: true,
      };
    }
    throw err;
  });
}
