import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth";
import { db } from "@/src/lib/dbms-analytics";

interface CreatePropertyPayload {
  title: string;
  description: string;
  propertyType: string;
  listingType: string;
  price: number | string;
  areaSqft: number | string;
  bedrooms: number | string;
  bathrooms: number | string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

const VALID_PROPERTY_TYPES = ["APARTMENT", "HOUSE", "VILLA"];
const VALID_LISTING_TYPES = ["SALE", "RENT"];

/**
 * GET /api/admin/dbms/properties
 * Lists all DRAFT properties owned by the current administrator
 * that were created via the DBMS operations console.
 */
export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const adminUserId = authCheck.user.userId;

    const properties = await db.$queryRaw<
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
        priceHistoryCount: number;
      }>
    >`
      SELECT
        p."propertyId",
        p."title",
        p."description",
        p."propertyType",
        p."listingType",
        p."price"::text AS "price",
        p."areaSqft",
        p."bedrooms",
        p."bathrooms",
        p."address",
        p."city",
        p."state",
        p."pincode",
        p."status",
        p."ownerId",
        p."createdAt",
        p."updatedAt",
        COUNT(ph."priceId")::int AS "priceHistoryCount"
      FROM "Property" p
      LEFT JOIN "PriceHistory" ph ON p."propertyId" = ph."propertyId"
      WHERE p."ownerId" = ${adminUserId}
        AND p."title" LIKE '[DBMS CONSOLE]%'
        AND p."status" = 'DRAFT'
      GROUP BY p."propertyId"
      ORDER BY p."propertyId" DESC;
    `;

    return NextResponse.json({
      success: true,
      properties: properties.map((p) => ({
        ...p,
        propertyId: Number(p.propertyId),
        price: Number(p.price),
        priceHistoryCount: Number(p.priceHistoryCount),
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/dbms/properties
 * Inserts a new Property record with [DBMS CONSOLE] title prefix,
 * status = DRAFT, ownerId = authenticated administrator's userId,
 * and sets an initial PriceHistory snapshot within an atomic transaction.
 */
export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const adminUserId = authCheck.user.userId;
    let body: CreatePropertyPayload;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request payload." },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      propertyType,
      listingType,
      price,
      areaSqft,
      bedrooms,
      bathrooms,
      address,
      city,
      state,
      pincode,
    } = body;

    // Strict Server-Side Validation
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Field 'title' is mandatory and must be a non-empty string." },
        { status: 400 }
      );
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { success: false, error: "Field 'description' is mandatory and must be a non-empty string." },
        { status: 400 }
      );
    }
    const cleanPropType = propertyType?.trim().toUpperCase();
    if (!VALID_PROPERTY_TYPES.includes(cleanPropType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid propertyType '${propertyType}'. Must be one of: ${VALID_PROPERTY_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    const cleanListingType = listingType?.trim().toUpperCase();
    if (!VALID_LISTING_TYPES.includes(cleanListingType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid listingType '${listingType}'. Must be one of: ${VALID_LISTING_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return NextResponse.json(
        { success: false, error: "Field 'price' must be a strictly positive number." },
        { status: 400 }
      );
    }

    const numArea = parseInt(String(areaSqft), 10);
    if (isNaN(numArea) || numArea <= 0) {
      return NextResponse.json(
        { success: false, error: "Field 'areaSqft' must be a positive integer." },
        { status: 400 }
      );
    }

    const numBeds = parseInt(String(bedrooms), 10);
    if (isNaN(numBeds) || numBeds < 0) {
      return NextResponse.json(
        { success: false, error: "Field 'bedrooms' must be a non-negative integer." },
        { status: 400 }
      );
    }

    const numBaths = parseInt(String(bathrooms), 10);
    if (isNaN(numBaths) || numBaths < 0) {
      return NextResponse.json(
        { success: false, error: "Field 'bathrooms' must be a non-negative integer." },
        { status: 400 }
      );
    }

    if (!address || typeof address !== "string" || !address.trim()) {
      return NextResponse.json({ success: false, error: "Field 'address' is required." }, { status: 400 });
    }
    if (!city || typeof city !== "string" || !city.trim()) {
      return NextResponse.json({ success: false, error: "Field 'city' is required." }, { status: 400 });
    }
    if (!state || typeof state !== "string" || !state.trim()) {
      return NextResponse.json({ success: false, error: "Field 'state' is required." }, { status: 400 });
    }
    if (!pincode || typeof pincode !== "string" || !pincode.trim()) {
      return NextResponse.json({ success: false, error: "Field 'pincode' is required." }, { status: 400 });
    }

    // Automatically enforce [DBMS CONSOLE] prefix
    const trimmedTitle = title.trim();
    const finalTitle = trimmedTitle.startsWith("[DBMS CONSOLE]")
      ? trimmedTitle
      : `[DBMS CONSOLE] ${trimmedTitle}`;

    // Execute Property Creation and Initial PriceHistory Snapshot in One Atomic Transaction
    const transactionResult = await db.$transaction(async (tx) => {
      const [newProperty] = await tx.$queryRaw<
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
        INSERT INTO "Property" (
          "title",
          "description",
          "propertyType",
          "listingType",
          "price",
          "areaSqft",
          "bedrooms",
          "bathrooms",
          "address",
          "city",
          "state",
          "pincode",
          "latitude",
          "longitude",
          "status",
          "ownerId",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${finalTitle},
          ${description.trim()},
          ${cleanPropType},
          ${cleanListingType},
          ${numPrice},
          ${numArea},
          ${numBeds},
          ${numBaths},
          ${address.trim()},
          ${city.trim()},
          ${state.trim()},
          ${pincode.trim()},
          NULL,
          NULL,
          'DRAFT',
          ${adminUserId},
          NOW(),
          NOW()
        )
        RETURNING
          "propertyId", "title", "description", "propertyType", "listingType",
          "price"::text, "areaSqft", "bedrooms", "bathrooms", "address",
          "city", "state", "pincode", "status", "ownerId", "createdAt", "updatedAt";
      `;

      // Initial price snapshot inserted exactly once
      const [initialHistory] = await tx.$queryRaw<
        Array<{
          priceId: number;
          propertyId: number;
          price: string;
          recordedAt: Date;
        }>
      >`
        INSERT INTO "PriceHistory" ("propertyId", "price", "recordedAt")
        VALUES (${newProperty.propertyId}, ${numPrice}, NOW())
        RETURNING "priceId", "propertyId", "price"::text, "recordedAt";
      `;

      return {
        property: newProperty,
        history: initialHistory,
      };
    });

    return NextResponse.json(
      {
        success: true,
        propertyId: Number(transactionResult.property.propertyId),
        property: {
          ...transactionResult.property,
          propertyId: Number(transactionResult.property.propertyId),
          price: Number(transactionResult.property.price),
        },
        initialPriceHistory: {
          ...transactionResult.history,
          priceId: Number(transactionResult.history.priceId),
          propertyId: Number(transactionResult.history.propertyId),
          price: Number(transactionResult.history.price),
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database transaction failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
