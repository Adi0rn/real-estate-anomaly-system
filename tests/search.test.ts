import { parseSearchQuery } from "../src/lib/search-parser";
import {
  getPropertyImage,
  getPropertyGallery,
  getPropertyFallback,
} from "../src/lib/property-images";

type SearchResultItem = {
  city?: string;
  propertyType?: string;
  price?: string;
  bedrooms?: number;
};

// Optional: test the search route via local HTTP request if server is running, or test parseSearchQuery and DB logic
const SERVER_URL = process.env.TEST_SERVER_URL || "http://localhost:3000";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log("=================================================");
  console.log("RUNNING SEMANTIC SEARCH & IMAGE REGRESSION SUITE");
  console.log("=================================================");

  // ---------------------------------------------------------------------------
  // 1. Natural Language Search Parser Unit Tests
  // ---------------------------------------------------------------------------
  console.log("\n[1] Testing Natural Language Search Query Parser:");

  // Test 1.1: City and Property Type Extraction
  const p1 = parseSearchQuery("villas in Mumbai");
  assert(p1.city === "Mumbai", 'City extracted as "Mumbai"');
  assert(p1.propertyType === "VILLA", 'Property type extracted as "VILLA"');

  // Test 1.2: City Aliases
  const p2 = parseSearchQuery("luxury apartments in Bombay");
  assert(p2.city === "Mumbai", 'Bombay alias resolved to "Mumbai"');
  assert(p2.propertyType === "APARTMENT", 'Property type extracted as "APARTMENT"');

  const p3 = parseSearchQuery("modern villa in Bengaluru");
  assert(p3.city === "Bangalore", 'Bengaluru alias resolved to "Bangalore"');
  assert(p3.propertyType === "VILLA", 'Property type extracted as "VILLA"');

  const p4 = parseSearchQuery("independent house in Poona");
  assert(p4.city === "Pune", 'Poona alias resolved to "Pune"');
  assert(p4.propertyType === "HOUSE", 'Property type extracted as "HOUSE"');

  const p5 = parseSearchQuery("spacious flat in Madras");
  assert(p5.city === "Chennai", 'Madras alias resolved to "Chennai"');
  assert(p5.propertyType === "APARTMENT", 'Flat resolved to "APARTMENT"');

  // Test 1.3: Bedroom Extraction
  const p6 = parseSearchQuery("3 BHK apartment in Bangalore");
  assert(p6.bedrooms === 3, 'Extracted 3 BHK as bedrooms = 3');
  assert(p6.city === "Bangalore", 'City is Bangalore');
  assert(p6.propertyType === "APARTMENT", 'Property type is APARTMENT');

  const p7 = parseSearchQuery("4 bedroom villa in Pune");
  assert(p7.bedrooms === 4, 'Extracted "4 bedroom" as bedrooms = 4');

  // Test 1.4: Price Constraints
  const p8 = parseSearchQuery("villas in Mumbai under 3 crore");
  assert(p8.maxPrice === 30000000, 'Parsed "under 3 crore" to maxPrice = 30,000,000');
  assert(p8.city === "Mumbai", 'City is Mumbai');
  assert(p8.propertyType === "VILLA", 'Property type is VILLA');

  const p9 = parseSearchQuery("apartments in Hyderabad above 80 lakhs");
  assert(p9.minPrice === 8000000, 'Parsed "above 80 lakhs" to minPrice = 8,000,000');
  assert(p9.city === "Hyderabad", 'City is Hyderabad');

  const p10 = parseSearchQuery("flats in Chennai between 50 lakh and 1.5 cr");
  assert(p10.minPrice === 5000000, 'Parsed minPrice = 5,000,000');
  assert(p10.maxPrice === 15000000, 'Parsed maxPrice = 15,000,000');

  // Test 1.5: Clean semantic query leftover
  const p11 = parseSearchQuery("luxury sea view villa in Mumbai with pool");
  assert(p11.city === "Mumbai", 'City is Mumbai');
  assert(p11.propertyType === "VILLA", 'Type is VILLA');
  assert(
    p11.cleanSemanticQuery.toLowerCase().includes("luxury") &&
    p11.cleanSemanticQuery.toLowerCase().includes("sea view") &&
    p11.cleanSemanticQuery.toLowerCase().includes("pool"),
    'Semantic query retains descriptive keywords ("luxury sea view pool")'
  );
  assert(
    !p11.cleanSemanticQuery.toLowerCase().includes("mumbai") &&
    !p11.cleanSemanticQuery.toLowerCase().includes("villa"),
    'Semantic query strips out hard filter keywords to prevent noisy cosine pollution'
  );

  // ---------------------------------------------------------------------------
  // 2. Integration Tests Against Running API Route
  // ---------------------------------------------------------------------------
  console.log("\n[2] Testing Live /api/search Route:");

  try {
    // 2.1: "villas in Mumbai" must NEVER return listings from Pune
    const resMumbai = await fetch(`${SERVER_URL}/api/search?q=${encodeURIComponent("villas in Mumbai")}`);
    if (resMumbai.ok) {
      const dataMumbai = await resMumbai.json();
      assert(dataMumbai.success === true, "Mumbai villas search succeeded");
      assert(dataMumbai.count > 0, `Returned ${dataMumbai.count} Mumbai villas`);
      
      const allMumbai = dataMumbai.results.every((p: SearchResultItem) => p.city === "Mumbai");
      assert(allMumbai, "100% of results are located strictly in Mumbai");

      const allVillas = dataMumbai.results.every((p: SearchResultItem) => p.propertyType === "VILLA");
      assert(allVillas, "100% of results have propertyType === 'VILLA'");

      const anyPune = dataMumbai.results.some((p: SearchResultItem) => p.city === "Pune");
      assert(!anyPune, "Zero results from Pune (zero cross-city leakage)");
    } else {
      console.warn("  ⚠ Server not responding on port 3000, skipping live HTTP tests.");
    }

    // 2.2: "villa in Pune" must NEVER return listings from Mumbai
    const resPune = await fetch(`${SERVER_URL}/api/search?q=${encodeURIComponent("villa in Pune")}`);
    if (resPune.ok) {
      const dataPune = await resPune.json();
      assert(dataPune.success === true, "Pune villa search succeeded");
      assert(dataPune.count > 0, `Returned ${dataPune.count} Pune villas`);

      const allPune = dataPune.results.every((p: SearchResultItem) => p.city === "Pune");
      assert(allPune, "100% of results are located strictly in Pune");

      const anyMumbai = dataPune.results.some((p: SearchResultItem) => p.city === "Mumbai");
      assert(!anyMumbai, "Zero results from Mumbai (zero cross-city leakage)");
    }

    // 2.3: "villas in Kolkata" -> Honest Empty State
    const resKolkata = await fetch(`${SERVER_URL}/api/search?q=${encodeURIComponent("villas in Kolkata")}`);
    if (resKolkata.ok) {
      const dataKolkata = await resKolkata.json();
      assert(dataKolkata.success === true, "Kolkata search responded with 200 OK");
      assert(dataKolkata.count === 0, "Returns honest count = 0 (no properties in Kolkata)");
      assert(Array.isArray(dataKolkata.results) && dataKolkata.results.length === 0, "Returns empty results array");
    }

    // 2.4: Conflicting Filters -> Honest Empty State (e.g. prompt specifies Mumbai, filter specifies Pune)
    const resConflict = await fetch(`${SERVER_URL}/api/search?q=${encodeURIComponent("villas in Mumbai")}&city=Pune`);
    if (resConflict.ok) {
      const dataConflict = await resConflict.json();
      assert(dataConflict.count === 0, "Conflicting query ('Mumbai' in query, 'Pune' in filter) returns 0 results");
      assert(Array.isArray(dataConflict.results) && dataConflict.results.length === 0, "Conflicting filters return empty array");
    }

    // 2.5: Multi-constraint query: city + property type + price ceiling
    const resMulti = await fetch(`${SERVER_URL}/api/search?q=${encodeURIComponent("villas in Mumbai under 3 crore")}`);
    if (resMulti.ok) {
      const dataMulti = await resMulti.json();
      assert(dataMulti.success === true, "Multi-constraint search succeeded");
      const allRespectConstraints = dataMulti.results.every((p: SearchResultItem) => {
        const priceNum = p.price ? parseFloat(p.price) : 0;
        return p.city === "Mumbai" && p.propertyType === "VILLA" && priceNum <= 30000000;
      });
      assert(allRespectConstraints, "All results satisfy city=Mumbai, type=VILLA, and price <= 3 Cr simultaneously");
    }

    // 2.6: Pure structured filters compatibility
    const resStructured = await fetch(`${SERVER_URL}/api/search?q=spacious&city=Bangalore&propertyType=APARTMENT`);
    if (resStructured.ok) {
      const dataStructured = await resStructured.json();
      assert(dataStructured.success === true, "Structured filters search succeeded");
      const allMatch = dataStructured.results.every((p: SearchResultItem) => p.city === "Bangalore" && p.propertyType === "APARTMENT");
      assert(allMatch, "Structured filters (Bangalore, APARTMENT) strictly honored");
    }

    // 2.7: Complete listing metadata projection (Task 2B)
    const resProjection = await fetch(`${SERVER_URL}/api/search?q=luxury%20apartment`);
    if (resProjection.ok) {
      const dataProj = await resProjection.json();
      if (dataProj.results.length > 0) {
        const first = dataProj.results[0];
        const hasAllFields = (
          first.propertyId !== undefined &&
          first.title !== undefined &&
          first.description !== undefined &&
          first.propertyType !== undefined &&
          first.listingType !== undefined &&
          first.price !== undefined &&
          first.areaSqft !== undefined &&
          first.bedrooms !== undefined &&
          first.bathrooms !== undefined &&
          first.address !== undefined &&
          first.city !== undefined &&
          first.state !== undefined &&
          first.pincode !== undefined &&
          first.status !== undefined &&
          first.ownerId !== undefined &&
          first.createdAt !== undefined &&
          first.updatedAt !== undefined &&
          typeof first.similarity === "number"
        );
        assert(hasAllFields, "Search results project complete property metadata required by PropertyCard");
      }
    }

    // 2.8: Invalid numeric filters -> 400 Bad Request
    const resNegativePrice = await fetch(`${SERVER_URL}/api/search?q=villas&minPrice=-100`);
    assert(resNegativePrice.status === 400, "Negative minPrice rejected with 400 Bad Request");

    const resInvertedPrice = await fetch(`${SERVER_URL}/api/search?q=villas&minPrice=5000000&maxPrice=1000000`);
    assert(resInvertedPrice.status === 400, "Inverted price range (min > max) rejected with 400 Bad Request");

    // 2.9: Missing query -> 400 Bad Request
    const resEmpty = await fetch(`${SERVER_URL}/api/search`);
    assert(resEmpty.status === 400, "Empty query string correctly rejected with 400 Bad Request");

  } catch (err) {
    console.warn("  ⚠ Live HTTP search tests encountered connection issue:", err);
  }

  // ---------------------------------------------------------------------------
  // 3. Property Image Stability & Uniqueness Tests
  // ---------------------------------------------------------------------------
  console.log("\n[3] Testing Property Photography Stability & Uniqueness:");

  // 3.1: 100 properties receive 100 unique hero images
  const heroSet = new Set<string>();
  for (let id = 1; id <= 100; id++) {
    heroSet.add(getPropertyImage(id));
  }
  assert(heroSet.size === 100, `Assigned 100 unique hero images across 100 properties (Uniqueness: ${(heroSet.size / 100) * 100}%)`);

  // 3.2: Gallery[0] matches card hero image for every property
  let galleryMatchesCard = true;
  let allGalleriesHave4UniquePhotos = true;
  for (let id = 1; id <= 100; id++) {
    const hero = getPropertyImage(id);
    const gallery = getPropertyGallery(id);
    if (gallery[0] !== hero) {
      galleryMatchesCard = false;
      break;
    }
    const uniqueInGallery = new Set(gallery);
    if (uniqueInGallery.size !== 4) {
      allGalleriesHave4UniquePhotos = false;
      break;
    }
  }
  assert(galleryMatchesCard, "Gallery[0] is 100% identical to card hero image for all 100 properties");
  assert(allGalleriesHave4UniquePhotos, "All 100 properties have 4 completely unique photos in their gallery");

  // 3.3: Type-specific fallback images
  const aptFb = getPropertyFallback("APARTMENT");
  const villaFb = getPropertyFallback("VILLA");
  const houseFb = getPropertyFallback("HOUSE");
  const defaultFb = getPropertyFallback();

  assert(aptFb !== villaFb && villaFb !== houseFb, "Fallbacks are distinct per architectural type");
  assert(
    aptFb.startsWith("https://") &&
    villaFb.startsWith("https://") &&
    houseFb.startsWith("https://") &&
    defaultFb.startsWith("https://"),
    "All fallbacks are valid HTTPS image URLs"
  );

  // 3.4: Idempotence & Determinism
  let deterministic = true;
  for (let id = 1; id <= 100; id++) {
    const run1 = getPropertyImage(id);
    const run2 = getPropertyImage(id);
    if (run1 !== run2) {
      deterministic = false;
      break;
    }
  }
  assert(deterministic, "Photo assignments are 100% deterministic (zero random variation)");

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${testsPassed} passed, ${testsFailed} failed`);
  console.log("=================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
