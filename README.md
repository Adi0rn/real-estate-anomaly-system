# PropAudit — Enterprise Real Estate Pricing Anomaly Detection & DBMS Analytics System

**PropAudit** is an enterprise-grade real estate valuation, pricing anomaly detection, and database management system (DBMS) analytics platform. Bootstrapped with Next.js 16 (App Router), React 19, TypeScript, Prisma ORM 7, and PostgreSQL 16+ (Supabase) with `pgvector`, PropAudit combines statistical outlier detection, dense semantic vector search, automated database triggers, relational integrity constraints, and an administrative DBMS operations console.

---

## 1. Problem Statement

Real estate marketplaces frequently suffer from pricing opacity, artificial valuation inflation, typographical data entry errors, and fraudulent listing behavior. In heterogeneous multi-city portfolios, identifying undervalued gems or overpriced listings is challenging due to varying baseline rates per square foot, property types, and configurations. Furthermore, maintaining relational integrity, auditable price change history, and high-performance search across thousands of properties requires rigorous database management patterns that go beyond standard CRUD applications.

---

## 2. Objectives

- **Automated Valuation & Anomaly Detection:** Detect anomalous listings by comparing asking prices against peer-group statistical distributions (Z-scores) and multi-factor valuation heuristics.
- **Natural Language Semantic Search:** Enable conversational, natural-language property discovery using dense 384-dimensional vector embeddings and cosine similarity indexing via PostgreSQL `pgvector`.
- **Level 3 DBMS Relational Analytics:** Demonstrate advanced relational query paradigms including multi-table JOINs, GROUP BY with HAVING thresholds, Common Table Expressions (CTEs), window functions (`AVG`, `STDDEV`, `LAG`), correlated subqueries, and anti-Cartesian relational views.
- **Automated Database Auditing:** Enforce immutable price auditing at the database layer via PostgreSQL PL/pgSQL triggers (`AFTER UPDATE OF price`).
- **Administrative Operations & Schema Explorer:** Provide an authenticated administrative console for executing safe DML mutations with lifecycle guards and inspecting live database catalogs in real time.
- **Strict Data Integrity:** Guarantee domain validity at the schema level using PostgreSQL CHECK constraints and referential foreign keys.

---

## 3. Core Features

