import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth";
import { db } from "@/src/lib/dbms-analytics";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/dbms/properties/[id]
 * Retrieves the property details along with its chronological PriceHistory records
 * and lag-based price deltas.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authCheck = await requireAdmin(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { id } = await params;
    const propertyId = parseInt(id, 10);
    if (isNaN(propertyId) || propertyId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid property ID parameter." },
        { status: 400 }
      );
    }

    const [property] = await db.$queryRaw<
      Array<{
        propertyId: number;
        title: string;
        description: string;
        propertyType: string;
        listingType: string;
        price: string;
        areaSqft: number;
        bedrooms: number;
        bathrooms: number;
        address: string;
        city: string;
        state: string;
        pincode: string;
        status: string;
        ownerId: number;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`
      SELECT
        "propertyId", "title", "description", "propertyType", "listingType",
        "price"::text, "areaSqft", "bedrooms", "bathrooms", "address",
        "city", "state", "pincode", "status", "ownerId", "createdAt", "updatedAt"
      FROM "Property"
      WHERE "propertyId" = ${propertyId};
    `;

    if (!property) {
      return NextResponse.json({ success: false, error: "Property not found." }, { status: 404 });
    }

    // Retrieve longitudinal PriceHistory records using LAG() window function
    const priceHistory = await db.$queryRaw<
      Array<{
        priceId: number;
        propertyId: number;
        price: string;
        recordedAt: Date;
        previousPrice: string | null;
        priceDifference: string | null;
      }>
    >`
      SELECT
        "priceId",
        "propertyId",
        "price"::text AS "price",
        "recordedAt",
        LAG("price", 1) OVER (
          PARTITION BY "propertyId"
          ORDER BY "recordedAt" ASC, "priceId" ASC
        )::text AS "previousPrice",
        ("price" - LAG("price", 1) OVER (
          PARTITION BY "propertyId"
          ORDER BY "recordedAt" ASC, "priceId" ASC
        ))::text AS "priceDifference"
      FROM "PriceHistory"
      WHERE "propertyId" = ${propertyId}
      ORDER BY "recordedAt" DESC, "priceId" DESC;
    `;

    return NextResponse.json({
      success: true,
      property: {
        ...property,
        propertyId: Number(property.propertyId),
        price: Number(property.price),
      },
      priceHistory: priceHistory.map((ph) => ({
        priceId: Number(ph.priceId),
        propertyId: Number(ph.propertyId),
        price: Number(ph.price),
        recordedAt: ph.recordedAt,
        previousPrice: ph.previousPrice ? Number(ph.previousPrice) : null,
        priceDifference: ph.priceDifference ? Number(ph.priceDifference) : null,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/dbms/properties/[id]
 * Updates Property.price inside an atomic transaction.
 * Relying strictly on the PostgreSQL trigger "property_price_history_trigger"
 * to insert the resulting PriceHistory audit record.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authCheck = await requireAdmin(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { id } = await params;
    const propertyId = parseInt(id, 10);
    if (isNaN(propertyId) || propertyId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid property ID parameter." },
        { status: 400 }
      );
    }

    let body: { price?: number | string; newPrice?: number | string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const priceInput = body.newPrice ?? body.price;
    const numPrice = Number(priceInput);
    if (isNaN(numPrice) || numPrice <= 0) {
      return NextResponse.json(
        { success: false, error: "Field 'price' or 'newPrice' must be a strictly positive number." },
        { status: 400 }
      );
    }

    const adminUserId = authCheck.user.userId;

    // Transaction execution with validation & trigger audit row retrieval
    const result = await db.$transaction(async (tx) => {
      // 1. Lock and inspect target row
      const [existing] = await tx.$queryRaw<
        Array<{
          propertyId: number;
          title: string;
          price: string;
          ownerId: number;
          status: string;
        }>
      >`
        SELECT "propertyId", "title", "price"::text AS "price", "ownerId", "status"
        FROM "Property"
        WHERE "propertyId" = ${propertyId}
        FOR UPDATE;
      `;

      if (!existing) {
        return { errorStatus: 404, errorMessage: "Property not found." };
      }

      if (!existing.title.startsWith("[DBMS CONSOLE]")) {
        return {
          errorStatus: 403,
          errorMessage: "Console operations restricted: Target property was not created via DBMS Console.",
        };
      }

      if (Number(existing.ownerId) !== adminUserId) {
        return {
          errorStatus: 403,
          errorMessage: "Authorization denied: You do not own this DBMS Console property.",
        };
      }

      if (existing.status !== "DRAFT") {
        return {
          errorStatus: 403,
          errorMessage: "Console operations restricted: Property status is not DRAFT.",
        };
      }

      const oldPrice = Number(existing.price);

      // 2. Update Property price.
      // The PostgreSQL trigger 'property_price_history_trigger' executes AFTER UPDATE OF price
      // and automatically inserts the new row into 'PriceHistory'.
      await tx.$executeRaw`
        UPDATE "Property"
        SET "price" = ${numPrice}, "updatedAt" = NOW()
        WHERE "propertyId" = ${propertyId};
      `;

      // 3. Retrieve the newly created PriceHistory row from the trigger
      const [latestHistory] = await tx.$queryRaw<
        Array<{
          priceId: number;
          propertyId: number;
          price: string;
          recordedAt: Date;
        }>
      >`
        SELECT "priceId", "propertyId", "price"::text, "recordedAt"
        FROM "PriceHistory"
        WHERE "propertyId" = ${propertyId}
        ORDER BY "recordedAt" DESC, "priceId" DESC
        LIMIT 1;
      `;

      // 4. Retrieve total PriceHistory records count
      const [countRow] = await tx.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count FROM "PriceHistory" WHERE "propertyId" = ${propertyId};
      `;

      return {
        success: true,
        propertyId,
        oldPrice,
        newPrice: numPrice,
        latestPriceHistory: latestHistory
          ? {
              priceId: Number(latestHistory.priceId),
              propertyId: Number(latestHistory.propertyId),
              price: Number(latestHistory.price),
              recordedAt: latestHistory.recordedAt,
            }
          : null,
        historyCount: Number(countRow?.count ?? 0),
      };
    });

    if ("errorStatus" in result && result.errorStatus) {
      return NextResponse.json(
        { success: false, error: result.errorMessage },
        { status: result.errorStatus }
      );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Price update failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/dbms/properties/[id]
 * Deletes a console-created DRAFT Property row owned by the current administrator.
 * Relies on PostgreSQL foreign key ON DELETE CASCADE to remove child rows.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authCheck = await requireAdmin(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { id } = await params;
    const propertyId = parseInt(id, 10);
    if (isNaN(propertyId) || propertyId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid property ID parameter." },
        { status: 400 }
      );
    }

    const adminUserId = authCheck.user.userId;

    const result = await db.$transaction(async (tx) => {
      const [existing] = await tx.$queryRaw<
        Array<{
          propertyId: number;
          title: string;
          ownerId: number;
          status: string;
        }>
      >`
        SELECT "propertyId", "title", "ownerId", "status"
        FROM "Property"
        WHERE "propertyId" = ${propertyId}
        FOR UPDATE;
      `;

      if (!existing) {
        return { errorStatus: 404, errorMessage: "Property not found." };
      }

      if (!existing.title.startsWith("[DBMS CONSOLE]")) {
        return {
          errorStatus: 403,
          errorMessage: "Console deletion restricted: Target property was not created via DBMS Console.",
        };
      }

      if (Number(existing.ownerId) !== adminUserId) {
        return {
          errorStatus: 403,
          errorMessage: "Authorization denied: You do not own this DBMS Console property.",
        };
      }

      if (existing.status !== "DRAFT") {
        return {
          errorStatus: 403,
          errorMessage: "Console deletion restricted: Property status is not DRAFT.",
        };
      }

      // Delete target Property row; foreign keys cascade to PriceHistory and PropertyAmenity
      await tx.$executeRaw`
        DELETE FROM "Property"
        WHERE "propertyId" = ${propertyId};
      `;

      return {
        success: true,
        deletedPropertyId: propertyId,
        title: existing.title,
      };
    });

    if ("errorStatus" in result && result.errorStatus) {
      return NextResponse.json(
        { success: false, error: result.errorMessage },
        { status: result.errorStatus }
      );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Deletion failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
