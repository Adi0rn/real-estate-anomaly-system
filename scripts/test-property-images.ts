import {
  getPropertyImage,
  getPropertyGallery,
  getPropertyFallback,
} from "../src/lib/property-images";

async function testImages() {
  console.log("=== TESTING PROPERTY IMAGE CONSISTENCY & STABILITY ===");

  // 1. Check uniqueness across all 100 seeded property IDs
  const allHeroImages = new Map<number, string>();
  for (let id = 1; id <= 100; id++) {
    const hero = getPropertyImage(id);
    allHeroImages.set(id, hero);
  }

  const uniqueHeroes = new Set(allHeroImages.values());
  console.log(`Total properties tested: 100`);
  console.log(`Unique hero images assigned: ${uniqueHeroes.size}`);
  console.log(`Uniqueness ratio: ${(uniqueHeroes.size / 100) * 100}%`);

  // Verify that different property IDs get distinct primary images
  // (e.g. check properties 1, 4, 7, 10 which are apartments)
  const apt1 = getPropertyImage(1, "APARTMENT");
  const apt4 = getPropertyImage(4, "APARTMENT");
  const apt7 = getPropertyImage(7, "APARTMENT");
  const apt10 = getPropertyImage(10, "APARTMENT");
  console.log("Apartment primary images distinct:", apt1 !== apt4 && apt4 !== apt7 && apt7 !== apt10);

  // 2. Consistency: Same property card, detail page, modal, and gallery
  let consistencyPassed = true;
  for (let id = 1; id <= 100; id++) {
    const cardImage = getPropertyImage(id);
    const detailImage = getPropertyImage(id);
    const gallery = getPropertyGallery(id);

    // Gallery[0] must strictly match cardImage
    if (gallery[0] !== cardImage || detailImage !== cardImage) {
      console.error(`Inconsistency found for property #${id}: gallery[0]=${gallery[0]}, card=${cardImage}`);
      consistencyPassed = false;
      break;
    }

    // Gallery must have 4 distinct images
    const uniqueGalleryPhotos = new Set(gallery);
    if (uniqueGalleryPhotos.size < 4) {
      console.error(`Gallery for property #${id} has duplicate photos:`, gallery);
      consistencyPassed = false;
      break;
    }
  }
  console.log("Consistency test across card, detail, and gallery[0]:", consistencyPassed ? "PASSED" : "FAILED");

  // 3. Fallback images for each property type
  const aptFallback = getPropertyFallback("APARTMENT");
  const villaFallback = getPropertyFallback("VILLA");
  const houseFallback = getPropertyFallback("HOUSE");
  const defaultFallback = getPropertyFallback();
  console.log("Type-specific fallbacks defined and valid:", {
    apartment: Boolean(aptFallback && aptFallback.startsWith("http")),
    villa: Boolean(villaFallback && villaFallback.startsWith("http")),
    house: Boolean(houseFallback && houseFallback.startsWith("http")),
    default: Boolean(defaultFallback && defaultFallback.startsWith("http")),
  });

  // 4. Stability under multiple invocations (refresh simulation)
  let stabilityPassed = true;
  for (let i = 0; i < 50; i++) {
    const id = (i % 100) + 1;
    const img1 = getPropertyImage(id);
    const img2 = getPropertyImage(id);
    if (img1 !== img2) {
      stabilityPassed = false;
      break;
    }
  }
  console.log("Stability across repeated renders (zero random generation):", stabilityPassed ? "PASSED" : "FAILED");
}

testImages().catch(console.error);
