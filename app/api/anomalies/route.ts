import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { requireAdmin } from "@/src/lib/auth";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
});

const prisma = new PrismaClient({ adapter });

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status },
      );
    }
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
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "digest" in error) {
      const digest = (error as { digest?: unknown }).digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_")) {
        throw error;
      }
    }
    console.error("Anomaly retrieval API error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to retrieve saved anomalies." },
      { status: 500 },
    );
  }
}
