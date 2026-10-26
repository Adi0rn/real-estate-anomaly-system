import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function check() {
  const propCount = await prisma.property.count();
  const activePropCount = await prisma.property.count({ where: { status: "ACTIVE" } });
  const embCountResult = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM "PropertyEmbedding"`;
  const embCount = Number(embCountResult[0].count);
  const sample = await prisma.$queryRaw<Array<{ propertyId: number; dims: number }>>`
    SELECT "propertyId", vector_dims(embedding) as dims FROM "PropertyEmbedding" LIMIT 3
  `;
  const cities = await prisma.property.findMany({
    distinct: ["city"],
    select: { city: true },
    orderBy: { city: "asc" },
  });
  const types = await prisma.property.findMany({
    distinct: ["propertyType"],
    select: { propertyType: true },
    orderBy: { propertyType: "asc" },
  });
  const cityCounts = await prisma.property.groupBy({
    by: ["city"],
    _count: { propertyId: true },
  });

  console.log("Property & Embedding Stats:", {
    propCount,
    activePropCount,
    embCount,
    dimensions: sample[0]?.dims,
    sample,
  });
  console.log("Distinct cities in DB:", cities.map((c) => c.city));
  console.log("City breakdown:", cityCounts.map((c) => ({ city: c.city, count: c._count.propertyId })));
  console.log("Distinct propertyTypes in DB:", types.map((t) => t.propertyType));

  await prisma.$disconnect();
}

check().catch(console.error);
