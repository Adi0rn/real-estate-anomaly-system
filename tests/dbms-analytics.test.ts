import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import {
  db,
  getAnomalyReviewQueueWithJoins,
  getCityPropertyTypeAggregates,
  getValuationZScoreOutliers,
  getPriceHistoryLagAudit,
  getPropertiesAbovePeerAverage,
  queryPropertyDashboardSummary,
  executeAtomicPriceUpdateTransaction,
} from "../src/lib/dbms-analytics";

test("Level 3 DBMS Query Suite", async (t) => {
  t.after(async () => {
    await db.$disconnect();
  });

  await t.test("1. Multi-Table JOIN Query (PropertyAnomaly + Property + User Owner + User Reviewer)", async () => {
    const results = await getAnomalyReviewQueueWithJoins({ limit: 10 });
    assert(Array.isArray(results), "Results should be an array");
    assert(results.length > 0, "Should return existing anomaly records");

    const first = results[0];
    assert(typeof first.anomalyId === "number", "anomalyId should be a number");
    assert(typeof first.propertyId === "number", "propertyId should be a number");
    assert(typeof first.propertyTitle === "string", "propertyTitle should be joined from Property");
    assert(typeof first.city === "string", "city should be joined from Property");
    assert(typeof first.ownerName === "string", "ownerName should be joined from User (as owner)");
    assert(typeof first.ownerEmail === "string", "ownerEmail should be joined from User");
    assert(first.ownerEmail.includes("@"), "ownerEmail should be a valid email format");

    // Reviewer can be null or string
    assert("reviewerId" in first, "reviewerId field must be present");
    assert("reviewerName" in first, "reviewerName field must be present");
  });

  await t.test("2. GROUP BY and HAVING Query (City & Property-Type Aggregates)", async () => {
    const results = await getCityPropertyTypeAggregates({ minPropertiesPerGroup: 1 });
    assert(Array.isArray(results), "Results should be an array");
    assert(results.length > 0, "Should return group aggregate records");

    for (const group of results) {
      assert(typeof group.city === "string", "City must be a string");
      assert(typeof group.propertyType === "string", "PropertyType must be a string");
      assert(group.propertyCount >= 1, "Count must satisfy HAVING condition >= 1");
      const avg = parseFloat(group.avgPrice);
      const min = parseFloat(group.minPrice);
      const max = parseFloat(group.maxPrice);
      assert(!isNaN(avg) && !isNaN(min) && !isNaN(max), "Prices must be valid numbers");
      assert(min <= avg && avg <= max, `Min (${min}) <= Avg (${avg}) <= Max (${max}) must hold`);
    }

    // Test HAVING filter with higher threshold
    const filteredResults = await getCityPropertyTypeAggregates({ minPropertiesPerGroup: 5 });
    for (const group of filteredResults) {
      assert(group.propertyCount >= 5, "Every group in filtered results must satisfy HAVING count >= 5");
    }
  });

  await t.test("3. Multi-Stage CTEs and Window Functions (Valuation Z-Scores)", async () => {
    const results = await getValuationZScoreOutliers({ zThreshold: 1.0, minPeerCount: 3 });
    assert(Array.isArray(results), "Results should be an array");

    for (const item of results) {
      assert(typeof item.propertyId === "number", "propertyId should be numeric");
      assert(item.peerCount >= 3, "Peer group count must be >= 3");
      const zScore = parseFloat(item.zScore);
      assert(!isNaN(zScore), "zScore must be a valid number");
      assert(Math.abs(zScore) >= 1.0, "Absolute zScore must exceed threshold >= 1.0");
      assert(
        ["HIGH_OUTLIER", "LOW_OUTLIER", "MODERATE_HIGH", "MODERATE_LOW", "TYPICAL"].includes(item.classification),
        "Classification must be a valid category"
      );
    }
  });

  await t.test("4. Price History Window Function LAG()", async () => {
    const results = await getPriceHistoryLagAudit({ limit: 20 });
    assert(Array.isArray(results), "Results should be an array");
    assert(results.length > 0, "Should return longitudinal price adjustments");

    for (const item of results) {
      assert(typeof item.priceId === "number", "priceId should be numeric");
      assert(typeof item.propertyId === "number", "propertyId should be numeric");
      assert(item.previousPrice !== null, "previousPrice must not be null due to WHERE previousPrice IS NOT NULL");
      const curr = parseFloat(item.currentPrice);
      const prev = parseFloat(item.previousPrice);
      const diff = parseFloat(item.priceDifference);
      assert(Math.abs((curr - prev) - diff) < 0.01, "priceDifference must equal currentPrice - previousPrice");
    }
  });

  await t.test("5. Correlated Subquery (Properties exceeding peer group average)", async () => {
    const results = await getPropertiesAbovePeerAverage({ minPeerCount: 3, limit: 15 });
    assert(Array.isArray(results), "Results should be an array");

    for (const item of results) {
      const actual = parseFloat(item.actualPrice);
      const peerAvg = parseFloat(item.peerGroupAvgPrice);
      const excess = parseFloat(item.excessAmount);
      const pct = parseFloat(item.excessPercentage);

      assert(actual > peerAvg, `Actual price (${actual}) must exceed peer average (${peerAvg})`);
      assert(excess > 0, "excessAmount must be strictly positive");
      assert(pct > 0, "excessPercentage must be strictly positive");
    }
  });

  await t.test("6. PropertyDashboardSummary View Simulation (Anti-Inflation Joins)", async () => {
    const results = await queryPropertyDashboardSummary({ limit: 10 });
    assert(Array.isArray(results), "Results should be an array");
    assert(results.length > 0, "Should return summary records");

    for (const row of results) {
      assert(typeof row.propertyId === "number", "propertyId should be numeric");
      assert(typeof row.ownerName === "string", "ownerName should be present");
      assert(typeof row.priceHistoryCount === "number", "priceHistoryCount should be integer");
      assert(typeof row.amenityCount === "number", "amenityCount should be integer");
      // Distinct counts ensure priceHistoryCount is not multiplied by amenityCount!
      assert(row.priceHistoryCount <= 50, "priceHistoryCount should not be inflated by cartesian product");
      assert(row.amenityCount <= 50, "amenityCount should not be inflated by cartesian product");
    }
  });

  await t.test("7. Atomic Transaction Demonstration (Isolated Rollback Test)", async () => {
    // Read original property #1 price and existing PriceHistory count
    const [orig] = await db.$queryRaw<{ propertyId: number; price: number }[]>`
      SELECT "propertyId", "price"::numeric FROM "Property" WHERE "propertyId" = 1;
    `;
    const originalPrice = Number(orig.price);
    const testNewPrice = originalPrice + 100000;

    const [histBefore] = await db.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "PriceHistory" WHERE "propertyId" = 1;
    `;
    const initialHistoryCount = Number(histBefore.count);

    // Execute atomic update with explicit rollback
    const txResult = await executeAtomicPriceUpdateTransaction(1, testNewPrice, {
      shouldRollback: true,
    });

    assert.equal(txResult.success, true, "Transaction should execute successfully");
    assert.equal(txResult.rolledBack, true, "Transaction should flag rolledBack as true");

    // 1. Verify Property.price was NOT changed in live database
    const [after] = await db.$queryRaw<{ propertyId: number; price: number }[]>`
      SELECT "propertyId", "price"::numeric FROM "Property" WHERE "propertyId" = 1;
    `;
    assert.equal(
      Number(after.price),
      originalPrice,
      "Live database Property.price must remain unchanged after test rollback"
    );

    // 2. Verify PriceHistory was NOT modified (count remains identical, new price uncommitted)
    const [histAfter] = await db.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "PriceHistory" WHERE "propertyId" = 1;
    `;
    assert.equal(
      Number(histAfter.count),
      initialHistoryCount,
      "Live database PriceHistory record count must remain unchanged after test rollback"
    );

    const [uncommittedRow] = await db.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "PriceHistory"
      WHERE "propertyId" = 1 AND "price" = ${testNewPrice};
    `;
    assert.equal(
      Number(uncommittedRow.count),
      0,
      "No uncommitted PriceHistory row should persist in the live database"
    );
  });
});
