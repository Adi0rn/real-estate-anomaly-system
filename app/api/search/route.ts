
import { NextRequest, NextResponse } from "next/server";
import { pipeline } from "@xenova/transformers";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

// Load the embedding model once and reuse it
let extractorPromise: ReturnType<typeof pipeline> | null = null;

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }
  return extractorPromise;
}

type SearchResult = {
  propertyId: number;
  title: string;
  description: string | null;
  similarity: number;
};

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Search query is required" },
        { status: 400 }
      );
    }

    if (query.length > 500) {
      return NextResponse.json(
        { success: false, error: "Search query is too long" },
        { status: 400 }
      );
    }

const params = request.nextUrl.searchParams;

const city = params.get("city")?.trim() || null;
const propertyType = params.get("propertyType")?.trim() || null;

const parseNumber = (name: string) => {
  const raw = params.get(name);
  if (raw === null) return null;
  if (raw.trim() === "") return NaN;
  return Number(raw);
};

const minPrice = parseNumber("minPrice");
const maxPrice = parseNumber("maxPrice");
const bedrooms = parseNumber("bedrooms");

if (
  [minPrice, maxPrice, bedrooms].some(
    (value) => value !== null && (!Number.isFinite(value) || value < 0)
  ) ||
  (bedrooms !== null && !Number.isInteger(bedrooms)) ||
  (minPrice !== null && maxPrice !== null && minPrice > maxPrice)
) {
  return NextResponse.json(
    { success: false, error: "Invalid search filters" },
    { status: 400 }
  );
}

    const extractor = await getExtractor();

    const output = await extractor(query, {
        pooling: "mean",
        normalize: true,
    } as any);

    const vector = Array.from(
        (output as { data: Float32Array }).data
    );
    const vectorString = JSON.stringify(vector);

    
    const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT
        p."propertyId",
        p.title,
        p.description,
        (1 - (e.embedding <=> ${vectorString}::vector))::float8
        AS similarity
    FROM "PropertyEmbedding" e
    JOIN "Property" p
        ON p."propertyId" = e."propertyId"
    WHERE p.status = 'ACTIVE'
        AND (${city}::text IS NULL OR LOWER(p.city) = LOWER(${city}::text))
        AND (
        ${propertyType}::text IS NULL
        OR LOWER(p."propertyType") = LOWER(${propertyType}::text)
        )
        AND (${minPrice}::numeric IS NULL OR p.price >= ${minPrice}::numeric)
        AND (${maxPrice}::numeric IS NULL OR p.price <= ${maxPrice}::numeric)
        AND (${bedrooms}::integer IS NULL OR p.bedrooms = ${bedrooms}::integer)
    ORDER BY e.embedding <=> ${vectorString}::vector
    LIMIT 10
    `;

    return NextResponse.json({
      success: true,
      query,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Semantic search error:", error);

    return NextResponse.json(
      { success: false, error: "Semantic search failed" },
      { status: 500 }
    );
  }
}
