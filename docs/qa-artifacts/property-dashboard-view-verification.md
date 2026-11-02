# PropertyDashboardSummary PostgreSQL View Verification Report

**Execution Timestamp:** 2026-11-02T08:14:46.771Z  
**Target Environment:** PostgreSQL / Supabase with `pgvector`  
**Dialect:** PostgreSQL 16+  
**Execution Script:** `scripts/create-property-dashboard-view.sql`  
**Execution Harness:** `scripts/install-and-verify-view.ts` (via Prisma adapter)  
**Execution Status:** SUCCESS (Exit code: 0)  

---

## 1. Executive Summary

| Verification Aspect | Status | Details |
| :--- | :--- | :--- |
| **View Existence Before Execution** | EXISTS | Inspected via `pg_class` & `information_schema.views` in `public` schema |
| **Action Taken** | ALREADY_EXISTED | Inspected existing definition and preserved without recreation |
| **Schema Name** | `public` | Verified in intended PostgreSQL schema |
| **View Name** | `PropertyDashboardSummary` | `"PropertyDashboardSummary"` |
| **Underlying Data Invariance** | **100% UNCHANGED** | Delta = 0 across all 6 application tables |
| **Column Count** | 19 | Matches expected view projection |
| **Sample Query Status** | Verified | 5 rows retrieved cleanly |

---

## 2. Underlying Table Counts (Before vs. After)

Verification confirms that creating/verifying this view is strictly non-destructive. No rows were inserted, updated, or deleted.

| Table Name | Count Before | Count After | Delta | Invariant Status |
| :--- | :---: | :---: | :---: | :---: |
| `"User"` | 13 | 13 | 0 | PASS |
| `"Property"` | 100 | 100 | 0 | PASS |
| `"Amenity"` | 15 | 15 | 0 | PASS |
| `"PropertyAmenity"` | 500 | 500 | 0 | PASS |
| `"PriceHistory"` | 400 | 400 | 0 | PASS |
| `"PropertyAnomaly"` | 7 | 7 | 0 | PASS |

---

## 3. PostgreSQL View Definition

```sql
SELECT p."propertyId",
    p.title,
    p."propertyType",
    p."listingType",
    p.price::numeric AS price,
    p."areaSqft",
    p.bedrooms,
    p.bathrooms,
    p.city,
    p.state,
    p.status AS "propertyStatus",
    u."userId" AS "ownerId",
    u.name AS "ownerName",
    u.email AS "ownerEmail",
    count(DISTINCT ph."priceId")::integer AS "priceHistoryCount",
    max(ph."recordedAt") AS "latestPriceDate",
    count(DISTINCT pa."amenityId")::integer AS "amenityCount",
    COALESCE(panom.status, 'NONE'::text) AS "anomalyStatus",
    panom."anomalyScore"::numeric AS "anomalyScore"
   FROM "Property" p
     JOIN "User" u ON p."ownerId" = u."userId"
     LEFT JOIN "PriceHistory" ph ON p."propertyId" = ph."propertyId"
     LEFT JOIN "PropertyAmenity" pa ON p."propertyId" = pa."propertyId"
     LEFT JOIN "PropertyAnomaly" panom ON p."propertyId" = panom."propertyId"
  GROUP BY p."propertyId", p.title, p."propertyType", p."listingType", p.price, p."areaSqft", p.bedrooms, p.bathrooms, p.city, p.state, p.status, u."userId", u.name, u.email, panom.status, panom."anomalyScore";
```

---

## 4. Output Columns & Data Types

The view exposes 19 projection attributes derived from 5 joined tables (`Property`, `User`, `PriceHistory`, `PropertyAmenity`, `PropertyAnomaly`):

| # | Column Name | PostgreSQL Data Type | Nullable | Source / Transformation |
| :-: | :--- | :--- | :-: | :--- |
| 1 | `propertyId` | `integer` | YES | System catalog verified |
| 2 | `title` | `text` | YES | System catalog verified |
| 3 | `propertyType` | `text` | YES | System catalog verified |
| 4 | `listingType` | `text` | YES | System catalog verified |
| 5 | `price` | `numeric` | YES | System catalog verified |
| 6 | `areaSqft` | `integer` | YES | System catalog verified |
| 7 | `bedrooms` | `integer` | YES | System catalog verified |
| 8 | `bathrooms` | `integer` | YES | System catalog verified |
| 9 | `city` | `text` | YES | System catalog verified |
| 10 | `state` | `text` | YES | System catalog verified |
| 11 | `propertyStatus` | `text` | YES | System catalog verified |
| 12 | `ownerId` | `integer` | YES | System catalog verified |
| 13 | `ownerName` | `text` | YES | System catalog verified |
| 14 | `ownerEmail` | `text` | YES | System catalog verified |
| 15 | `priceHistoryCount` | `integer` | YES | System catalog verified |
| 16 | `latestPriceDate` | `timestamp without time zone` | YES | System catalog verified |
| 17 | `amenityCount` | `integer` | YES | System catalog verified |
| 18 | `anomalyStatus` | `text` | YES | System catalog verified |
| 19 | `anomalyScore` | `numeric` | YES | System catalog verified |

