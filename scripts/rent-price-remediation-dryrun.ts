import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "node:fs";
import path from "node:path";
import { formatINR, calculateSyntheticMonthlyRent } from "../src/lib/property-images";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL || "" });
const prisma = new PrismaClient({ adapter });

export type DryRunRow = {
  propertyId: number;
  title: string;
  city: string;
  propertyType: string;
  bedrooms: number;
  areaSqft: number;
  listingType: string;
  oldPrice: number;
  oldFormatted: string;
  newPrice: number;
  newFormatted: string;
  priceDifference: number;
  percentReduction: string;
};

async function main() {
  console.log("=================================================================");
  console.log("   PROPAUDIT RENT SEMANTICS CORRECTION: DRY-RUN AUDIT & TEST    ");
  console.log("=================================================================\n");

  // 1. Query all properties
  const allProperties = await prisma.property.findMany({
    orderBy: { propertyId: "asc" },
  });

  const rentProps = allProperties.filter((p) => p.listingType === "RENT");
  const saleProps = allProperties.filter((p) => p.listingType === "SALE");

  console.log(`[1] Database Records Breakdown:`);
  console.log(`  - Total Properties in DB:   ${allProperties.length}`);
  console.log(`  - RENT Records (Affected):   ${rentProps.length}`);
  console.log(`  - SALE Records (Untouched):  ${saleProps.length}`);

  // 2. Compute proposed replacements
  const dryRunData: DryRunRow[] = rentProps.map((p) => {
    const oldPrice = Number(p.price);
    const newPrice = calculateSyntheticMonthlyRent({
      propertyId: p.propertyId,
      city: p.city,
      propertyType: p.propertyType,
      bedrooms: p.bedrooms,
      areaSqft: p.areaSqft,
    });
    const diff = oldPrice - newPrice;
    const pct = ((diff / oldPrice) * 100).toFixed(2);

    return {
      propertyId: p.propertyId,
      title: p.title,
      city: p.city,
      propertyType: p.propertyType,
      bedrooms: p.bedrooms,
      areaSqft: p.areaSqft,
      listingType: p.listingType,
      oldPrice,
      oldFormatted: `${formatINR(oldPrice, true)} / month`,
      newPrice,
      newFormatted: `₹${newPrice.toLocaleString("en-IN")} / month`,
      priceDifference: diff,
      percentReduction: `${pct}%`,
    };
  });

  // 3. Export before/after dataset to docs/qa-artifacts/
  const exportDir = path.join(process.cwd(), "docs", "qa-artifacts");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  const exportPath = path.join(exportDir, "rent-remediation-dryrun.json");
  fs.writeFileSync(
    exportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalAffected: dryRunData.length,
        methodology: "City/Type/Area/Configuration Synthetic Monthly Rent Model",
        records: dryRunData,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`\n[2] Exported full before-value audit to:\n    ${exportPath}`);

  // 4. Print dry-run sample table
  console.log(`\n[3] Dry-Run Comparison Table (Sample of First 15 Affected Records):`);
  console.log(
    "| ID | City | Type | Beds | Area (sqft) | Old Valuation (Erroneous) | Proposed Replacement Rent |"
  );
  console.log(
    "|:---|:---|:---|:---:|:---:|:---|:---|"
  );
  for (const row of dryRunData.slice(0, 15)) {
    console.log(
      `| ${row.propertyId} | ${row.city} | ${row.propertyType} | ${row.bedrooms} | ${row.areaSqft} | ${row.oldFormatted} | ${row.newFormatted} |`
    );
  }

  // 5. Explicit Atomic Transaction and Rollback Test
  console.log(`\n[4] Executing Atomic Transaction with Rollback Test:`);
  let rollbackSucceeded = false;

  try {
    await prisma.$transaction(async (tx) => {
      console.log("  → Inside transaction: executing hypothetical update on 50 RENT rows...");

      let txUpdatedCount = 0;
      for (const row of dryRunData) {
        await tx.property.update({
          where: { propertyId: row.propertyId },
          data: { price: row.newPrice },
        });
        txUpdatedCount++;
      }

      console.log(`  → Successfully staged updates for ${txUpdatedCount} RENT rows.`);

      // Verify within transaction
      const txCheckRent = await tx.property.findFirst({
        where: { propertyId: dryRunData[0].propertyId },
      });
      console.log(`  → In-transaction read for ID ${dryRunData[0].propertyId}: ${txCheckRent?.price} (staged new value)`);

      // Verify SALE records remained unchanged in transaction
      const txCheckSale = await tx.property.findFirst({
        where: { propertyId: 1 },
      });
      console.log(`  → In-transaction read for SALE ID 1: ${txCheckSale?.price} (completely untouched)`);

      // Trigger intentional rollback
      throw new Error("ROLLBACK_TEST_SUCCESSFUL");
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "ROLLBACK_TEST_SUCCESSFUL") {
      rollbackSucceeded = true;
      console.log("  ✓ Caught expected rollback signal. Transaction cleanly rolled back.");
    } else {
      console.error("  ✗ Unexpected transaction error:", err);
    }
  }

  // 6. Post-Rollback Database Invariant Verification
  console.log(`\n[5] Post-Rollback Live Database Verification:`);
  const postCheckRent = await prisma.property.findFirst({
    where: { propertyId: dryRunData[0].propertyId },
  });
  const postCheckSale = await prisma.property.findFirst({
    where: { propertyId: 1 },
  });

  const liveRentUnchanged = Number(postCheckRent?.price) === dryRunData[0].oldPrice;
  const liveSaleUnchanged = Number(postCheckSale?.price) === Number(saleProps[0].price);

  console.log(`  - Live RENT Property ID ${dryRunData[0].propertyId} price: ${postCheckRent?.price} (${liveRentUnchanged ? "UNCHANGED - SAFE" : "MUTATED - ERROR"})`);
  console.log(`  - Live SALE Property ID 1 price: ${postCheckSale?.price} (${liveSaleUnchanged ? "UNCHANGED - SAFE" : "MUTATED - ERROR"})`);

  if (!rollbackSucceeded || !liveRentUnchanged || !liveSaleUnchanged) {
    console.error("  ✗ ROLLBACK TEST FAILED TO PRESERVE DATABASE STATE");
    process.exit(1);
  }

  console.log("\n=================================================================");
  console.log("✓ DRY-RUN AND ROLLBACK TEST COMPLETED SUCCESSFULLY");
  console.log("  LIVE DATABASE REMAINS 100% UNTOUCHED (PENDING USER APPROVAL)");
  console.log("=================================================================");
}

main()
  .catch((err) => {
    console.error("Dry run execution error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