1. **Intelligent Anomaly Radar:** Continuously evaluates listings against regional benchmarks; flags properties with severe deviations; categorizes severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`); provides administrative review workflows (`PENDING`, `CONFIRMED`, `DISMISSED`).
2. **Dense Vector Semantic Search:** Search listings by natural descriptions (e.g., *"spacious modern 3BHK villa with pool near tech corridor"*); computes cosine similarity using native `pgvector` operators.
3. **DBMS Relational Analytics Console:** Six specialized analytical tabs embedded in the Admin portal displaying real-time SQL execution with parameter inspection.
4. **PostgreSQL Trigger-Automated Audit Trail:** Tracks all price modifications automatically; prevents duplicate audit rows through selective firing conditions (`WHEN (OLD.price IS DISTINCT FROM NEW.price)`).
5. **Admin DBMS Operations Console:** Perform guarded `INSERT`, `UPDATE`, and `DELETE` operations on sandboxed `[DBMS CONSOLE]` DRAFT records with foreign-key cascade protection.
6. **Live PostgreSQL Schema Explorer:** Inspect database tables, columns, primary keys, foreign keys, CHECK constraints, PostgreSQL triggers, relational views, and HNSW vector indexes directly from the UI.
7. **Role-Based Access Control (RBAC):** Cryptographically signed session cookies enforcing strict separation between `USER`, `AGENT`, and `ADMIN` accounts.
8. **Interactive UI & Visualizations:** Rich property cards, image carousels, responsive grid views, historical price timeline charts, and active SQL inspection drawers.

---

## 4. Technology Stack

- **Web Framework:** [Next.js 16](https://nextjs.org) (App Router, Server Actions, Route Handlers)
- **User Interface:** [React 19](https://react.dev), [Tailwind CSS](https://tailwindcss.com), [Lucide React](https://lucide.dev)
- **Programming Language:** [TypeScript 5+](https://www.typescriptlang.org) (Strict type-checking enabled)
- **Object-Relational Mapping:** [Prisma ORM 7](https://www.prisma.io) with `@prisma/adapter-pg` driver adapter
- **Database Engine:** [PostgreSQL 16+](https://www.postgresql.org) hosted on [Supabase](https://supabase.com)
- **Vector Search Extension:** [`pgvector`](https://github.com/pgvector/pgvector) with HNSW cosine distance indexing
- **Authentication:** Stateless HMAC SHA-256 cryptographically signed session cookies with timing-safe validation
- **Testing & Tooling:** Node.js native test runner (`node:test`, `node:assert/strict`), `tsx` executor, ESLint, TypeScript compiler (`tsc`)

---

## 5. Database Architecture

PropAudit uses a hybrid relational and vector database architecture in PostgreSQL. Relational models enforce strict transactional consistency, referential integrity, and cascading deletions, while the `pgvector` extension provides dense vector indexing for machine-learning-driven similarity search.

### Relational & Vector Justification
- **Relational DBMS Justification:** Real estate transactions and pricing histories represent financial data where ACID compliance is mandatory. Multi-table relationships (users owning properties, properties having amenities, price histories, anomaly reviews) require deterministic JOINs, row-level locking (`SELECT ... FOR UPDATE`), atomic transactions, and database-level triggers to guarantee auditability without application-layer race conditions.
- **Vector Justification:** Traditional keyword search fails on descriptive property queries containing subjective criteria, architectural styles, and lifestyle terms. By converting property metadata into 384-dimensional embeddings stored in a dedicated `PropertyEmbedding` table with an HNSW vector index (`vector_cosine_ops`), PropAudit achieves sub-millisecond semantic search across large property catalogues.

---

## 6. Seven-Entity Schema Overview

The database schema comprises seven distinct entities designed for third normal form (3NF) relational compliance:

1. **`User`**: Account identities, credential hashes, roles (`USER`, `AGENT`, `ADMIN`), and creation timestamps.
2. **`Property`**: Core listing entity containing property specifications (type, listing type, price, area, room counts, address, coordinates, status, owner linkage).
3. **`Amenity`**: Canonical master lookup dictionary of property amenities and features.
4. **`PropertyAmenity`**: Composite-key (`propertyId`, `amenityId`) join table modeling the many-to-many relationship between properties and amenities with `ON DELETE CASCADE`.
5. **`PriceHistory`**: Chronological price audit log recording property valuations over time; populated automatically by database triggers.
6. **`PropertyAnomaly`**: Pricing anomalies detected by ML/statistical heuristics, storing expected vs. actual price, anomaly score, detection reason, and review status.
7. **`PropertyEmbedding`**: Dense 384-dimensional vector embeddings for each property, indexed via pgvector for semantic search.

---

## 7. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    User ||--o{ Property : "owns"
    User ||--o{ PropertyAnomaly : "reviews"
    Property ||--o{ PriceHistory : "has audit trail"
    Property ||--o{ PropertyAnomaly : "evaluated for"
    Property ||--o{ PropertyEmbedding : "indexed by"
    Property ||--|{ PropertyAmenity : "contains"
    Amenity ||--|{ PropertyAmenity : "associated with"

    User {
        int userId PK
        string name
        string email UK
        string passwordHash
        string role "USER | AGENT | ADMIN"
        datetime createdAt
    }

    Property {
        int propertyId PK
        string title
        string description
        string propertyType "APARTMENT | HOUSE | VILLA"
        string listingType "SALE | RENT"
        decimal price "CHECK > 0"
        int areaSqft "CHECK > 0"
        int bedrooms "CHECK >= 0"
        int bathrooms "CHECK >= 0"
        string address
        string city
        string state
        string pincode
        decimal latitude
        decimal longitude
        string status "ACTIVE | DRAFT | ARCHIVED"
        int ownerId FK
        datetime createdAt
        datetime updatedAt
    }

    Amenity {
        int amenityId PK
        string name UK
    }

    PropertyAmenity {
        int propertyId PK, FK
        int amenityId PK, FK
    }

    PriceHistory {
        int priceId PK
        int propertyId FK
        decimal price "CHECK > 0"
        datetime recordedAt
    }

    PropertyAnomaly {
        int anomalyId PK
        int propertyId FK, UK
        decimal expectedPrice
        decimal actualPrice
        decimal priceDifference
        decimal anomalyScore
        string reason
        string status "PENDING | CONFIRMED | DISMISSED"
        datetime detectedAt
        int reviewedBy FK
        datetime reviewedAt
    }

    PropertyEmbedding {
        int id PK
        int propertyId FK, UK
        vector embedding "384 dimensions"
        datetime createdAt
    }
```

