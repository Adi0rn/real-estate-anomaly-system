import { Prisma, PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});


const prisma = new PrismaClient({ adapter });

const AREA_TOLERANCE = 0.40;
const MIN_COMPARABLES = 3;
const DEVIATION_THRESHOLD = 0.30;

export async function detectPriceAnomalies() {
  const properties = await prisma.property.findMany({
    where: { status: "ACTIVE" },
  });

  const detected = [];

  for (const property of properties) {
    const minArea = Math.floor(property.areaSqft * (1 - AREA_TOLERANCE));
    const maxArea = Math.ceil(property.areaSqft * (1 + AREA_TOLERANCE));

    const comparables = await prisma.property.findMany({
      where: {
  propertyId: { not: property.propertyId },
  status: "ACTIVE",
  city: property.city,
  listingType: property.listingType,
  bedrooms: {
    gte: Math.max(1, property.bedrooms - 1),
    lte: property.bedrooms + 1,
  },
  areaSqft: {
    gte: minArea,
    lte: maxArea,
  },
},
      select: {
        price: true,
      },
    });

    if (comparables.length < MIN_COMPARABLES) {
      continue;
    }

    const prices = comparables
      .map((item) => Number(item.price))
      .sort((a, b) => a - b);

    const middle = Math.floor(prices.length / 2);
    const median =
      prices.length % 2 === 0
        ? (prices[middle - 1] + prices[middle]) / 2
        : prices[middle];

    const actualPrice = Number(property.price);

    if (median <= 0) continue;

    const deviation = (actualPrice - median) / median;
    const absoluteDeviation = Math.abs(deviation);

    if (absoluteDeviation < DEVIATION_THRESHOLD) {
      continue;
    }

    const anomalyScore = Math.min(
      1,
      absoluteDeviation / DEVIATION_THRESHOLD,
    );

    const reason =
      deviation > 0
        ? `Price is ${(absoluteDeviation * 100).toFixed(1)}% above the comparable-property median.`
        : `Price is ${(absoluteDeviation * 100).toFixed(1)}% below the comparable-property median.`;

    detected.push({
      propertyId: property.propertyId,
      expectedPrice: new Prisma.Decimal(median.toFixed(2)),
      actualPrice: property.price,
      priceDifference: new Prisma.Decimal(
        (actualPrice - median).toFixed(2),
      ),
      anomalyScore: new Prisma.Decimal(anomalyScore.toFixed(3)),
      reason,
      status: "PENDING",
    });
  }

  for (const anomaly of detected) {
    await prisma.propertyAnomaly.upsert({
      where: {
        propertyId: anomaly.propertyId,
      },
      update: {
        expectedPrice: anomaly.expectedPrice,
        actualPrice: anomaly.actualPrice,
        priceDifference: anomaly.priceDifference,
        anomalyScore: anomaly.anomalyScore,
        reason: anomaly.reason,
        status: "PENDING",
        detectedAt: new Date(),
      },
      create: anomaly,
    });
  }

  return detected;
}
