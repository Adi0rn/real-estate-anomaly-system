/**
 * Natural language query parser for PropAudit semantic real estate search.
 * Deterministically extracts hard constraints (canonical city, propertyType,
 * bedrooms, price range) before executing pgvector similarity search.
 *
 * Cities are dynamically resolved from actual property data (with TTL caching)
 * and mapped through exact-phrase word-boundary patterns and known aliases.
 */

export type CanonicalPropertyType = "APARTMENT" | "HOUSE" | "VILLA";

export type ParsedPropertyQuery = {
  rawQuery: string;
  cleanSemanticQuery: string;
  city: string | null;
  propertyType: CanonicalPropertyType | null;
  bedrooms: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  hasConflict: boolean;
  unrecognizedCityRequested: string | null;
};

// Known linguistic aliases for canonical cities
const KNOWN_CITY_ALIASES: Record<string, string[]> = {
  Bangalore: ["bangalore", "bengaluru"],
  Mumbai: ["mumbai", "bombay"],
  Pune: ["pune", "poona"],
  Hyderabad: ["hyderabad"],
  Chennai: ["chennai", "madras"],
  Kolkata: ["kolkata", "calcutta"],
  Delhi: ["delhi", "new delhi", "ncr"],
  Goa: ["goa"],
};

// Verified fallback active cities derived from database property dataset
const DEFAULT_ACTIVE_CITIES = ["Bangalore", "Chennai", "Hyderabad", "Mumbai", "Pune"];

// In-memory cache for database-derived active cities
let cachedActiveCities: string[] = DEFAULT_ACTIVE_CITIES;
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Retrieves the active distinct cities from the Property table,
 * caching results to avoid repeated database roundtrips during search.
 */
export async function getActiveCities(prismaClient?: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  property: { findMany: (...args: any[]) => Promise<any> };
}): Promise<string[]> {
  const now = Date.now();
  if (now - lastCacheTimestamp < CACHE_TTL_MS && cachedActiveCities.length > 0) {
    return cachedActiveCities;
  }

  if (prismaClient) {
    try {
      const records = (await prismaClient.property.findMany({
        where: { status: "ACTIVE" },
        select: { city: true },
        distinct: ["city"],
      })) as Array<{ city?: string | null }>;
      const uniqueCities: string[] = Array.from(
        new Set(records.map((r) => (r.city ?? "").trim()).filter(Boolean))
      );
      if (uniqueCities.length > 0) {
        cachedActiveCities = uniqueCities;
        lastCacheTimestamp = now;
        return cachedActiveCities;
      }
    } catch {
      // Graceful fallback to verified active dataset cache
    }
  }

  return cachedActiveCities;
}

/**
 * Builds deterministic word-boundary regex patterns for active cities and aliases.
 */
function buildCityPatterns(activeCities: string[]): Array<{ canonical: string; pattern: RegExp }> {
  const patterns: Array<{ canonical: string; pattern: RegExp }> = [];

  for (const city of activeCities) {
    const aliases = KNOWN_CITY_ALIASES[city] || [city.toLowerCase()];
    // Escape regex special chars and sort by longest phrase first
    const escaped = aliases
      .slice()
      .sort((a, b) => b.length - a.length)
      .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    patterns.push({
      canonical: city,
      pattern: new RegExp(`\\b(${escaped.join("|")})\\b`, "i"),
    });
  }

  return patterns;
}

// Patterns for non-city location prepositions to avoid matching phrases like "near a park" as a city
const NON_CITY_PHRASES = [
  /\b(?:near|in|at|around)\s+(?:a|the)?\s*(?:park|metro|station|airport|highway|mall|lake|beach|garden|school|hospital|centre|center|market)\b/gi,
];

// Canonical property types
const TYPE_DEFINITIONS: Array<{
  canonical: CanonicalPropertyType;
  pattern: RegExp;
}> = [
  {
    canonical: "VILLA",
    pattern: /\b(villas?|luxury villa|independent villa)\b/i,
  },
  {
    canonical: "APARTMENT",
    pattern: /\b(apartments?|flats?|penthouses?|condos?|condominiums?|studios?)\b/i,
  },
  {
    canonical: "HOUSE",
    pattern: /\b(houses?|bungalows?|independent house|row house|townhouse)\b/i,
  },
];

/**
 * Parses numeric price strings with Indian unit multipliers (cr/crore, l/lakh, k).
 */