---

## 8. Authentication & Role-Based Access Control (RBAC)

PropAudit implements a lightweight, secure, and stateless authentication mechanism:

- **Session Tokens:** Users receive an HTTP-only, secure cookie (`auth-token`) containing an encrypted payload: `userId:role:expiresAt:signature`.
- **Cryptographic Signing:** Signatures are generated using HMAC SHA-256 with a server-side secret (`AUTH_SECRET`). Verification uses timing-safe equality comparisons (`crypto.timingSafeEqual`) to prevent side-channel timing attacks.
- **Roles & Permissions:**
  - `USER`: Browse active listings, search semantically, view property details, inspect price history charts.
  - `AGENT`: Manage personal property listings, submit price updates, track portfolio performance.
  - `ADMIN`: Access `/admin` route, review pricing anomalies, execute DBMS relational analytics, operate the DBMS Operations Console, and inspect PostgreSQL system catalogs.
- **Protection Middleware & Route Guards:** Centralized helpers (`requireAuth`, `requireAdmin`, `getCurrentUser`) enforce authorization at both the API route and server component layers. Non-admin access to protected endpoints yields immediate `403 Forbidden` responses.

---

## 9. Semantic Vector Search Pipeline

The search pipeline leverages PostgreSQL `pgvector` to deliver sub-second natural language query matching:

1. **Embedding Generation:** Input search queries (e.g., *"3 BHK penthouse with balcony in Whitefield Bangalore"*) are converted into 384-dimensional dense vectors.
2. **Cosine Distance Scoring:** The database executes a vector cosine distance operator (`<=>`):
   ```sql
   SELECT
     p."propertyId",
     p."title",
     p."price",
     p."city",
     1 - (pe.embedding <=> $1::vector) AS similarity
   FROM "Property" p
   JOIN "PropertyEmbedding" pe ON p."propertyId" = pe."propertyId"
   WHERE p."status" = 'ACTIVE'
   ORDER BY pe.embedding <=> $1::vector ASC
   LIMIT $2;
   ```
3. **Index Optimization:** A hierarchical navigable small-world (HNSW) vector index (`PropertyEmbedding_embedding_idx`) guarantees fast nearest-neighbor retrieval without full table scans.
4. **Hybrid Filtering:** Supports deterministic pre-filtering by city, property type, price bounds, and bedroom count alongside vector similarity re-ranking.

---

## 10. Pricing Anomaly Detection Engine

The anomaly detection engine identifies discrepancies between listed asking prices and estimated market valuations:

- **Valuation Baseline Heuristics:** Computes an expected valuation based on city benchmark rates per square foot, property type multipliers (Apartment, House, Villa), and bedroom/bathroom configurations.
- **Statistical Z-Score Analysis:** Identifies local outliers using running statistical distributions:
  $$\text{Z-Score} = \frac{\text{Price} - \mu_{\text{city, type}}}{\sigma_{\text{city, type}}}$$
  Listings with $|\text{Z-Score}| > 1.5$ are flagged for review.
- **Severity Scoring:**
  - `CRITICAL`: $> 75\%$ price deviation or $\text{Score} \ge 85$
  - `HIGH`: $40\% - 75\%$ deviation or $\text{Score} \ge 65$
  - `MEDIUM`: $20\% - 40\%$ deviation or $\text{Score} \ge 40$
  - `LOW`: $10\% - 20\%$ deviation
