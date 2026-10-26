import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getPropertyImage } from "../src/lib/property-images";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL || "" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== INSPECTING PROPERTIES 59, 89, 29 ===");
  const props = await prisma.property.findMany({
    where: { propertyId: { in: [59, 89, 29] } },
  });

  for (const p of props) {
    console.log(`\nProperty ID ${p.propertyId}:`);
    console.log(`  title: "${p.title}"`);
    console.log(`  propertyType: "${p.propertyType}"`);
    console.log(`  listingType: "${p.listingType}"`);
    console.log(`  city: "${p.city}"`);
    console.log(`  price: "${p.price.toString()}"`);
    console.log(`  bedrooms: ${p.bedrooms}`);
    console.log(`  bathrooms: ${p.bathrooms}`);
    console.log(`  areaSqft: ${p.areaSqft}`);
    console.log(`  resolved image: "${getPropertyImage(p.propertyId, p.propertyType)}"`);
  }

  console.log("\n=== TESTING /api/search?q=villas+in+Mumbai ===");
  try {
    const res = await fetch("http://localhost:3000/api/search?q=" + encodeURIComponent("villas in Mumbai"));
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Total results:", data.count);
    if (data.results) {
      for (const r of data.results) {
        console.log(`\nResult #${r.propertyId}:`, {
          propertyId: r.propertyId,
          title: r.title,
          propertyType: r.propertyType,
          listingType: r.listingType,
          price: r.price,
          priceType: typeof r.price,
          bedrooms: r.bedrooms,
          bathrooms: r.bathrooms,
          areaSqft: r.areaSqft,
          image: getPropertyImage(r.propertyId, r.propertyType),
        });
      }
    }
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

main().finally(() => prisma.$disconnect());
