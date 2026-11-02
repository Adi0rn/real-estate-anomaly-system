# PropAudit DBMS SQL Query Catalog & Relational Implementation Specification

**Document Version:** 1.0.0
**Target Architecture:** PostgreSQL 15+ / Supabase with `pgvector`
**ORM & Query Interface:** Prisma ORM (`$queryRawUnsafe` with explicit parameterization & `$transaction`)
**Application Engine:** Next.js 16 (App Router), React 19, TypeScript
**Compliance Level:** Level 3 DBMS Relational Requirements

---

## 1. Executive Summary & Architecture Overview

PropAudit is an enterprise real estate valuation and pricing anomaly detection system. While previous iterations leveraged machine-learning heuristics and pgvector embeddings for vector similarity search, this module expands PropAudit's relational database management system (DBMS) foundation to meet rigorous Level 3 relational database standards.

The relational analytics engine introduces seven major SQL paradigms without altering the underlying production database schema, modifying the core ML anomaly detection algorithm, or executing destructive seed/reset commands:
1. **Multi-Table Relational JOINs with Aliases and Null-Tolerant Resolution:** Unifies anomalies, property attributes, owner identities, and optional assigned reviewer data.
2. **Aggregations with GROUP BY and HAVING:** Provides city- and property-type market summaries, pruning small sample sizes via dynamic threshold filters.
3. **Common Table Expressions (CTEs) & Window Functions:** Computes statistical distributions (running averages, standard deviations) and calculates valuation Z-scores for peer-group outlier detection.
4. **Time-Series Analysis with `LAG()` Window Function:** Traces chronological price changes across historical recordings, computing delta and percentage shifts.
5. **Correlated Subqueries:** Compares each listing's price directly against the dynamically computed mean price of its specific city and property type.
6. **Relational View & Anti-Cartesian Aggregations:** Aggregates multi-table one-to-many relationships (`PriceHistory` and `PropertyAmenity`) using `COUNT(DISTINCT)` to prevent Cartesian row inflation.
7. **ACID Transaction Demonstration:** Employs row-level locking (`SELECT ... FOR UPDATE`), atomic price updates, and price history auditing within an isolated rollback boundary for non-destructive live verification.

---

## 2. Relational Query Catalog

### Query A: Multi-Table Anomaly Review Queue (`JOIN`)

