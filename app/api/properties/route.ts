import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
});

const prisma = new PrismaClient({ adapter });

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const city = searchParams.get("city");
    const propertyType = searchParams.get("propertyType");
    const listingType = searchParams.get("listingType");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const bedrooms = searchParams.get("bedrooms");

    const properties = await prisma.property.findMany({
      where: {
        status: "ACTIVE",
        ...(city && {
          city: { contains: city, mode: "insensitive" },
        }),
        ...(propertyType && { propertyType: propertyType as never }),
        ...(listingType && { listingType: listingType as never }),
        ...(minPrice && {
          price: { gte: Number(minPrice) },
        }),
        ...(maxPrice && {
          price: { lte: Number(maxPrice) },
        }),
        ...(bedrooms && { bedrooms: Number(bedrooms) }),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      count: properties.length,
      properties: properties.map((property) => ({
        ...property,
        price: property.price.toString(),
      })),
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "digest" in error) {
      const digest = (error as { digest?: unknown }).digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_")) {
        throw error;
      }
    }
    console.error("Property retrieval API error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to retrieve properties." },
      { status: 500 },
    );
  }
}
