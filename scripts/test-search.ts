import "dotenv/config";
import { parseSearchQuery } from "../src/lib/search-parser";

async function run() {
  console.log("=== TESTING SEARCH QUERY PARSER ===");
  
  const cases = [
    { q: "villas in Mumbai", expected: { city: "Mumbai", type: "VILLA" } },
    { q: "villa in Pune", expected: { city: "Pune", type: "VILLA" } },
    { q: "luxury 3 BHK apartment in Bangalore", expected: { city: "Bangalore", type: "APARTMENT", beds: 3 } },
    { q: "independent house in Hyderabad", expected: { city: "Hyderabad", type: "HOUSE" } },
    { q: "villas in Mumbai under 3 crore", expected: { city: "Mumbai", type: "VILLA", maxPrice: 30000000 } },
    { q: "peaceful home near parks", expected: { city: null } },
    { q: "villas in Kolkata", expected: { city: "Kolkata", type: "VILLA" } },
  ];

  for (const c of cases) {
    const res = parseSearchQuery(c.q);
    console.log(`Query: "${c.q}" =>`, {
      city: res.city,
      propertyType: res.propertyType,
      bedrooms: res.bedrooms,
      maxPrice: res.maxPrice,
      minPrice: res.minPrice,
      hasConflict: res.hasConflict,
    });
  }

  // Test conflicting param
  const conflictParams = new URLSearchParams({ city: "Pune" });
  const conflictRes = parseSearchQuery("villas in Mumbai", conflictParams);
  console.log('Conflicting query ("villas in Mumbai" with param city=Pune) => hasConflict:', conflictRes.hasConflict);

  // Test live API search
  console.log("\n=== TESTING LIVE API SEARCH ===");
  const testUrls = [
    "http://localhost:3000/api/search?q=villas+in+Mumbai",
    "http://localhost:3000/api/search?q=villa+in+Pune",
    "http://localhost:3000/api/search?q=villas+in+Kolkata",
    "http://localhost:3000/api/search?q=villas+in+Mumbai&city=Pune",
  ];

  for (const url of testUrls) {
    const r = await fetch(url);
    const data = await r.json();
    console.log(`\nURL: ${url}`);
    console.log(`  Success: ${data.success}, Count: ${data.count}`);
    if (data.results && data.results.length > 0) {
      const cities = Array.from(new Set(data.results.map((x: { city?: string }) => x.city)));
      const types = Array.from(new Set(data.results.map((x: { propertyType?: string }) => x.propertyType)));
      console.log(`  Cities in results:`, cities);
      console.log(`  PropertyTypes in results:`, types);
      console.log(`  First result:`, {
        id: data.results[0].propertyId,
        title: data.results[0].title,
        city: data.results[0].city,
        type: data.results[0].propertyType,
        similarity: data.results[0].similarity.toFixed(4),
      });
    }
  }
}

run().catch(console.error);
