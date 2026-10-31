import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL || "" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=================================================================");
  console.log("   INSPECTING IMPACT OF RENT CORRECTION ON ANOMALIES & HISTORY   ");
  console.log("=================================================================\n");

  // 1. Anomalies attached to RENT vs SALE properties
  const allAnomalies = await prisma.propertyAnomaly.findMany({
    include: {
      property: {
        select: {
          propertyId: true,
          title: true,
          city: true,
          propertyType: true,
          listingType: true,
          price: true,
          areaSqft: true,
        },
      },
    },
    orderBy: { propertyId: "asc" },
  });

  const rentAnomalies = allAnomalies.filter((a) => a.property.listingType === "RENT");
  const saleAnomalies = allAnomalies.filter((a) => a.property.listingType === "SALE");

  console.log(`[1] PropertyAnomaly Distribution:`);
  console.log(`  - Total Anomaly Records: ${allAnomalies.length}`);
  console.log(`  - Anomalies on SALE properties: ${saleAnomalies.length}`);
  console.log(`  - Anomalies on RENT properties: ${rentAnomalies.length}\n`);

  console.log(`[2] Details of Existing Anomalies:`);
  for (const a of allAnomalies) {
    console.log(
      `  - Anomaly #${a.anomalyId} | Prop #${a.propertyId} (${a.property.listingType} ${a.property.city} ${a.property.propertyType}) | Actual: ₹${Number(a.actualPrice).toLocaleString("en-IN")} | Expected: ₹${Number(a.expectedPrice).toLocaleString("en-IN")} | Score: ${a.anomalyScore} | Status: ${a.status}`
    );
  }

  // 2. PriceHistory records attached to RENT vs SALE properties
  const totalHistory = await prisma.priceHistory.count();
  const rentHistoryCount = await prisma.priceHistory.count({
    where: { property: { listingType: "RENT" } },
  });
  const saleHistoryCount = await prisma.priceHistory.count({
    where: { property: { listingType: "SALE" } },
  });

  console.log(`\n[3] PriceHistory Records:`);
  console.log(`  - Total PriceHistory Records: ${totalHistory}`);
  console.log(`  - PriceHistory on SALE properties (untouched): ${saleHistoryCount}`);
  console.log(`  - PriceHistory on RENT properties (require scaling): ${rentHistoryCount}`);

  // Sample history records for a RENT property
  if (rentAnomalies.length > 0) {
    const samplePropId = rentAnomalies[0].propertyId;
    const sampleHistory = await prisma.priceHistory.findMany({
      where: { propertyId: samplePropId },
      orderBy: { recordedAt: "desc" },
    });
    console.log(`\n[4] Sample Historical Price Records for RENT Property #${samplePropId}:`);
    for (const h of sampleHistory) {
      console.log(`  - ID #${h.priceId} | Date: ${h.recordedAt.toISOString().slice(0, 10)} | Price: ₹${Number(h.price).toLocaleString("en-IN")}`);
    }
  }

  console.log("\n=================================================================");
  console.log("   INSPECTION COMPLETE");
  console.log("=================================================================");
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
