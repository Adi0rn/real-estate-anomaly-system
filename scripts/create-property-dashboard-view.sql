-- =============================================================================
-- SQL SCRIPT: CREATE REUSABLE DATABASE VIEW "PropertyDashboardSummary"
-- Project: Real Estate Anomaly Detection System (PropAudit)
-- Dialect: PostgreSQL 16+
-- =============================================================================
--
-- DESCRIPTION:
-- Aggregates property metadata, owner contact details, longitudinal price revision
-- history metrics, assigned amenity counts, and pricing anomaly audit status.
--
-- CRITICAL DBMS TECHNIQUE:
-- Uses COUNT(DISTINCT ph."priceId") and COUNT(DISTINCT pa."amenityId") to prevent
-- cartesian product row duplication caused by joining multiple 1-to-many child tables
-- (PriceHistory and PropertyAmenity) against the parent Property entity.
--
-- EXECUTION REQUIREMENTS:
-- 1. Prerequisites:
--    - Target database: PostgreSQL 15+ (with Supabase pgvector extension).
--    - Base tables: "Property", "User", "PriceHistory", "PropertyAmenity", "PropertyAnomaly".
-- 2. Non-Destructive Nature:
--    - Uses CREATE OR REPLACE VIEW.
--    - Does NOT alter, lock, modify, or delete any underlying tables or records.
-- 3. Execution Command:
--    psql $DATABASE_URL -f scripts/create-property-dashboard-view.sql
--    Or via Prisma $executeRawUnsafe() in an administrative migration context.
--
-- =============================================================================

CREATE OR REPLACE VIEW "PropertyDashboardSummary" AS
SELECT
  p."propertyId",
  p."title",
  p."propertyType",
  p."listingType",
  p."price"::numeric AS "price",
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
  MAX(ph."recordedAt") AS "latestPriceDate",
  COUNT(DISTINCT pa."amenityId")::int AS "amenityCount",
  COALESCE(panom."status", 'NONE') AS "anomalyStatus",
  panom."anomalyScore"::numeric AS "anomalyScore"
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

-- =============================================================================
-- VERIFICATION QUERY EXAMPLE:
-- =============================================================================
-- SELECT * FROM "PropertyDashboardSummary" WHERE "city" = 'Mumbai' ORDER BY "price" DESC LIMIT 10;
