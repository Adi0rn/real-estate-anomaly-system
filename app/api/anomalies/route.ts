import { NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@/src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    const anomalies = await prisma.propertyAnomaly.findMany({
      orderBy: {
        detectedAt: "desc",
      },
      include: {
        property: {
          select: {
            propertyId: true,
            title: true,
            city: true,
            price: true,
            propertyType: true,
            listingType: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      count: anomalies.length,
      anomalies: anomalies.map((anomaly) => ({
        anomalyId: anomaly.anomalyId,
        propertyId: anomaly.propertyId,
        property: anomaly.property,
        expectedPrice: anomaly.expectedPrice.toString(),
        actualPrice: anomaly.actualPrice.toString(),
        priceDifference: anomaly.priceDifference.toString(),
        anomalyScore: anomaly.anomalyScore.toString(),
        reason: anomaly.reason,
        status: anomaly.status,
        detectedAt: anomaly.detectedAt,
      })),
    });
  } catch (error) {
    console.error("Anomaly retrieval API error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to retrieve saved anomalies." },
      { status: 500 },
    );
  }
}
