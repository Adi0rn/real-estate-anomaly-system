import { NextRequest, NextResponse } from "next/server";
import { pipeline, FeatureExtractionPipeline } from "@xenova/transformers";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../src/generated/prisma/client";
import { parsePropertyQuery, getActiveCities } from "@/src/lib/parse-property-query";
import { SearchResult } from "@/types";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
});

const prisma = new PrismaClient({ adapter });

// Load the embedding model once and reuse it
let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    ) as Promise<FeatureExtractionPipeline>;
  }
  return extractorPromise;
}

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

    // Validate any structured numeric params if directly provided
    const parseNumber = (name: string) => {
      const raw = params.get(name);
      if (raw === null) return null;
      if (raw.trim() === "") return NaN;
      return Number(raw);
    };

    const rawMinPrice = parseNumber("minPrice");
    const rawMaxPrice = parseNumber("maxPrice");
    const rawBedrooms = parseNumber("bedrooms");

    if (
      [rawMinPrice, rawMaxPrice, rawBedrooms].some(
        (value) => value !== null && (!Number.isFinite(value) || value < 0)
      ) ||
      (rawBedrooms !== null && !Number.isInteger(rawBedrooms)) ||
      (rawMinPrice !== null && rawMaxPrice !== null && rawMinPrice > rawMaxPrice)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid search filters" },
        { status: 400 }
      );
    }

    // Retrieve verified active database cities and parse constraints dynamically
    const activeCities = await getActiveCities(prisma);
    const parsed = parsePropertyQuery(query, params, activeCities);

    // If there is an impossible conflict (e.g. city in prompt != city in param, or min > max)
    // or an unrecognized city was requested, return an honest empty result set rather than wrong-city fallback
    if (parsed.hasConflict || parsed.unrecognizedCityRequested) {
      return NextResponse.json({
        success: true,
        query,
        count: 0,
        appliedFilters: {
          city: parsed.city || parsed.unrecognizedCityRequested,
          propertyType: parsed.propertyType,
          bedrooms: parsed.bedrooms,
          minPrice: parsed.minPrice,
          maxPrice: parsed.maxPrice,
        },
        results: [],
      });
    }

    const effectiveCity = parsed.city;
    const effectiveType = parsed.propertyType;
    const effectiveMinPrice = parsed.minPrice;
    const effectiveMaxPrice = parsed.maxPrice;
    const effectiveBedrooms = parsed.bedrooms;

    const extractor = await getExtractor();

    // Use clean semantic query (with location filter keywords stripped) for dense vector embedding
    const output = await extractor(parsed.cleanSemanticQuery, {
      pooling: "mean",
      normalize: true,
    } as unknown as Record<string, unknown>);

    const vector = Array.from((output as { data: Float32Array }).data);
    const vectorString = JSON.stringify(vector);

    // Hard filters in WHERE run before vector distance ranking
    const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT
        p."propertyId",
        p.title,
        p.description,
        p.city,
        p.state,
        p.address,
        p.pincode,
        p.price::text as price,
        p."propertyType",
        p."listingType",
        p.bedrooms,
        p.bathrooms,
        p."areaSqft",
        p.status,
        p."ownerId",
        p."createdAt"::text as "createdAt",
        p."updatedAt"::text as "updatedAt",
        (1 - (e.embedding <=> ${vectorString}::vector))::float8 AS similarity
    FROM "PropertyEmbedding" e
    JOIN "Property" p
        ON p."propertyId" = e."propertyId"
    WHERE p.status = 'ACTIVE'
        AND (${effectiveCity}::text IS NULL OR LOWER(p.city) = LOWER(${effectiveCity}::text))
        AND (${effectiveType}::text IS NULL OR UPPER(p."propertyType") = UPPER(${effectiveType}::text))
        AND (${effectiveMinPrice}::numeric IS NULL OR p.price >= ${effectiveMinPrice}::numeric)
        AND (${effectiveMaxPrice}::numeric IS NULL OR p.price <= ${effectiveMaxPrice}::numeric)
        AND (${effectiveBedrooms}::integer IS NULL OR p.bedrooms = ${effectiveBedrooms}::integer)
    ORDER BY e.embedding <=> ${vectorString}::vector
    LIMIT 20
    `;

    return NextResponse.json({
      success: true,
      query,
      count: results.length,
      appliedFilters: {
        city: effectiveCity,
        propertyType: effectiveType,
        bedrooms: effectiveBedrooms,
        minPrice: effectiveMinPrice,
        maxPrice: effectiveMaxPrice,
      },
      results,
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "digest" in error) {
      const digest = (error as { digest?: unknown }).digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_")) {
        throw error;
      }
    }
    console.error("Semantic search error:", error);

    return NextResponse.json(
      { success: false, error: "Semantic search failed" },
      { status: 500 }
    );
  }
}