- **Audit Workflow:** Flagged records enter the `PropertyAnomaly` queue where administrators can transition status from `PENDING` to `CONFIRMED` (verified fraud/error) or `DISMISSED` (justified premium).

---

## 11. DBMS Relational Analytics Engine

Implemented in `src/lib/dbms-analytics.ts`, this engine exposes seven foundational Level 3 relational database capabilities:

| ID | DBMS Paradigm | Business Use Case | Key SQL Features |
| :---: | :--- | :--- | :--- |
| **A** | **Multi-Table JOINs** | Anomaly Review Queue linking properties, owner profiles, and assigned reviewer accounts | `INNER JOIN`, `LEFT JOIN`, Table Aliases, `CASE` severity ordering |
| **B** | **GROUP BY & HAVING** | City & Property Type market summary with cohort threshold filtering | `COUNT`, `AVG`, `MIN`, `MAX`, `HAVING COUNT(*) >= $1` |
| **C** | **CTEs & Window Functions** | Valuation Z-score calculation to detect local statistical outliers | `WITH CohortStats AS (...)`, `AVG() OVER()`, `STDDEV() OVER()` |
| **D** | **Time-Series Analysis** | Price history delta audit tracking chronological valuation shifts | `LAG() OVER(PARTITION BY ... ORDER BY ...)`, Percentage Delta |
| **E** | **Correlated Subqueries** | Identify listings priced strictly above their specific city-and-type average | `WHERE price > (SELECT AVG(...) WHERE city = outer.city)` |
| **F** | **Relational View** | High-level summary of properties with distinct count metrics | `PropertyDashboardSummary`, `COUNT(DISTINCT ...)`, Anti-Cartesian |
| **G** | **ACID Transaction Demo** | Atomic price updates with row-level locking and controlled rollback | `SELECT ... FOR UPDATE`, Transaction boundary, Atomic Rollback |

---

## 12. Database Triggers & PostgreSQL Views

### Automated Price History Trigger
When an administrator or agent updates a property's price, PostgreSQL automatically maintains an immutable audit trail:

```sql
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
- **Selective Firing:** The `WHEN (OLD.price IS DISTINCT FROM NEW.price)` clause ensures zero redundant records on no-op updates.
- **Legacy Pruning:** Migration `20261102140500_property_price_history_trigger` explicitly executed `DROP TRIGGER IF EXISTS property_price_change_trigger` to prevent duplicate history insertions.

### Relational View: `PropertyDashboardSummary`
Aggregates one-to-many relationships (`PriceHistory` and `PropertyAmenity`) without Cartesian multiplication:

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
  p."propertyId", p."title", p."city", p."propertyType",
  p."price", p."status", u."name", u."email";
```

---

## 13. DBMS Operations & Schema Explorer Console

Embedded in the Admin portal (`/admin`), the console provides:

1. **Guarded CRUD Operations:**
   - **Create Property:** Inserts a new listing strictly prefixed with `[DBMS CONSOLE] ` and status `DRAFT`, immediately creating a baseline `PriceHistory` record in an atomic transaction.
   - **Update Price:** Mutates property price; verifies that the PostgreSQL trigger automatically appends the audit row.
   - **Delete Property:** Safely removes `[DBMS CONSOLE]` DRAFT records with cascading deletion of dependent price history rows.
2. **Safety Invariants:**
   - Mutations on base marketplace listings (properties 1–100) are blocked with `403 Forbidden`.
   - Administrators can only modify records where `ownerId` matches their authenticated identity.
3. **Live Schema Explorer:**
   - Read-only inspection of PostgreSQL `information_schema` and `pg_catalog`.
   - Inspects columns, data types, nullability, primary/foreign keys, CHECK constraints, indexes, triggers, and views.

---

## 14. Domain Integrity & Active CHECK Constraints

Enforced directly in the PostgreSQL database engine via migrations `20261012_add_anomaly_status_constraint` and `20261102150000_add_property_price_constraints`:

