import puppeteer from "puppeteer-core";
import { getPropertyImage, getPropertyGallery, REGIONAL_PROPERTY_MANIFEST } from "../src/lib/property-images";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";

const FLAGGED_TEST_IDS = [58, 88, 87, 86, 97, 96, 95];

async function main() {
  console.log("=================================================================");
  console.log("   LIVE BROWSER RENDERING VERIFICATION: HOMEPAGE & DETAIL PAGES  ");
  console.log("=================================================================\n");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1440, height: 950 },
  });

  try {
    const page = await browser.newPage();
    let allGalleriesMatch = true;

    // 1. Check Homepage
    console.log("[1] Navigating to Homepage: " + BASE_URL);
    await page.goto(BASE_URL, { waitUntil: "networkidle2" });

    // Wait for property cards to render
    await page.waitForSelector("article, [data-testid='property-card'], a[href*='/properties/']", { timeout: 10000 });

    // Extract rendered images on homepage
    const renderedCardImages = await page.evaluate(() => {
      const cards = document.querySelectorAll("article, a[href*='/properties/']");
      const results: Array<{ href: string | null; imgSrc: string | null }> = [];
      cards.forEach((card) => {
        const link = card.tagName.toLowerCase() === "a" ? (card as HTMLAnchorElement).href : card.querySelector("a")?.href || null;
        const img = card.querySelector("img");
        if (link && img) {
          results.push({ href: link, imgSrc: img.src });
        }
      });
      return results;
    });

    console.log(`  ✓ Found ${renderedCardImages.length} property cards rendered in the DOM.`);
    if (renderedCardImages.length > 0) {
      console.log(`  Sample rendered card img src: ${renderedCardImages[0].imgSrc?.slice(0, 80)}...`);
    }

    // Check rendered prices on homepage cards
    const cardPriceAudit = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll("article"));
      const issues: string[] = [];
      let rentCount = 0;
      let saleCount = 0;

      articles.forEach((art) => {
        const text = art.innerText || "";
        const isRent = text.includes("RENT");
        const isSale = text.includes("SALE");

        if (isRent) {
          rentCount++;
          if (text.includes("Cr / month") || text.includes("Cr/month") || text.includes("L / month") || text.includes("L/month")) {
            issues.push(`RENT card displays capital valuation: ${text.slice(0, 100).replace(/\n/g, " ")}`);
          }
        }
        if (isSale) {
          saleCount++;
          if (text.includes("/ month") || text.includes("/month")) {
            issues.push(`SALE card displays '/ month': ${text.slice(0, 100).replace(/\n/g, " ")}`);
          }
        }
      });

      return { rentCount, saleCount, issues };
    });

    console.log(`  ✓ Homepage Price Audit: ${cardPriceAudit.rentCount} RENT cards, ${cardPriceAudit.saleCount} SALE cards.`);
    if (cardPriceAudit.issues.length > 0) {
      console.error(`  ✗ FAIL: Found ${cardPriceAudit.issues.length} price formatting defects on homepage:`);
      cardPriceAudit.issues.slice(0, 5).forEach((iss) => console.error("    " + iss));
      allGalleriesMatch = false;
    } else {
      console.log(`  ✓ Zero homepage cards display capital purchase valuations with '/ month'!`);
    }

    // 2. Check Detail Pages for the 7 Flagged IDs + Additional Samples
    console.log("\n[2] Checking Property Detail Galleries for Remediated Properties:");

    for (const id of FLAGGED_TEST_IDS) {
      const detailUrl = `${BASE_URL}/properties/${id}`;
      await page.goto(detailUrl, { waitUntil: "networkidle2" });

      // Wait for image to load
      await page.waitForSelector("img", { timeout: 10000 });

      // Extract all rendered images on property detail page
      const detailImages = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll("img"));
        return imgs.map((i) => i.src);
      });

      const expectedHero = getPropertyImage(id);
      const expectedGallery = getPropertyGallery(id);
      const expectedManifest = REGIONAL_PROPERTY_MANIFEST[id];

      // Check if the expected hero URL or photo ID is in rendered images
      // Next.js Image component might encode URL like /_next/image?url=...
      const heroPhotoId = expectedHero.match(/photo-[a-zA-Z0-9-]+/)?.[0] || "";
      const matchesHero = detailImages.some((src) => src.includes(encodeURIComponent(expectedHero)) || src.includes(heroPhotoId) || src.includes(expectedHero));

      const galleryMatchCount = expectedGallery.filter((expectedUrl) => {
        const pid = expectedUrl.match(/photo-[a-zA-Z0-9-]+/)?.[0] || "";
        return detailImages.some((src) => src.includes(encodeURIComponent(expectedUrl)) || src.includes(pid) || src.includes(expectedUrl));
      }).length;

      const detailPricing = await page.evaluate(() => {
        const header = document.querySelector("h1")?.closest("div")?.parentElement;
        const text = header ? header.innerText.replace(/\n/g, " ") : "";
        return {
          headerText: text,
          hasCrMonth: text.includes("Cr / month") || text.includes("Cr/month"),
          hasLakhMonth: text.includes("L / month") || text.includes("L/month"),
        };
      });

      if (detailPricing.hasCrMonth || detailPricing.hasLakhMonth) {
        console.error(`  ✗ FAIL: ID ${id} detail page displays capital valuation under rent: "${detailPricing.headerText}"`);
        allGalleriesMatch = false;
      }

      if (!matchesHero) {
        console.error(`  ✗ FAIL: ID ${id} did not render expected hero photo ID ${heroPhotoId}`);
        allGalleriesMatch = false;
      } else {
        console.log(`  ✓ ID ${id} (${expectedManifest.city} ${expectedManifest.propertyType}): Renders clean hero [${heroPhotoId}]. Gallery matches: ${galleryMatchCount}/4`);
      }
    }

    // 3. Check additional sample properties (IDs 1, 10, 25, 50, 75, 100)
    console.log("\n[3] Checking Additional Sample Property Detail Pages:");
    for (const id of [1, 10, 25, 50, 75, 100]) {
      const detailUrl = `${BASE_URL}/properties/${id}`;
      await page.goto(detailUrl, { waitUntil: "networkidle2" });
      await page.waitForSelector("img", { timeout: 10000 });

      const detailImages = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("img")).map((i) => i.src);
      });

      const expectedHero = getPropertyImage(id);
      const heroPhotoId = expectedHero.match(/photo-[a-zA-Z0-9-]+/)?.[0] || "";
      const matchesHero = detailImages.some((src) => src.includes(encodeURIComponent(expectedHero)) || src.includes(heroPhotoId) || src.includes(expectedHero));

      const detailPricing = await page.evaluate(() => {
        const header = document.querySelector("h1")?.closest("div")?.parentElement;
        const text = header ? header.innerText.replace(/\n/g, " ") : "";
        return {
          headerText: text,
          hasCrMonth: text.includes("Cr / month") || text.includes("Cr/month"),
          hasLakhMonth: text.includes("L / month") || text.includes("L/month"),
        };
      });

      if (detailPricing.hasCrMonth || detailPricing.hasLakhMonth) {
        console.error(`  ✗ FAIL: ID ${id} detail page displays capital valuation under rent: "${detailPricing.headerText}"`);
        allGalleriesMatch = false;
      }

      if (!matchesHero) {
        console.error(`  ✗ FAIL: ID ${id} did not render expected hero photo ID ${heroPhotoId}`);
        allGalleriesMatch = false;
      } else {
        console.log(`  ✓ ID ${id} detail page verified: Renders hero [${heroPhotoId}]`);
      }
    }

    console.log("\n=================================================================");
    if (allGalleriesMatch) {
      console.log("✓ LIVE BROWSER RENDERING VERIFICATION SUCCEEDED 100%");
    } else {
      console.error("✗ LIVE BROWSER RENDERING HAD MISMATCHES");
      process.exit(1);
    }
    console.log("=================================================================");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