---

## 5. Sample Query Execution Result

Query:
```sql
SELECT * FROM "PropertyDashboardSummary" ORDER BY "propertyId" ASC LIMIT 5;
```

Result Payload (First 5 records):
```json
[
  {
    "propertyId": 1,
    "title": "1 BHK apartment in Bangalore",
    "propertyType": "APARTMENT",
    "listingType": "SALE",
    "price": "7400250",
    "areaSqft": 650,
    "bedrooms": 1,
    "bathrooms": 1,
    "city": "Bangalore",
    "state": "Karnataka",
    "propertyStatus": "ACTIVE",
    "ownerId": 1,
    "ownerName": "Arjun Mehta",
    "ownerEmail": "arjun@example.com",
    "priceHistoryCount": 4,
    "latestPriceDate": "2026-10-07T19:58:27.658Z",
    "amenityCount": 4,
    "anomalyStatus": "NONE",
    "anomalyScore": null
  },
  {
    "propertyId": 2,
    "title": "2 BHK villa in Chennai",
    "propertyType": "VILLA",
    "listingType": "RENT",
    "price": "6689500",
    "areaSqft": 787,
    "bedrooms": 2,
    "bathrooms": 2,
    "city": "Chennai",
    "state": "Tamil Nadu",
    "propertyStatus": "ACTIVE",
    "ownerId": 2,
    "ownerName": "Priya Sharma",
    "ownerEmail": "priya@example.com",
    "priceHistoryCount": 4,
    "latestPriceDate": "2026-10-07T19:58:28.068Z",
    "amenityCount": 5,
    "anomalyStatus": "NONE",
    "anomalyScore": null
  },
  {
    "propertyId": 3,
    "title": "3 BHK house in Hyderabad",
    "propertyType": "HOUSE",
    "listingType": "SALE",
    "price": "7392000",
    "areaSqft": 924,
    "bedrooms": 3,
    "bathrooms": 3,
    "city": "Hyderabad",
    "state": "Telangana",
    "propertyStatus": "ACTIVE",
    "ownerId": 3,
    "ownerName": "Rahul Nair",
    "ownerEmail": "rahul@example.com",
    "priceHistoryCount": 4,
    "latestPriceDate": "2026-10-07T19:58:29.087Z",
    "amenityCount": 6,
    "anomalyStatus": "NONE",
    "anomalyScore": null
  },
  {
    "propertyId": 4,
    "title": "4 BHK apartment in Mumbai",
    "propertyType": "APARTMENT",
    "listingType": "RENT",
    "price": "21220000",
    "areaSqft": 1061,
    "bedrooms": 4,
    "bathrooms": 4,
    "city": "Mumbai",
    "state": "Maharashtra",
    "propertyStatus": "ACTIVE",
    "ownerId": 4,
    "ownerName": "Sneha Iyer",
    "ownerEmail": "sneha@example.com",
    "priceHistoryCount": 4,
    "latestPriceDate": "2026-10-07T19:58:30.525Z",
    "amenityCount": 7,
    "anomalyStatus": "NONE",
    "anomalyScore": null
  },
  {
    "propertyId": 5,
    "title": "1 BHK villa in Pune",
    "propertyType": "VILLA",
    "listingType": "SALE",
    "price": "10782000",
    "areaSqft": 1198,
    "bedrooms": 1,
    "bathrooms": 1,
    "city": "Pune",
    "state": "Maharashtra",
    "propertyStatus": "ACTIVE",
    "ownerId": 5,
    "ownerName": "Vikram Rao",
    "ownerEmail": "vikram@example.com",
    "priceHistoryCount": 4,
    "latestPriceDate": "2026-10-07T19:58:30.937Z",
    "amenityCount": 3,
    "anomalyStatus": "NONE",
    "anomalyScore": null
  }
]
```

---

## 6. Verification Checklist & Guardrails

- [x] **No Alternative View Created**: View strictly named `"PropertyDashboardSummary"`.
- [x] **No Schema Table Alterations**: Base tables (`User`, `Property`, `Amenity`, etc.) remained unmodified.
- [x] **No Record Mutation**: Row counts before and after are identical (0 delta).
- [x] **No Destruction or Reset**: Database was not dropped, reset, or re-seeded.
- [x] **No Credentials Logged**: `DATABASE_URL` and authentication credentials omitted from logs and report.
- [x] **Cartesian Duplication Prevention**: Distinct aggregations (`COUNT(DISTINCT ph."priceId")`, `COUNT(DISTINCT pa."amenityId")`) correctly applied.
