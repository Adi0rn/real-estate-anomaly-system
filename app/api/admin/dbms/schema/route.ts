import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth";
import { db } from "@/src/lib/dbms-analytics";

const APPLICATION_TABLES = [
  "Property",
  "PropertyEmbedding",
  "PropertyAnomaly",
  "PriceHistory",
  "PropertyAmenity",
  "Amenity",
  "User",
];

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status }
      );
    }

    // 1. Application Tables
    const tables = await db.$queryRaw<
      Array<{
        table_name: string;
        table_type: string;
      }>
    >`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY(${APPLICATION_TABLES})
      ORDER BY table_name ASC;
    `;

    // 2. Columns & Data Types
    const columns = await db.$queryRaw<
      Array<{
        table_name: string;
        column_name: string;
        data_type: string;
        udt_name: string;
        is_nullable: string;
        column_default: string | null;
        ordinal_position: number;
      }>
    >`
      SELECT
        table_name,
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY(${APPLICATION_TABLES})
      ORDER BY table_name ASC, ordinal_position ASC;
    `;

    // 3. Primary Keys
    const primaryKeys = await db.$queryRaw<
      Array<{
        table_name: string;
        column_name: string;
        constraint_name: string;
      }>
    >`
      SELECT
        tc.table_name,
        kcu.column_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = ANY(${APPLICATION_TABLES})
      ORDER BY tc.table_name ASC, kcu.ordinal_position ASC;
    `;

    // 4. Foreign Keys
    const foreignKeys = await db.$queryRaw<
      Array<{
        table_name: string;
        column_name: string;
        foreign_table_name: string;
        foreign_column_name: string;
        constraint_name: string;
      }>
    >`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = ANY(${APPLICATION_TABLES})
      ORDER BY tc.table_name ASC, kcu.column_name ASC;
    `;

    // 5. Unique Constraints
    const uniqueConstraints = await db.$queryRaw<
      Array<{
        table_name: string;
        column_name: string;
        constraint_name: string;
      }>
    >`
      SELECT
        tc.table_name,
        kcu.column_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
        AND tc.table_name = ANY(${APPLICATION_TABLES})
      ORDER BY tc.table_name ASC, kcu.column_name ASC;
    `;

    // 6. Check Constraints
    const checkConstraints = await db.$queryRaw<
      Array<{
        table_name: string;
        constraint_name: string;
        check_clause: string;
      }>
    >`
      SELECT
        tc.table_name,
        tc.constraint_name,
        cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
        AND tc.table_schema = cc.constraint_schema
      WHERE tc.constraint_type = 'CHECK'
        AND tc.table_schema = 'public'
        AND tc.table_name = ANY(${APPLICATION_TABLES})
      ORDER BY tc.table_name ASC, tc.constraint_name ASC;
    `;

    // 7. Indexes (including HNSW index on PropertyEmbedding)
    const indexes = await db.$queryRaw<
      Array<{
        table_name: string;
        index_name: string;
        index_definition: string;
      }>
    >`
      SELECT
        tablename AS table_name,
        indexname AS index_name,
        indexdef AS index_definition
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = ANY(${APPLICATION_TABLES})
      ORDER BY tablename ASC, indexname ASC;
    `;

    // 8. PropertyDashboardSummary View Definition
    const views = await db.$queryRaw<
      Array<{
        view_name: string;
        view_definition: string;
      }>
    >`
      SELECT
        c.relname AS view_name,
        pg_get_viewdef(c.oid, true) AS view_definition
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'PropertyDashboardSummary'
        AND c.relkind = 'v'
        AND n.nspname = 'public';
    `;

    // 9. Installed Triggers
    const triggers = await db.$queryRaw<
      Array<{
        trigger_name: string;
        table_name: string;
        trigger_definition: string;
      }>
    >`
      SELECT
        t.tgname AS trigger_name,
        c.relname AS table_name,
        pg_get_triggerdef(t.oid, true) AS trigger_definition
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND NOT t.tgisinternal
      ORDER BY c.relname ASC, t.tgname ASC;
    `;

    // 10. Trigger Functions
    const triggerFunctions = await db.$queryRaw<
      Array<{
        function_name: string;
        function_definition: string;
      }>
    >`
      SELECT
        p.proname AS function_name,
        pg_get_functiondef(p.oid) AS function_definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN ('record_property_price_history')
      ORDER BY p.proname ASC;
    `;

    return NextResponse.json({
      success: true,
      schema: {
        tables,
        columns,
        primaryKeys,
        foreignKeys,
        uniqueConstraints,
        checkConstraints,
        indexes,
        views,
        triggers,
        triggerFunctions,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Schema query failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
