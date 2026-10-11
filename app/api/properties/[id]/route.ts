import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;
    const propertyId = Number(id);

    if (!Number.isInteger(propertyId) || propertyId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid property ID." },
        { status: 400 },
      );
    }

    const property = await prisma.property.findUnique({
      where: { propertyId },
      include: {
        owner: {
          select: {
            userId: true,
            name: true,
          },
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
        priceHistory: {
          orderBy: { recordedAt: "desc" },
        },
        anomalies: true,
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: "Property not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      property: {
        ...property,
        price: property.price.toString(),
        priceHistory: property.priceHistory.map((entry) => ({
          ...entry,
          price: entry.price.toString(),
        })),
        anomalies: property.anomalies.map((anomaly) => ({
          ...anomaly,
          expectedPrice: anomaly.expectedPrice.toString(),
          actualPrice: anomaly.actualPrice.toString(),
          priceDifference: anomaly.priceDifference.toString(),
          anomalyScore: anomaly.anomalyScore.toString(),
        })),
      },
    });
  } catch (error) {
    console.error("Property details API error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to retrieve property details." },
      { status: 500 },
    );
  }
}