```sql
-- Enforce strictly positive property pricing
ALTER TABLE public."Property" ADD CONSTRAINT property_price_positive_check CHECK (price > 0);

-- Enforce positive area
ALTER TABLE public."Property" ADD CONSTRAINT property_area_positive_check CHECK ("areaSqft" > 0);

-- Enforce non-negative room counts
ALTER TABLE public."Property" ADD CONSTRAINT property_bedrooms_non_negative_check CHECK (bedrooms >= 0);
ALTER TABLE public."Property" ADD CONSTRAINT property_bathrooms_non_negative_check CHECK (bathrooms >= 0);

-- Restrict listing and property type domains
ALTER TABLE public."Property" ADD CONSTRAINT property_listing_type_check CHECK ("listingType" IN ('SALE', 'RENT'));
ALTER TABLE public."Property" ADD CONSTRAINT property_type_check CHECK ("propertyType" IN ('APARTMENT', 'HOUSE', 'VILLA'));

-- Enforce strictly positive price history values
ALTER TABLE public."PriceHistory" ADD CONSTRAINT price_history_price_positive_check CHECK (price > 0);

-- Restrict anomaly review workflow statuses
ALTER TABLE public."PropertyAnomaly" ADD CONSTRAINT property_anomaly_status_check CHECK (status IN ('PENDING', 'CONFIRMED', 'DISMISSED'));
```

---

## 15. Repository Folder Structure

```
real-estate-anomaly-system/
├── app/                              # Next.js 16 App Router pages & layouts
│   ├── admin/                        # Admin portal (Radar, DBMS Analytics, Operations Console)
│   ├── api/                          # REST API route handlers
│   │   ├── admin/analytics/          # DBMS analytics parameterized queries
│   │   ├── admin/dbms/               # DBMS operations (properties, schema explorer)
│   │   ├── auth/                     # Authentication & session endpoints
│   │   ├── properties/               # Property CRUD and search routes
│   │   └── search/                   # Vector similarity search endpoint
│   ├── properties/                   # Public property detail and listing pages
│   └── page.tsx                      # Marketplace homepage with hero search
├── components/                       # Modular React 19 UI components
│   ├── DbmsAnalyticsConsole.tsx      # Interactive 6-tab analytics console
│   ├── DbmsOperationsConsole.tsx      # Admin CRUD operations console
│   ├── DbmsSchemaExplorer.tsx        # PostgreSQL system catalog inspector
│   ├── PropertyCard.tsx              # Property display card with formatted INR
│   └── Navbar.tsx                    # Navigation and authentication controls
├── docs/                             # Architecture & audit documentation
│   ├── IMPLEMENTATION_STATUS.md      # Detailed verification and audit records
│   ├── SQL_QUERY_CATALOG.md          # Comprehensive DBMS SQL specification
│   └── qa-artifacts/                 # QA screenshots and verification proofs
├── prisma/                           # Database schema and migration management
│   ├── migrations/                   # Versioned PostgreSQL migrations
│   │   ├── 20261007193951_init/
│   │   ├── 20261012_add_anomaly_status_constraint/
│   │   ├── 20261012_add_property_embeddings/
│   │   ├── 20261102140500_property_price_history_trigger/
│   │   └── 20261102150000_add_property_price_constraints/
│   ├── schema.prisma                 # Declarative Prisma schema definition
│   └── seed.ts                       # Demonstration seed generator
├── scripts/                          # Utility & maintenance scripts
│   └── create-property-dashboard-view.sql # Relational view DDL
├── src/
│   ├── generated/prisma/             # Generated Prisma Client runtime
│   └── lib/                          # Core application utilities
│       ├── auth-crypto.ts            # Session encryption & verification
│       ├── dbms-analytics.ts         # Parameterized relational queries & client
│       └── formatters.ts             # Currency (INR) and date formatting helpers
├── tests/                            # Automated regression & verification test suites
│   ├── api-security.test.ts          # Authentication and RBAC security tests
│   ├── dbms-analytics.test.ts        # Relational analytics test suite (8 tests)
│   ├── dbms-operations.test.ts       # DBMS operations & trigger test suite (13 tests)
│   └── search.test.ts                # Semantic vector search test suite (8 tests)
├── .env.example                      # Template for required environment variables
├── package.json                      # Project dependencies and script declarations
└── tsconfig.json                     # Strict TypeScript compiler configuration
```

