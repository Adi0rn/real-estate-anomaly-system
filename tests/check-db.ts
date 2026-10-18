import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

async function check() {
  if (!connectionString) {
    console.error("STATUS: NO_DATABASE_URL");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const propertyCount = await prisma.property.count();
    const anomalyCount = await prisma.propertyAnomaly.count();
    const embeddingRows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int as count FROM "PropertyEmbedding"
    `;

    console.log("STATUS: SUCCESS");
    console.log("PROPERTY_COUNT:", propertyCount);
    console.log("ANOMALY_COUNT:", anomalyCount);
    console.log("EMBEDDING_COUNT:", embeddingRows[0]?.count ?? 0);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("STATUS: ERROR");
    console.error("ERROR_MESSAGE:", msg);
  } finally {
    await prisma.$disconnect();
  }
}

check();
