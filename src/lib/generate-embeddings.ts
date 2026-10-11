
import { pipeline } from "@xenova/transformers";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Loading embedding model...");

  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  const properties = await prisma.property.findMany({
    where: { status: "ACTIVE" },
    select: {
      propertyId: true,
      title: true,
      description: true,
    },
  });

  console.log(`Generating embeddings for ${properties.length} properties...`);

  for (const property of properties) {
    const text = `${property.title}. ${property.description}`;

    const result = await extractor(text, {
      pooling: "mean",
      normalize: true,
    });

    const vector = Array.from(result.data as Float32Array);

    await prisma.$executeRaw`
      INSERT INTO "PropertyEmbedding"
        ("propertyId", embedding, "createdAt")
      VALUES (
        ${property.propertyId},
        ${JSON.stringify(vector)}::vector,
        NOW()
      )
      ON CONFLICT ("propertyId")
      DO UPDATE SET
        embedding = EXCLUDED.embedding,
        "createdAt" = NOW()
    `;

    console.log(`Embedded property ${property.propertyId}`);
  }

  console.log("Embedding generation complete!");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Embedding generation failed:", error);
  await prisma.$disconnect();
  process.exit(1);
});