---

## 16. Environment Configuration

Copy `.env.example` to create your local `.env` file:

```bash
cp .env.example .env
```

| Variable | Description | Required | Example |
| :--- | :--- | :---: | :--- |
| `DATABASE_URL` | PostgreSQL connection string (Supabase or local) | **Yes** | `postgresql://user:pass@host:5432/db?schema=public` |
| `AUTH_SECRET` | 32+ character random secret for signing session cookies | **Yes** | `a9f82d...` (generate via `openssl rand -hex 32`) |
| `SEED_ADMIN_PASSWORD` | Password for generated administrative seed user | Optional | `secure_admin_password_123` |
| `SEED_USER_PASSWORD` | Password for standard demo users | Optional | `secure_user_password_123` |
| `CONFIRM_SEED_RESET` | Safety guard flag; prevents accidental seed resets | Optional | `false` |

> [!CAUTION]
> Never commit real database credentials or `.env` files to source control.

---

## 17. Installation & Prerequisites

### Prerequisites
- **Node.js**: v18.18.0 or higher (v20+ recommended)
- **Package Manager**: npm v9+
- **PostgreSQL**: PostgreSQL 15+ instance with the `pgvector` extension enabled

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/your-org/real-estate-anomaly-system.git
cd real-estate-anomaly-system
npm install
```

### Step 2: Generate Prisma Client
```bash
npx prisma generate
```

---

## 18. Database Migration & Deployment

Apply all pending versioned migrations to your PostgreSQL database:

```bash
# Check pending migrations
npx prisma migrate status

# Deploy migrations in production or staging
npx prisma migrate deploy
```

To register or refresh the `PropertyDashboardSummary` relational view:
```bash
psql "$DATABASE_URL" -f scripts/create-property-dashboard-view.sql
```

---

## 19. Local Development Server

Run the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The application initializes with:
- **Public Marketplace:** `http://localhost:3000/`
- **Property Catalog:** `http://localhost:3000/properties`
- **Admin Dashboard:** `http://localhost:3000/admin` (Requires ADMIN authentication)

---

## 20. Test Suite & Verification Matrix

PropAudit includes automated test suites covering relational queries, database triggers, security, and search:

```bash
# 1. Level 3 DBMS Relational Analytics Suite (8 tests)
npx tsx tests/dbms-analytics.test.ts

# 2. Level 3 DBMS Operations Console & Trigger Suite (13 tests)
npx tsx tests/dbms-operations.test.ts

# 3. API Security & Role-Based Access Control Suite (11 tests)
npx tsx tests/api-security.test.ts

# 4. Semantic Vector Search & Stability Suite (8 tests)
npx tsx tests/search.test.ts

# 5. TypeScript Static Typecheck
npx tsc --noEmit

# 6. ESLint Code Quality Inspection
npm run lint

# 7. Production Next.js Build
npm run build
```

---

## 21. Security Precautions & Known Limitations

- **Sandboxed Operations:** Property creations and modifications via the DBMS Operations Console are strictly limited to listings with the `[DBMS CONSOLE] ` prefix and `DRAFT` status. Core demonstration records (IDs 1–100) are protected against accidental deletion or mutation.
- **Timing-Safe Signatures:** Session verification utilizes cryptographic timing-safe comparisons to eliminate side-channel vulnerability.
- **Dry-Run Status of Synthetic RENT Correction:** The synthetic rental price scaling remediation script remains in dry-run status in the repository. Existing synthetic demonstration data records remain preserved until the scheduled database maintenance window.
- **No Arbitrary SQL Execution:** The application does not accept or execute raw user-submitted SQL strings. All DBMS analytics operations use strictly parameterized statements (`$1`, `$2`).

---

## 22. License

PropAudit is licensed under the [MIT License](LICENSE).