- **DBMS Concept Demonstrated:** `INNER JOIN`, `LEFT JOIN` (self-referential join to `User`), table aliasing, multi-column sorting, and null-tolerant status resolution.
- **PropAudit Business Purpose:** Enables administrators to review detected pricing anomalies in context, joining property specifications, seller/owner contact information, and audit assignment status (whether reviewed or pending assignment) in a single optimized database roundtrip.
- **TypeScript Engine Implementation:** [`src/lib/dbms-analytics.ts`](file:///c:/Users/abhyu/Documents/DBMS/miniproj/real-estate-anomaly-system/src/lib/dbms-analytics.ts) &rarr; `getAnomalyReviewQueueWithJoins()`
- **API Endpoint:** `GET /api/admin/analytics?tab=joins`
- **UI Component:** `components/DbmsAnalyticsConsole.tsx` (Tab: "1. Anomaly Queue (JOIN)")

#### Parameterized SQL Statement
```sql
SELECT
  a."anomalyId",
  a."propertyId",
  p."title" AS "propertyTitle",
  p."city",
  p."propertyType",
  p."price",
  p."areaSqft",
  a."anomalyType",
  a."severity",
  a."score",
  a."status",
  a."detectedAt",
  u_owner."userId" AS "ownerId",
  u_owner."name" AS "ownerName",
  u_owner."email" AS "ownerEmail",
  u_reviewer."userId" AS "reviewerId",
  u_reviewer."name" AS "reviewerName"
FROM "PropertyAnomaly" a
INNER JOIN "Property" p ON a."propertyId" = p."propertyId"
INNER JOIN "User" u_owner ON p."ownerId" = u_owner."userId"
LEFT JOIN "User" u_reviewer ON a."reviewedBy" = u_reviewer."userId"
ORDER BY
  CASE a."severity"
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 3
    ELSE 4
  END ASC,
  a."score" DESC,
  a."detectedAt" DESC
LIMIT $1;
```

#### Result Structure & Type Contract
```typescript
export interface AnomalyReviewJoinRow {
  anomalyId: number;
  propertyId: number;
  propertyTitle: string;
  city: string;
  propertyType: string;
  price: number;
  areaSqft: number;
  anomalyType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  score: number;
  status: "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED";
  detectedAt: string;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  reviewerId: number | null;
  reviewerName: string | null;
}
```

---

### Query B: City & Property-Type Market Aggregation (`GROUP BY & HAVING`)

- **DBMS Concept Demonstrated:** Aggregate functions (`COUNT`, `AVG`, `MIN`, `MAX`), multi-attribute grouping (`GROUP BY p."city", p."propertyType"`), and dynamic post-aggregation filtering (`HAVING COUNT(p."propertyId") >= $1`).
- **PropAudit Business Purpose:** Generates market-level intelligence for property pricing analysts and valuation monitors, computing the average price per square foot and filtering out statistically unrepresentative cohorts.
- **TypeScript Engine Implementation:** [`src/lib/dbms-analytics.ts`](file:///c:/Users/abhyu/Documents/DBMS/miniproj/real-estate-anomaly-system/src/lib/dbms-analytics.ts) &rarr; `getCityPropertyTypeAggregates()`
- **API Endpoint:** `GET /api/admin/analytics?tab=aggregates&minCount=2`
- **UI Component:** `components/DbmsAnalyticsConsole.tsx` (Tab: "2. Market Aggregates (GROUP BY)")

#### Parameterized SQL Statement
```sql
SELECT
  p."city",
  p."propertyType",
  COUNT(p."propertyId")::int AS "propertyCount",
  ROUND(AVG(p."price"), 2)::float AS "avgPrice",
  MIN(p."price")::float AS "minPrice",
  MAX(p."price")::float AS "maxPrice",
  ROUND(AVG(p."price" / NULLIF(p."areaSqft", 0)), 2)::float AS "avgPricePerSqft"
FROM "Property" p
WHERE p."status" = 'ACTIVE'
GROUP BY p."city", p."propertyType"
HAVING COUNT(p."propertyId") >= $1
ORDER BY p."city" ASC, "avgPrice" DESC;
```

#### Result Structure & Type Contract
```typescript
export interface CityTypeAggregateRow {
  city: string;
  propertyType: string;
  propertyCount: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPricePerSqft: number;
}
```

---

### Query C: Multi-Stage Statistical Outliers (`CTEs & Window Functions`)

- **DBMS Concept Demonstrated:** Common Table Expressions (`WITH BaseMetrics AS (...)`, `PeerGroupStats AS (...)`), window functions with partitioning (`AVG(...) OVER (PARTITION BY ...)`, `STDDEV_SAMP(...) OVER (PARTITION BY ...)`), and statistical Z-score outlier derivation.
- **PropAudit Business Purpose:** Provides a relational, transparent benchmark for peer-group outlier detection that complements the existing ML anomaly detection pipeline without replacing it. Flags listings diverging significantly (|Z| &ge; threshold) from local peer distributions.
- **Statistical Design & Safety Controls:**
  - **Peer Group Minimum Size ($N \ge 3$):** Sample standard deviation (`STDDEV_SAMP`) requires at least $N \ge 2$ data points to avoid division by zero in $N-1$ degrees of freedom. With $N = 2$, Z-scores degenerate to $\pm 0.7071$. Setting a minimum peer group count of $\ge 3$ (default) ensures the calculated mean and variance reflect a viable cohort.
  - **NULL and Zero Variance Handling:** If all properties in a cohort share the exact same price per sqft (variance = 0) or if a cohort lacks sufficient samples, `STDDEV_SAMP` yields `0.0` or `NULL`. The query wraps the Z-score calculation in a safe conditional:
    `CASE WHEN pg."peerStdDevPricePerSqft" IS NULL OR pg."peerStdDevPricePerSqft" = 0 THEN 0 ELSE (pg."pricePerSqft" - pg."peerAvgPricePerSqft") / pg."peerStdDevPricePerSqft" END AS "zScore"`
    This prevents division-by-zero runtime exceptions and maps zero-variance listings to a safe `0.0` Z-score (`TYPICAL`).
  - **Sample vs. Population Standard Deviation:** Uses `STDDEV_SAMP` ($s = \sqrt{\frac{1}{N-1}\sum (x_i - \bar{x})^2}$) rather than `STDDEV_POP` because active real estate listings represent an observed sample of the broader housing market.
  - **Threshold Justifications:**
    - $|Z| \ge 2.0$: Corresponds to the top $\approx 2.5\%$ statistical tails under Gaussian distribution (&plusmn;2&sigma;). Classified as `HIGH_OUTLIER` or `LOW_OUTLIER`.
    - $1.5 \le |Z| < 2.0$: Corresponds to moderate distribution extremes (&plusmn;1.5&sigma;). Classified as `MODERATE_HIGH` or `MODERATE_LOW`.
    - $|Z| < 1.5$: Classified as `TYPICAL`.
  - **Relationship to ML Anomaly Detector:** This analytical query operates purely in read-only SQL mode. It does NOT overwrite, mutate, or replace the Isolation Forest machine learning anomaly detector in `src/lib/anomaly-detector.ts` or the `PropertyAnomaly` table.
- **TypeScript Engine Implementation:** [`src/lib/dbms-analytics.ts`](file:///c:/Users/abhyu/Documents/DBMS/miniproj/real-estate-anomaly-system/src/lib/dbms-analytics.ts) &rarr; `getValuationZScoreOutliers()`
- **API Endpoint:** `GET /api/admin/analytics?tab=outliers&zScoreThreshold=1.5`
- **UI Component:** `components/DbmsAnalyticsConsole.tsx` (Tab: "3. Z-Score Outliers (CTEs & Window)")

#### Parameterized SQL Statement
```sql
WITH BaseMetrics AS (
  SELECT
    p."propertyId",
    p."title",
    p."city",
    p."propertyType",
    p."price",
    p."areaSqft",
    ROUND((p."price" / NULLIF(p."areaSqft", 0))::numeric, 2)::float AS "pricePerSqft"
  FROM "Property" p
  WHERE p."status" = 'ACTIVE'
),
PeerGroupStats AS (
  SELECT
    bm.*,
    COUNT(bm."propertyId") OVER(PARTITION BY bm."city", bm."propertyType")::int AS "peerCount",
    ROUND(AVG(bm."pricePerSqft") OVER(PARTITION BY bm."city", bm."propertyType")::numeric, 2)::float AS "peerAvgPricePerSqft",
    ROUND(COALESCE(STDDEV_SAMP(bm."pricePerSqft") OVER(PARTITION BY bm."city", bm."propertyType"), 0)::numeric, 2)::float AS "peerStdDevPricePerSqft"
  FROM BaseMetrics bm
)
SELECT
  pgs."propertyId",
  pgs."title",
  pgs."city",
  pgs."propertyType",
  pgs."price",
  pgs."areaSqft",
  pgs."pricePerSqft",
  pgs."peerCount",
  pgs."peerAvgPricePerSqft",
  pgs."peerStdDevPricePerSqft",
  ROUND(
    CASE
      WHEN pgs."peerStdDevPricePerSqft" > 0 THEN
        ((pgs."pricePerSqft" - pgs."peerAvgPricePerSqft") / pgs."peerStdDevPricePerSqft")::numeric
      ELSE 0
    END, 2
  )::float AS "zScore",
  CASE
    WHEN pgs."peerStdDevPricePerSqft" > 0 AND ((pgs."pricePerSqft" - pgs."peerAvgPricePerSqft") / pgs."peerStdDevPricePerSqft") >= 2.0 THEN 'SEVERE_OVERVALUED'
    WHEN pgs."peerStdDevPricePerSqft" > 0 AND ((pgs."pricePerSqft" - pgs."peerAvgPricePerSqft") / pgs."peerStdDevPricePerSqft") >= 1.2 THEN 'MODERATE_OVERVALUED'
    WHEN pgs."peerStdDevPricePerSqft" > 0 AND ((pgs."pricePerSqft" - pgs."peerAvgPricePerSqft") / pgs."peerStdDevPricePerSqft") <= -2.0 THEN 'SEVERE_UNDERVALUED'
    WHEN pgs."peerStdDevPricePerSqft" > 0 AND ((pgs."pricePerSqft" - pgs."peerAvgPricePerSqft") / pgs."peerStdDevPricePerSqft") <= -1.2 THEN 'MODERATE_UNDERVALUED'
    ELSE 'WITHIN_NORMAL_RANGE'
  END AS "outlierFlag"
FROM PeerGroupStats pgs
WHERE pgs."peerCount" >= 2
  AND ABS(
    CASE
      WHEN pgs."peerStdDevPricePerSqft" > 0 THEN
        (pgs."pricePerSqft" - pgs."peerAvgPricePerSqft") / pgs."peerStdDevPricePerSqft"
      ELSE 0
    END
  ) >= $1
ORDER BY ABS("zScore") DESC, pgs."price" DESC
LIMIT $2;
```

#### Result Structure & Type Contract
```typescript
export interface PeerGroupZScoreRow {
  propertyId: number;
  title: string;
  city: string;
  propertyType: string;
  price: number;
  areaSqft: number;
  pricePerSqft: number;
  peerCount: number;
  peerAvgPricePerSqft: number;
  peerStdDevPricePerSqft: number;
  zScore: number;
  outlierFlag: string;
}
```

---

### Query D: Time-Series Price History Audit Trail (`LAG()`)

- **DBMS Concept Demonstrated:** Window functions with deterministic compound ordering (`LAG(ph."price", 1) OVER (PARTITION BY ph."propertyId" ORDER BY ph."recordedAt" ASC, ph."priceId" ASC)`), tie-breaker resolution, time-series delta calculation, and percentage variance detection.
- **PropAudit Business Purpose:** Uncovers suspicious sudden valuation spikes or artificial price drops between recorded inspections. Crucial for detecting rapid price churning or post-anomaly price manipulations.
- **Deterministic Ordering Guarantee:** When multiple price snapshots are recorded within the same second or batch-seeded, ordering solely by `recordedAt` can produce non-deterministic row sequencing in PostgreSQL. PropAudit enforces compound ordering: `ORDER BY ph."recordedAt" ASC, ph."priceId" ASC` in the `OVER` clause, and `ORDER BY pat."propertyId" ASC, pat."recordedAt" DESC, pat."priceId" DESC` in the outer query to guarantee consistent output across all database engines.
- **TypeScript Engine Implementation:** [`src/lib/dbms-analytics.ts`](file:///c:/Users/abhyu/Documents/DBMS/miniproj/real-estate-anomaly-system/src/lib/dbms-analytics.ts) &rarr; `getPriceHistoryLagAudit()`
- **API Endpoint:** `GET /api/admin/analytics?tab=price-history&propertyId=20`
- **UI Component:** `components/DbmsAnalyticsConsole.tsx` (Tab: "4. Price History Audit (LAG)")

#### Parameterized SQL Statement
```sql
WITH SequencedHistory AS (
  SELECT
    ph."priceId",
    ph."propertyId",
    p."title" AS "propertyTitle",
    p."city",
    ph."price" AS "currentPrice",
    LAG(ph."price", 1) OVER (
      PARTITION BY ph."propertyId"
      ORDER BY ph."recordedAt" ASC, ph."priceId" ASC
    ) AS "previousPrice",
    ph."recordedAt",
    LAG(ph."recordedAt", 1) OVER (
      PARTITION BY ph."propertyId"
      ORDER BY ph."recordedAt" ASC, ph."priceId" ASC
    ) AS "previousRecordedAt",
    ph."source"
  FROM "PriceHistory" ph
  INNER JOIN "Property" p ON ph."propertyId" = p."propertyId"
  -- Optional WHERE p."propertyId" = $1 filter applied conditionally
)
SELECT
  sh."priceId",
  sh."propertyId",
  sh."propertyTitle",
  sh."city",
  sh."currentPrice"::float AS "currentPrice",
  sh."previousPrice"::float AS "previousPrice",
  ROUND((sh."currentPrice" - COALESCE(sh."previousPrice", sh."currentPrice"))::numeric, 2)::float AS "priceDelta",
  CASE
    WHEN sh."previousPrice" IS NOT NULL AND sh."previousPrice" > 0 THEN
      ROUND((((sh."currentPrice" - sh."previousPrice") / sh."previousPrice") * 100)::numeric, 2)::float
    ELSE 0
  END AS "percentChange",
  sh."recordedAt",
  sh."previousRecordedAt",
  sh."source"
FROM SequencedHistory sh
WHERE sh."previousPrice" IS NOT NULL
ORDER BY sh."propertyId" ASC, sh."recordedAt" DESC, sh."priceId" DESC
LIMIT $1;
```

#### Result Structure & Type Contract
```typescript
export interface PriceHistoryLagRow {
  priceId: number;
  propertyId: number;
  propertyTitle: string;
  city: string;
  currentPrice: number;
  previousPrice: number | null;
  priceDelta: number;
  percentChange: number;
  recordedAt: string;
  source: string;
}
```

---

### Query E: Correlated Subquery Peer-Excess Analysis

- **DBMS Concept Demonstrated:** Correlated scalar subquery referencing outer row fields (`WHERE inner_p."city" = p."city" AND inner_p."propertyType" = p."propertyType"`), cohort qualification with `HAVING COUNT(*) >= $1`, and computed deviation metrics.
- **PropAudit Business Purpose:** Identifies premium listings trading significantly higher than their respective localized peer averages. Used to flag properties that may distort municipal tax valuations or mask inflated loan collateral.
- **TypeScript Engine Implementation:** [`src/lib/dbms-analytics.ts`](file:///c:/Users/abhyu/Documents/DBMS/miniproj/real-estate-anomaly-system/src/lib/dbms-analytics.ts) &rarr; `getPropertiesAbovePeerAverage()`
- **API Endpoint:** `GET /api/admin/analytics?tab=subquery-excess&minPeerCount=3`
- **UI Component:** `components/DbmsAnalyticsConsole.tsx` (Tab: "5. Peer Excess (Correlated Subquery)")

#### Parameterized SQL Statement
```sql
SELECT
  p."propertyId",
  p."title",
  p."city",
  p."propertyType",
  p."price"::float AS "price",
  ROUND((
    SELECT AVG(inner_p."price")
    FROM "Property" inner_p
    WHERE inner_p."city" = p."city"
      AND inner_p."propertyType" = p."propertyType"
      AND inner_p."status" = 'ACTIVE'
  )::numeric, 2)::float AS "peerAvgPrice",
  ROUND((
    p."price" - (
      SELECT AVG(inner_p."price")
      FROM "Property" inner_p
      WHERE inner_p."city" = p."city"
        AND inner_p."propertyType" = p."propertyType"
        AND inner_p."status" = 'ACTIVE'
    )
  )::numeric, 2)::float AS "priceExcess",
  ROUND((
    ((p."price" - (
      SELECT AVG(inner_p."price")
      FROM "Property" inner_p
      WHERE inner_p."city" = p."city"
        AND inner_p."propertyType" = p."propertyType"
        AND inner_p."status" = 'ACTIVE'
    )) / NULLIF((
      SELECT AVG(inner_p."price")
      FROM "Property" inner_p
      WHERE inner_p."city" = p."city"
        AND inner_p."propertyType" = p."propertyType"
        AND inner_p."status" = 'ACTIVE'
    ), 0)) * 100
  )::numeric, 2)::float AS "percentAbovePeer"
FROM "Property" p
WHERE p."status" = 'ACTIVE'
  AND p."price" > (
    SELECT AVG(inner_p."price")
    FROM "Property" inner_p
    WHERE inner_p."city" = p."city"
      AND inner_p."propertyType" = p."propertyType"
      AND inner_p."status" = 'ACTIVE'
  )
  AND (
    SELECT COUNT(*)
    FROM "Property" inner_count
    WHERE inner_count."city" = p."city"
      AND inner_count."propertyType" = p."propertyType"
      AND inner_count."status" = 'ACTIVE'
  ) >= $1
ORDER BY "percentAbovePeer" DESC
LIMIT $2;
```

#### Result Structure & Type Contract
```typescript
export interface CorrelatedSubqueryExcessRow {
  propertyId: number;
  title: string;
  city: string;
  propertyType: string;
  price: number;
  peerAvgPrice: number;
  priceExcess: number;
  percentAbovePeer: number;
}
```

---

### Query F: Relational View with Cartesian Product Prevention

- **DBMS Concept Demonstrated:** Relational database views (`CREATE OR REPLACE VIEW`), multi-table left joins (`Property` &rarr; `PriceHistory`, `Property` &rarr; `PropertyAmenity`), and **anti-Cartesian distinct counting** (`COUNT(DISTINCT ph."priceId")`, `COUNT(DISTINCT pa."amenityId")`).
- **Cartesian Product Problem & Prevention:** When joining a master table with two independent child tables with one-to-many relationships (e.g. 4 price points and 5 amenities), standard `COUNT()` yields $4 \times 5 = 20$ rows per metric. PropAudit enforces `COUNT(DISTINCT ...)` to guarantee exact cardinality.
- **Supabase View Status & Safety Design:**
  - **Does the view need to be pre-installed in Supabase?** **No.** In `src/lib/dbms-analytics.ts`, `queryPropertyDashboardSummary()` executes the exact relational projection and logic directly against the base tables. The API (`/api/admin/analytics?tab=dashboard-view`) and the UI console tab function immediately and reliably without requiring any DDL migration or pre-installed view on Supabase.
  - **Procedure to Install View Persistently (Optional):** If an administrator desires a persistent PostgreSQL view for external BI tools, the DDL is maintained in [`scripts/create-property-dashboard-view.sql`](file:///c:/Users/abhyu/Documents/DBMS/miniproj/real-estate-anomaly-system/scripts/create-property-dashboard-view.sql). Because it uses `CREATE OR REPLACE VIEW`, it is completely non-destructive (no table locks, no data mutations, zero column alterations). The exact procedure is:
    ```bash
    psql "$DATABASE_URL" -f scripts/create-property-dashboard-view.sql
    ```
    *Note: In accordance with project safety guidelines, this live migration is NOT applied automatically.*
- **TypeScript Engine Implementation:** [`src/lib/dbms-analytics.ts`](file:///c:/Users/abhyu/Documents/DBMS/miniproj/real-estate-anomaly-system/src/lib/dbms-analytics.ts) &rarr; `queryPropertyDashboardSummary()`
- **API Endpoint:** `GET /api/admin/analytics?tab=dashboard-view`
- **UI Component:** `components/DbmsAnalyticsConsole.tsx` (Tab: "6. Summary View (Anti-Cartesian)")

#### View DDL (`scripts/create-property-dashboard-view.sql`)
```sql
CREATE OR REPLACE VIEW "PropertyDashboardSummary" AS
SELECT
  p."propertyId",
  p."title",
  p."city",
  p."propertyType",
  p."price"::float AS "currentPrice",
  p."status",
  u."name" AS "ownerName",
  u."email" AS "ownerEmail",
  COUNT(DISTINCT ph."priceId")::int AS "priceHistoryCount",
  MAX(ph."recordedAt") AS "latestPriceDate",
  COUNT(DISTINCT pa."amenityId")::int AS "amenityCount"
FROM "Property" p
INNER JOIN "User" u ON p."ownerId" = u."userId"
LEFT JOIN "PriceHistory" ph ON p."propertyId" = ph."propertyId"
LEFT JOIN "PropertyAmenity" pa ON p."propertyId" = pa."propertyId"
GROUP BY
  p."propertyId",
  p."title",
  p."city",
  p."propertyType",
  p."price",
  p."status",
  u."name",
  u."email";
```

#### Result Structure & Type Contract
```typescript
export interface PropertyDashboardSummaryRow {
  propertyId: number;
  title: string;
  city: string;
  propertyType: string;
  currentPrice: number;
  status: string;
  ownerName: string;
  ownerEmail: string;
  priceHistoryCount: number;
  latestPriceDate: string | null;
  amenityCount: number;
}
```

---

### Query G: ACID Atomic Price-Update Transaction & Trigger Audit

- **DBMS Concept Demonstrated:** Relational transaction boundary (`db.$transaction`), row-level locking (`SELECT ... FOR UPDATE`), PostgreSQL trigger automation (`property_price_history_trigger`), atomic consistency, and controlled rollback verification.
- **PropAudit Business Purpose:** Demonstrates how critical financial operations—such as manual price revisions by an administrator—maintain ACID isolation. When `Property.price` is updated, the PostgreSQL database trigger automatically records the audit trail in `PriceHistory` (without requiring manual duplicated application-level inserts).
- **Safety Guarantee:** By passing `shouldRollback: true`, the engine executes the locking and modification statements inside a transaction and triggers an intentional error. Both the property update and the trigger-inserted audit row are cleanly rolled back together.
- **TypeScript Engine Implementation:** [`src/lib/dbms-analytics.ts`](file:///c:/Users/abhyu/Documents/DBMS/miniproj/real-estate-anomaly-system/src/lib/dbms-analytics.ts) &rarr; `executeAtomicPriceUpdateTransaction()`
- **Automated Verification:** [`tests/dbms-analytics.test.ts`](file:///c:/Users/abhyu/Documents/DBMS/miniproj/real-estate-anomaly-system/tests/dbms-analytics.test.ts)

#### Transaction Execution Flow
```typescript
await db.$transaction(async (tx) => {
  // Step 1: Lock target property row to prevent concurrent race conditions
  const [locked] = await tx.$queryRaw<RawLockedPropertyRow[]>`
    SELECT "propertyId", "price"::numeric FROM "Property"
    WHERE "propertyId" = ${propertyId}
    FOR UPDATE;
  `;
  if (!locked) throw new Error(`Property #${propertyId} does not exist.`);

  const oldPrice = Number(locked.price);

  // Step 2: Atomic update to Property table.
  // The PostgreSQL trigger "property_price_history_trigger" executes AFTER UPDATE OF price
  // and automatically inserts the audit record into "PriceHistory".
  await tx.$executeRaw`
    UPDATE "Property"
    SET "price" = ${newPrice}, "updatedAt" = NOW()
    WHERE "propertyId" = ${propertyId};
  `;

  // Step 3: Retrieve the trigger-created PriceHistory row inside the same transaction
  const [triggerHistory] = await tx.$queryRaw<RawInsertedPriceHistoryRow[]>`
    SELECT "priceId" FROM "PriceHistory"
    WHERE "propertyId" = ${propertyId}
    ORDER BY "recordedAt" DESC, "priceId" DESC
    LIMIT 1;
  `;

  // Step 4: Conditional intentional rollback for non-destructive testing
  if (options?.shouldRollback) {
    throw new Error("ATOMIC_TRANSACTION_TEST_ROLLBACK: Cleanly reverting demonstration transaction.");
  }
});
```

---

## 2.8 Functional Admin DBMS Operations & Trigger Engine

PropAudit integrates a dedicated administrative DBMS operations console located at `app/admin/page.tsx` (`DbmsOperationsConsole.tsx`), backed by protected endpoints under `/api/admin/dbms/*`.

### 1. Actual Admin Property INSERT
- **Endpoint:** `POST /api/admin/dbms/properties`
- **Security & Authorization:** Enforces `requireAdmin(request)`. The authenticated administrator's `userId` is assigned as `ownerId`.
- **Validation:** Server-side validation on propertyType (`APARTMENT`, `HOUSE`, `VILLA`), listingType (`SALE`, `RENT`), strictly positive price and areaSqft, non-negative bedrooms/bathrooms, and non-empty strings.
- **Prefix Guard:** Automatically prefixes title with `[DBMS CONSOLE] `.
- **Status Guard:** Sets status to `DRAFT`.
- **Atomic Transaction:** Inserts into `"Property"` and generates the initial `"PriceHistory"` baseline snapshot within a single interactive transaction.

```sql
-- Executed inside transaction:
INSERT INTO "Property" (
  "title", "description", "propertyType", "listingType", "price",
  "areaSqft", "bedrooms", "bathrooms", "address", "city", "state", "pincode",
  "latitude", "longitude", "status", "ownerId", "createdAt", "updatedAt"
) VALUES (
  $1, $2, $3, $4, $5,
  $6, $7, $8, $9, $10, $11, $12,
  NULL, NULL, 'DRAFT', $13, NOW(), NOW()
) RETURNING "propertyId";

INSERT INTO "PriceHistory" ("propertyId", "price", "recordedAt")
VALUES ($1, $2, NOW())
RETURNING "priceId";
```

### 2. Actual Admin Property UPDATE with Database Trigger & DROP DDL
- **Endpoint:** `PATCH /api/admin/dbms/properties/[id]`
- **Security Invariants:**
  1. Target property must exist in the database.
  2. Title must strictly begin with `[DBMS CONSOLE]`.
  3. `ownerId` must strictly equal the authenticated administrator's `userId`.
  4. Status must be `DRAFT`.
- **Zero Duplicate Inserts:** The API does NOT manually insert into `PriceHistory`. The PostgreSQL database trigger `property_price_history_trigger` handles audit log creation automatically.

#### DROP DDL Operations (Migration 20261102140500)
To prevent duplicate audit log rows caused by an unconditioned legacy trigger and ensure clean idempotent re-application, the migration explicitly executes DROP DDL statements:
```sql
-- 1. Drop legacy trigger if present to prevent duplicate PriceHistory rows
DROP TRIGGER IF EXISTS property_price_change_trigger ON public."Property";

-- 2. Drop legacy function if present
DROP FUNCTION IF EXISTS public.record_price_change();

-- 3. Drop existing price history trigger to allow clean idempotent re-creation
DROP TRIGGER IF EXISTS property_price_history_trigger ON public."Property";
```

#### Stored Function and Trigger Creation
```sql
-- PostgreSQL Stored Trigger Definition:
CREATE OR REPLACE FUNCTION public.record_property_price_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public."PriceHistory" ("propertyId", "price", "recordedAt")
    VALUES (NEW."propertyId", NEW."price", CURRENT_TIMESTAMP);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_price_history_trigger
AFTER UPDATE OF price ON public."Property"
FOR EACH ROW
WHEN (OLD.price IS DISTINCT FROM NEW.price)
EXECUTE FUNCTION public.record_property_price_history();
```

### 3. Actual Admin Property DELETE with Foreign-Key Cascades
- **Endpoint:** `DELETE /api/admin/dbms/properties/[id]`
- **Security Invariants:** Restricted strictly to `[DBMS CONSOLE]` DRAFT records owned by the authenticated admin. Ordinary marketplace records (properties 1–100) are protected with 403 Forbidden.
- **Relational Integrity:** Utilizes PostgreSQL `ON DELETE CASCADE` foreign key references to safely purge dependent `PriceHistory` audit entries in the same atomic operation.

```sql
DELETE FROM "Property"
WHERE "propertyId" = $1;
```

### 4. Live PostgreSQL System Catalog Schema Explorer
- **Endpoint:** `GET /api/admin/dbms/schema` (Protected by `requireAdmin`)
- **Component:** `components/DbmsSchemaExplorer.tsx`
- **Read-Only Invariant:** Executes read-only queries against `information_schema` and `pg_catalog`. No arbitrary SQL execution permitted.
- **Inspection Coverage:**
  - Application tables: `Property`, `PropertyEmbedding`, `PropertyAnomaly`, `PriceHistory`, `PropertyAmenity`, `Amenity`, `User`.
  - Column specifications, data types, nullability, and default expressions.
  - Primary keys and relational foreign key linkages.
  - Check constraints (e.g. `property_anomaly_status_check`, price positivity, etc.).
  - PostgreSQL indexes, explicitly surfacing the `pgvector` HNSW index on `PropertyEmbedding(embedding vector_cosine_ops)`.
  - Installed PostgreSQL triggers and PL/pgSQL function definitions.
  - The live installed relational view `PropertyDashboardSummary`.

### 5. Active Domain & Integrity CHECK Constraints
Enforced via migrations `20261012_add_anomaly_status_constraint` and `20261102150000_add_property_price_constraints`:
```sql
-- Property Price strictly positive
ALTER TABLE public."Property" ADD CONSTRAINT property_price_positive_check CHECK (price > 0);

-- Property Area strictly positive
ALTER TABLE public."Property" ADD CONSTRAINT property_area_positive_check CHECK ("areaSqft" > 0);

-- Property Bedrooms non-negative
ALTER TABLE public."Property" ADD CONSTRAINT property_bedrooms_non_negative_check CHECK (bedrooms >= 0);

-- Property Bathrooms non-negative
ALTER TABLE public."Property" ADD CONSTRAINT property_bathrooms_non_negative_check CHECK (bathrooms >= 0);

-- Property Listing Type domain restriction
ALTER TABLE public."Property" ADD CONSTRAINT property_listing_type_check CHECK ("listingType" IN ('SALE', 'RENT'));

-- Property Type domain restriction
ALTER TABLE public."Property" ADD CONSTRAINT property_type_check CHECK ("propertyType" IN ('APARTMENT', 'HOUSE', 'VILLA'));

-- PriceHistory Price strictly positive
ALTER TABLE public."PriceHistory" ADD CONSTRAINT price_history_price_positive_check CHECK (price > 0);

-- PropertyAnomaly Review Status domain restriction
ALTER TABLE public."PropertyAnomaly" ADD CONSTRAINT property_anomaly_status_check CHECK (status IN ('PENDING', 'CONFIRMED', 'DISMISSED'));
```

---

## 3. Application & UI Integration

### Architecture Map
```
┌────────────────────────────────────────────────────────┐
│                   Admin Dashboard                      │
│                  (app/admin/page.tsx)                  │
│                                                        │
│   [ Radar: ML Anomaly Queue ]   [ DBMS Relational ]   │
└──────────────────────────┬─────────────────────────────┘
                           │ Active Tab: DBMS
                           ▼
┌────────────────────────────────────────────────────────┐
│          components/DbmsAnalyticsConsole.tsx           │
│   - 6 Interactive Tabs with dynamic controls           │
│   - "View Active SQL" toggle drawer                    │
│   - Formatted currency, badges, and percentage deltas  │
└──────────────────────────┬─────────────────────────────┘
                           │ fetch('/api/admin/analytics?tab=...')
                           ▼
┌────────────────────────────────────────────────────────┐
│             app/api/admin/analytics/route.ts           │
│   - Security: requireAdmin(request)                    │
│   - Validates query params (tab, minCount, etc.)       │
└──────────────────────────┬─────────────────────────────┘
                           │ calls typed query functions
                           ▼
┌────────────────────────────────────────────────────────┐
│               src/lib/dbms-analytics.ts                │
│   - Parameterized PostgreSQL SQL ($1, $2)              │
│   - Fallback view handling & strict typing             │
└────────────────────────────────────────────────────────┘
```

### Visual Evidence & Rendered States
Eight distinct states were verified and captured using headless browser automation on the running instance:
1. `public/screenshots/dbms-analytics/01-admin-overview-radar.png`: Default Anomaly Review Queue with the new console toggle switch.
2. `public/screenshots/dbms-analytics/02-dbms-tab-aggregates.png`: Market aggregates grouped by City & Property Type with HAVING count filter.
3. `public/screenshots/dbms-analytics/03-dbms-active-sql-drawer.png`: Open Active SQL drawer showing parameterized SQL syntax in the UI.
4. `public/screenshots/dbms-analytics/04-dbms-tab-outliers-zscore.png`: Multi-stage CTE and window Z-score outlier detection table.
5. `public/screenshots/dbms-analytics/05-dbms-tab-price-history-lag.png`: Time-series `LAG()` sequential price delta audit trail.
6. `public/screenshots/dbms-analytics/06-dbms-tab-correlated-subquery.png`: Correlated subquery listings exceeding peer group averages.
7. `public/screenshots/dbms-analytics/07-dbms-tab-anomaly-joins.png`: Four-table JOIN review queue with owner and reviewer attribution.
8. `public/screenshots/dbms-analytics/08-dbms-tab-view-summary.png`: Anti-Cartesian summary view with distinct count metrics.

---

## 4. Verification & Testing Matrix

| Test Suite / Command | Scope & Assertions | Status | Exit Code | Execution Time |
| :--- | :--- | :---: | :---: | :---: |
| `npx tsx tests/dbms-analytics.test.ts` | 8 tests: JOINs, GROUP BY/HAVING, CTEs/Window Z-Score, LAG(), Subqueries, View, and Rollback Transaction | **PASS** | 0 | ~700 ms |
| `npx tsx tests/api-security.test.ts` | 11 tests: Auth cookies, role escalation, `/api/admin/analytics` unauthorized & forged token rejection | **PASS** | 0 | ~600 ms |
| `npx tsx tests/search.test.ts` | 8 tests: Semantic search, city hard-filtering, image determinism | **PASS** | 0 | ~800 ms |
| `npx tsc --noEmit` | Strict TypeScript type checking across all project files | **PASS** | 0 | ~3.8 s |
| `npm run lint` | ESLint rules across components, APIs, lib, and scripts | **PASS** | 0 | ~4.5 s |
| `npm run build` | Next.js 16 production compilation and route generation | **PASS** | 0 | ~23.5 s |
| `npx tsx scripts/verify-admin-analytics-ui.ts` | Puppeteer browser automation, admin auth sign-in, and 8 screenshot captures | **PASS** | 0 | ~9.2 s |

---

## 5. Deployment & Execution Instructions

### A. Executing Queries in Code
All queries are exported as strongly typed async functions from [`src/lib/dbms-analytics.ts`](file:///c:/Users/abhyu/Documents/DBMS/miniproj/real-estate-anomaly-system/src/lib/dbms-analytics.ts):
```typescript
import {
  getAnomalyReviewQueueWithJoins,
  getCityPropertyTypeAggregates,
  getValuationZScoreOutliers,
  getPriceHistoryLagAudit,
  getPropertiesAbovePeerAverage,
  queryPropertyDashboardSummary,
  executeAtomicPriceUpdateTransaction
} from "@/lib/dbms-analytics";

// Example: Fetch city aggregates with minimum 3 listings per cohort
const aggregates = await getCityPropertyTypeAggregates(3);
```

### B. Optional: Creating the Relational View in PostgreSQL
To register the persistent view directly in your PostgreSQL / Supabase console or via migration CLI without running destructive seeds:
```bash
# Execute against your PostgreSQL instance:
psql "$DATABASE_URL" -f scripts/create-property-dashboard-view.sql
```
*Note: The application automatically handles environments where the view has not yet been registered by seamlessly executing the equivalent query.*