export function parsePriceWithUnits(rawNum: string, unitStr?: string): number | null {
  const base = parseFloat(rawNum);
  if (isNaN(base) || base <= 0) return null;

  const unit = (unitStr || "").toLowerCase().trim();
  if (unit.startsWith("cr")) {
    return Math.round(base * 10000000);
  }
  if (unit.startsWith("l")) {
    return Math.round(base * 100000);
  }
  if (unit.startsWith("k")) {
    return Math.round(base * 1000);
  }
  return Math.round(base);
}

/**
 * Deterministically parses a search query string and merges with structured URL parameters.
 * City extraction is dynamically bound to the verified active property dataset.
 */
export function parsePropertyQuery(
  rawQuery: string,
  params?: URLSearchParams | null,
  activeCities: string[] = cachedActiveCities
): ParsedPropertyQuery {
  const query = rawQuery.trim();
  let cleanText = query;
  let hasConflict = false;
  let unrecognizedCityRequested: string | null = null;

  // Mask non-city phrases temporarily so "near a park" is not evaluated as a location attempt
  let maskedQuery = query;
  for (const ncp of NON_CITY_PHRASES) {
    maskedQuery = maskedQuery.replace(ncp, " ");
  }

  // 1. Extract explicit city constraint from active database cities
  let extractedCity: string | null = null;
  const matchedCities: string[] = [];
  const cityPatterns = buildCityPatterns(activeCities);

  for (const { canonical, pattern } of cityPatterns) {
    if (pattern.test(maskedQuery)) {
      matchedCities.push(canonical);
      // Strip city and preceding preposition (in / at / near / around) from semantic query
      cleanText = cleanText.replace(new RegExp(`\\b(?:in|at|around|near)\\s+${pattern.source}\\b`, "gi"), " ");
      cleanText = cleanText.replace(pattern, " ");
    }
  }

  if (matchedCities.length === 1) {
    extractedCity = matchedCities[0];
  } else if (matchedCities.length > 1) {
    hasConflict = true;
    extractedCity = matchedCities[0];
  }

  // Check known aliases for unseeded cities (e.g. Kolkata, Delhi) to catch explicit city intent
  if (!extractedCity) {
    for (const [canon, aliases] of Object.entries(KNOWN_CITY_ALIASES)) {
      const aliasPattern = new RegExp(`\\b(${aliases.join("|")})\\b`, "i");
      if (aliasPattern.test(maskedQuery)) {
        if (!activeCities.includes(canon)) {
          unrecognizedCityRequested = canon;
        } else {
          extractedCity = canon;
        }
        break;
      }
    }
  }

  // Detect explicit location preposition followed by capitalized proper noun not in database
  // e.g. "villas in London" or "apartments in Singapore"
  const locationPrepositionMatch = query.match(/\b(?:in|at|near|around)\s+([A-Z][a-z]+)\b/);
  if (locationPrepositionMatch && !extractedCity && !unrecognizedCityRequested) {
    const candidate = locationPrepositionMatch[1];
    const isDescriptiveWord = /^(?:a|the|park|metro|lake|beach|city|downtown|prime|quiet|peaceful|lush|spacious|modern)$/i.test(candidate);
    if (!isDescriptiveWord) {
      unrecognizedCityRequested = candidate;
    }
  }

  // 2. Extract explicit propertyType constraint
  let extractedType: CanonicalPropertyType | null = null;
  for (const { canonical, pattern } of TYPE_DEFINITIONS) {
    if (pattern.test(query)) {
      extractedType = canonical;
      cleanText = cleanText.replace(pattern, " ");
      break;
    }
  }

  // 3. Extract explicit bedroom count
  let extractedBedrooms: number | null = null;
  const bhkPattern = /\b([1-9]|10)\s*(?:bhk|bedrooms?|beds?)\b/i;
  const bhkMatch = query.match(bhkPattern);
  if (bhkMatch) {
    extractedBedrooms = parseInt(bhkMatch[1], 10);
    cleanText = cleanText.replace(bhkPattern, " ");
  }

  // 4. Extract explicit price ceilings and floors
  let extractedMaxPrice: number | null = null;
  let extractedMinPrice: number | null = null;

  // 4a. Between X and Y range
  const betweenPattern = /\bbetween\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(cr(?:ore)?s?|l(?:akh)?s?|k)?\s*(?:to|and|-)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(cr(?:ore)?s?|l(?:akh)?s?|k)?\b/i;
  const betweenMatch = query.match(betweenPattern);
  if (betweenMatch) {
    extractedMinPrice = parsePriceWithUnits(betweenMatch[1], betweenMatch[2]);
    extractedMaxPrice = parsePriceWithUnits(betweenMatch[3], betweenMatch[4]);
    cleanText = cleanText.replace(betweenPattern, " ");
  } else {
    // 4b. Max price (under / below / less than / up to / max X)
    const maxPricePattern = /\b(?:under|below|less than|up to|max(?:imum)?)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(cr(?:ore)?s?|l(?:akh)?s?|k)?\b/i;
    const maxPriceMatch = query.match(maxPricePattern);
    if (maxPriceMatch) {
      extractedMaxPrice = parsePriceWithUnits(maxPriceMatch[1], maxPriceMatch[2]);
      cleanText = cleanText.replace(maxPricePattern, " ");
    }

    // 4c. Min price (above / over / more than / at least / min X)
    const minPricePattern = /\b(?:above|over|more than|at least|min(?:imum)?)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(cr(?:ore)?s?|l(?:akh)?s?|k)?\b/i;
    const minPriceMatch = query.match(minPricePattern);
    if (minPriceMatch) {
      extractedMinPrice = parsePriceWithUnits(minPriceMatch[1], minPriceMatch[2]);
      cleanText = cleanText.replace(minPricePattern, " ");
    }
  }

  // 5. Combine and reconcile with user-selected structured URL parameters
  let effectiveCity = extractedCity;
  if (params && params.get("city")?.trim()) {
    const paramCity = params.get("city")!.trim();
    if (extractedCity && paramCity.toLowerCase() !== extractedCity.toLowerCase()) {
      hasConflict = true; // Query asks for City A, structured filter selects City B
    }
    effectiveCity = paramCity;
  }

  let effectiveType = extractedType;
  if (params && params.get("propertyType")?.trim()) {
    const paramType = params.get("propertyType")!.trim().toUpperCase();
    if (extractedType && paramType !== extractedType) {
      hasConflict = true; // Query asks for Type A, structured filter selects Type B
    }
    if (["APARTMENT", "HOUSE", "VILLA"].includes(paramType)) {
      effectiveType = paramType as CanonicalPropertyType;
    }
  }

  let effectiveBedrooms = extractedBedrooms;
  if (params && params.get("bedrooms")?.trim()) {
    const rawBed = parseInt(params.get("bedrooms")!.trim(), 10);
    if (!isNaN(rawBed) && rawBed > 0) {
      if (extractedBedrooms !== null && extractedBedrooms !== rawBed) {
        hasConflict = true;
      }
      effectiveBedrooms = rawBed;
    }
  }

  let effectiveMinPrice = extractedMinPrice;
  if (params && params.get("minPrice")?.trim()) {
    const rawMin = parseFloat(params.get("minPrice")!.trim());
    if (!isNaN(rawMin) && rawMin >= 0) {
      effectiveMinPrice = Math.max(rawMin, extractedMinPrice ?? 0);
    }
  }

  let effectiveMaxPrice = extractedMaxPrice;
  if (params && params.get("maxPrice")?.trim()) {
    const rawMax = parseFloat(params.get("maxPrice")!.trim());
    if (!isNaN(rawMax) && rawMax > 0) {
      effectiveMaxPrice = Math.min(rawMax, extractedMaxPrice ?? Infinity);
    }
  }

  if (
    effectiveMinPrice !== null &&
    effectiveMaxPrice !== null &&
    effectiveMinPrice > effectiveMaxPrice
  ) {
    hasConflict = true;
  }

  // Clean remaining whitespace and punctuation for semantic vector embedding
  const sanitizedClean = cleanText
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If all words were hard-filters, use the original query as fallback
  const finalSemanticQuery = sanitizedClean.length > 0 ? sanitizedClean : query;

  return {
    rawQuery: query,
    cleanSemanticQuery: finalSemanticQuery,
    city: effectiveCity,
    propertyType: effectiveType,
    bedrooms: effectiveBedrooms,
    minPrice: effectiveMinPrice,
    maxPrice: effectiveMaxPrice,
    hasConflict,
    unrecognizedCityRequested,
  };
}
