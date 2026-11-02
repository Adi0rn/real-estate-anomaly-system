import "./test-setup";
import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { db, queryPropertyDashboardSummary, executeAtomicPriceUpdateTransaction } from "../src/lib/dbms-analytics";
import { createSessionForUser, SESSION_COOKIE_NAME } from "../src/lib/auth-crypto";
import { POST as postProperty, GET as getProperties } from "../app/api/admin/dbms/properties/route";
import {
  GET as getPropertyDetail,
  PATCH as patchPropertyPrice,
  DELETE as deleteProperty,
} from "../app/api/admin/dbms/properties/[id]/route";
import { GET as getSchema } from "../app/api/admin/dbms/schema/route";

test("Level 3 DBMS Operations & Trigger Test Suite", async (t) => {
  // Query existing admin and regular users from database to construct cryptographic tokens
  const [adminUser] = await db.$queryRaw<Array<{ userId: number; email: string; role: string }>>`
    SELECT "userId", "email", "role" FROM "User" WHERE "role" = 'ADMIN' LIMIT 1;
  `;
  assert(adminUser, "Database must have an ADMIN user");

  const [regularUser] = await db.$queryRaw<Array<{ userId: number; email: string; role: string }>>`
    SELECT "userId", "email", "role" FROM "User" WHERE "role" != 'ADMIN' LIMIT 1;
  `;
  assert(regularUser, "Database must have a non-ADMIN user");

  const adminToken = createSessionForUser(adminUser.userId).token;
  const userToken = createSessionForUser(regularUser.userId).token;

  // Track created test properties to ensure 100% clean teardown
  const createdTestPropertyIds: number[] = [];

  t.after(async () => {
    // Teardown any remaining test properties
    if (createdTestPropertyIds.length > 0) {
      for (const id of createdTestPropertyIds) {
        await db.$executeRaw`DELETE FROM "Property" WHERE "propertyId" = ${id};`.catch(() => {});
      }
    }
    await db.$disconnect();
  });

  // 1. Non-admin requests are rejected
  await t.test("1. Non-admin requests are rejected", async () => {
    const unauthReq = new NextRequest("http://localhost:3000/api/admin/dbms/properties", {
      method: "GET",
    });
    const unauthRes = await getProperties(unauthReq);
    assert.equal(unauthRes.status, 401, "Unauthenticated request should return 401");

    const nonAdminReq = new NextRequest("http://localhost:3000/api/admin/dbms/properties", {
      method: "GET",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${userToken}` },
    });
    const nonAdminRes = await getProperties(nonAdminReq);
    assert.equal(nonAdminRes.status, 403, "Non-admin request should return 403");
  });

  // 2. Invalid property input is rejected
  await t.test("2. Invalid property input is rejected", async () => {
    const invalidReq = new NextRequest("http://localhost:3000/api/admin/dbms/properties", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "", // Empty title
        description: "Test description",
        propertyType: "INVALID_TYPE",
        listingType: "SALE",
        price: -5000,
        areaSqft: 1000,
        bedrooms: 2,
        bathrooms: 2,
        address: "Test Road",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
      }),
    });
    const res = await postProperty(invalidReq);
    assert.equal(res.status, 400, "Invalid payload must return 400");
    const json = await res.json();
    assert.equal(json.success, false);
  });

  // 3. Console-created properties use the [DBMS CONSOLE] prefix
  let testPropId = 0;
  await t.test("3. Console-created properties use the [DBMS CONSOLE] prefix", async () => {
    const validReq = new NextRequest("http://localhost:3000/api/admin/dbms/properties", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "Modern Sea View Villa",
        description: "Automated test property for DBMS Console operations.",
        propertyType: "VILLA",
        listingType: "SALE",
        price: 15000000,
        areaSqft: 2200,
        bedrooms: 3,
        bathrooms: 3,
        address: "Marine Lines, South Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400020",
      }),
    });
    const res = await postProperty(validReq);
    assert.equal(res.status, 201, "Valid creation should return 201");
    const json = await res.json();
    assert.equal(json.success, true);
    assert(json.propertyId > 0, "Should return positive propertyId");
    assert(
      json.property.title.startsWith("[DBMS CONSOLE]"),
      "Title must automatically have [DBMS CONSOLE] prefix"
    );
    assert.equal(json.property.status, "DRAFT", "New property status must be DRAFT");

    testPropId = json.propertyId;
    createdTestPropertyIds.push(testPropId);

    // Initial price snapshot verification
    assert.equal(json.initialPriceHistory.propertyId, testPropId);
    assert.equal(Number(json.initialPriceHistory.price), 15000000);
  });

  // 4. Ordinary properties cannot be updated through the console endpoint
  await t.test("4. Ordinary properties cannot be updated through the console endpoint", async () => {
    // Property #1 is an ordinary demonstration property without [DBMS CONSOLE] prefix
    const patchReq = new NextRequest("http://localhost:3000/api/admin/dbms/properties/1", {
      method: "PATCH",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ newPrice: 9999999 }),
    });
    const patchRes = await patchPropertyPrice(patchReq, { params: Promise.resolve({ id: "1" }) });
    assert.equal(
      patchRes.status,
      403,
      "Updating non-console property via console endpoint must return 403"
    );
  });

  // 5. Ordinary properties cannot be deleted through the console endpoint
  await t.test("5. Ordinary properties cannot be deleted through the console endpoint", async () => {
    const deleteReq = new NextRequest("http://localhost:3000/api/admin/dbms/properties/1", {
      method: "DELETE",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
    });
    const deleteRes = await deleteProperty(deleteReq, { params: Promise.resolve({ id: "1" }) });
    assert.equal(
      deleteRes.status,
      403,
      "Deleting non-console property via console endpoint must return 403"
    );
  });

  // 6. Price updates invoke the trigger
  await t.test("6. Price updates invoke the trigger", async () => {
    assert(testPropId > 0, "Test property ID must exist");

    const patchReq = new NextRequest(
      `http://localhost:3000/api/admin/dbms/properties/${testPropId}`,
      {
        method: "PATCH",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ newPrice: 17500000 }),
      }
    );
    const patchRes = await patchPropertyPrice(patchReq, {
      params: Promise.resolve({ id: String(testPropId) }),
    });
    assert.equal(patchRes.status, 200, "Price update should return 200");
    const json = await patchRes.json();
    assert.equal(json.success, true);
    assert.equal(json.oldPrice, 15000000);
    assert.equal(json.newPrice, 17500000);

    // Verify trigger-inserted PriceHistory row
    assert(json.latestPriceHistory !== null, "Trigger must have inserted PriceHistory row");
    assert.equal(Number(json.latestPriceHistory.price), 17500000);

    // Verify GET /api/admin/dbms/properties/[id] returns detail and history with LAG()
    const detailReq = new NextRequest(
      `http://localhost:3000/api/admin/dbms/properties/${testPropId}`,
      {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
      }
    );
    const detailRes = await getPropertyDetail(detailReq, {
      params: Promise.resolve({ id: String(testPropId) }),
    });
    assert.equal(detailRes.status, 200, "Property detail request should return 200");
    const detailJson = await detailRes.json();
    assert.equal(detailJson.success, true);
    assert.equal(detailJson.property.propertyId, testPropId);
    assert(detailJson.priceHistory.length >= 2, "Should return priceHistory with lag fields");
  });

  // 7. One price update creates exactly one PriceHistory record
  await t.test("7. One price update creates exactly one PriceHistory record", async () => {
    const [before] = await db.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM "PriceHistory" WHERE "propertyId" = ${testPropId};
    `;
    const countBefore = Number(before.count);

    const patchReq = new NextRequest(
      `http://localhost:3000/api/admin/dbms/properties/${testPropId}`,
      {
        method: "PATCH",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ newPrice: 19000000 }),
      }
    );
    await patchPropertyPrice(patchReq, { params: Promise.resolve({ id: String(testPropId) }) });

    const [after] = await db.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM "PriceHistory" WHERE "propertyId" = ${testPropId};
    `;
    const countAfter = Number(after.count);

    assert.equal(
      countAfter - countBefore,
      1,
      "A single price update must result in exactly 1 new PriceHistory record (no duplicates)"
    );
  });

  // 8. No-op price updates do not create additional history
  await t.test("8. No-op price updates do not create additional history", async () => {
    // Current price is 19000000; updating with the identical price
    const [before] = await db.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM "PriceHistory" WHERE "propertyId" = ${testPropId};
    `;
    const countBefore = Number(before.count);

    // Direct update with identical value: WHEN (OLD.price IS DISTINCT FROM NEW.price)
    await db.$executeRaw`
      UPDATE "Property" SET "price" = 19000000 WHERE "propertyId" = ${testPropId};
    `;

    const [after] = await db.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM "PriceHistory" WHERE "propertyId" = ${testPropId};
    `;
    const countAfter = Number(after.count);

    assert.equal(
      countAfter,
      countBefore,
      "Trigger condition WHEN (OLD.price IS DISTINCT FROM NEW.price) must prevent duplicate rows on identical price updates"
    );
  });

  // 9. Rollback reverts both the property update and trigger insertion
  await t.test("9. Rollback reverts both the property update and trigger insertion", async () => {
    const [orig] = await db.$queryRaw<Array<{ price: number }>>`
      SELECT "price"::numeric FROM "Property" WHERE "propertyId" = ${testPropId};
    `;
    const originalPrice = Number(orig.price);

    const [histBefore] = await db.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM "PriceHistory" WHERE "propertyId" = ${testPropId};
    `;
    const countBefore = Number(histBefore.count);

    const rollbackResult = await executeAtomicPriceUpdateTransaction(
      testPropId,
      25000000,
      { shouldRollback: true }
    );
    assert.equal(rollbackResult.rolledBack, true, "Transaction should flag rolledBack as true");

    // Verify Property.price remains unchanged
    const [propAfter] = await db.$queryRaw<Array<{ price: number }>>`
      SELECT "price"::numeric FROM "Property" WHERE "propertyId" = ${testPropId};
    `;
    assert.equal(Number(propAfter.price), originalPrice, "Price must remain unchanged after rollback");

    // Verify trigger-inserted PriceHistory row was also rolled back
    const [histAfter] = await db.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM "PriceHistory" WHERE "propertyId" = ${testPropId};
    `;
    assert.equal(
      Number(histAfter.count),
      countBefore,
      "Trigger-inserted PriceHistory row must be completely reverted by transaction rollback"
    );
  });

  // 10. Delete operations are restricted to eligible console-created DRAFT records
  await t.test("10. Delete operations are restricted to eligible console-created DRAFT records", async () => {
    // Delete the console-created DRAFT property
    const deleteReq = new NextRequest(
      `http://localhost:3000/api/admin/dbms/properties/${testPropId}`,
      {
        method: "DELETE",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
      }
    );
    const deleteRes = await deleteProperty(deleteReq, {
      params: Promise.resolve({ id: String(testPropId) }),
    });
    assert.equal(deleteRes.status, 200, "Deleting eligible console property should return 200");
    const json = await deleteRes.json();
    assert.equal(json.success, true);
    assert.equal(json.deletedPropertyId, testPropId);

    // Verify Property row is gone
    const checkProp = await db.$queryRaw<Array<unknown>>`
      SELECT * FROM "Property" WHERE "propertyId" = ${testPropId};
    `;
    assert.equal(checkProp.length, 0, "Property row must be deleted");

    // Verify cascading deletion of PriceHistory
    const checkHistory = await db.$queryRaw<Array<unknown>>`
      SELECT * FROM "PriceHistory" WHERE "propertyId" = ${testPropId};
    `;
    assert.equal(checkHistory.length, 0, "Cascaded PriceHistory records must be deleted");

    // Remove from tracking array since already deleted
    const idx = createdTestPropertyIds.indexOf(testPropId);
    if (idx !== -1) createdTestPropertyIds.splice(idx, 1);
  });

  // 11. Schema explorer is read-only
  await t.test("11. Schema explorer is read-only", async () => {
    const schemaReq = new NextRequest("http://localhost:3000/api/admin/dbms/schema", {
      method: "GET",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
    });
    const schemaRes = await getSchema(schemaReq);
    assert.equal(schemaRes.status, 200, "Schema explorer should return 200");
    const json = await schemaRes.json();
    assert.equal(json.success, true);
    assert(Array.isArray(json.schema.tables), "Should return tables array");
    assert(Array.isArray(json.schema.columns), "Should return columns array");
    assert(Array.isArray(json.schema.indexes), "Should return indexes array");

    // Verify pgvector HNSW index presence in indexes
    const hasHnsw = json.schema.indexes.some((idx: { index_definition: string }) =>
      idx.index_definition.toLowerCase().includes("hnsw")
    );
    assert.equal(hasHnsw, true, "Schema Explorer must include HNSW vector index");

    // Verify trigger presence
    const hasTrigger = json.schema.triggers.some(
      (trg: { trigger_name: string }) => trg.trigger_name === "property_price_history_trigger"
    );
    assert.equal(hasTrigger, true, "Schema Explorer must include property_price_history_trigger");
  });

  // 12. PropertyDashboardSummary reads from the installed database view
  await t.test("12. PropertyDashboardSummary reads from the installed database view", async () => {
    const viewRows = await queryPropertyDashboardSummary({ limit: 5 });
    assert(Array.isArray(viewRows), "View query should return an array");
    assert(viewRows.length > 0, "View query should return rows");
    const first = viewRows[0];
    assert(typeof first.propertyId === "number", "propertyId must be a number");
    assert(typeof first.title === "string", "title must be a string");
    assert(typeof first.priceHistoryCount === "number", "priceHistoryCount must be an integer");
    assert(typeof first.amenityCount === "number", "amenityCount must be an integer");
  });
});
