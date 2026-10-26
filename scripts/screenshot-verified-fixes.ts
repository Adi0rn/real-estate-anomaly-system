import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUTPUT_DIR = path.join(process.cwd(), "public", "screenshots");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  console.log("1. Capturing Contact Sheet for Properties 29, 59, 89...");
  await page.goto("http://localhost:3000/image-contact-sheet.html", { waitUntil: "networkidle2" });
  await page.evaluate(() => {
    const el = document.getElementById("prop-29");
    if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "contact-sheet-prop-29.png") });

  await page.evaluate(() => {
    const el = document.getElementById("prop-59");
    if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "contact-sheet-prop-59.png") });

  await page.evaluate(() => {
    const el = document.getElementById("prop-89");
    if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "contact-sheet-prop-89.png") });

  console.log("2. Capturing Semantic Search 'villas in Mumbai' on Marketplace...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });
  
  const searchInput = await page.$('input[type="text"]');
  if (searchInput) {
    await searchInput.type("villas in Mumbai");
    
    // Click Semantic AI button
    const buttons = await page.$$("button");
    for (const b of buttons) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes("Semantic AI")) {
        await b.click();
        break;
      }
    }

    console.log("Waiting for search results...");
    await new Promise((r) => setTimeout(r, 3500));

    // Scroll to see first cards
    await page.evaluate(() => {
      window.scrollBy(0, 480);
    });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, "verified-villas-mumbai-top.png") });

    // Scroll to see bottom cards (including 29, 89, 59)
    await page.evaluate(() => {
      window.scrollBy(0, 520);
    });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, "verified-villas-mumbai-bottom.png") });
  }

  console.log("3. Capturing Semantic Search 'villa in Pune'...");
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  const searchInput2 = await page.$('input[type="text"]');
  if (searchInput2) {
    await searchInput2.click();
    await page.keyboard.down("Control");
    await page.keyboard.press("A");
    await page.keyboard.up("Control");
    await page.keyboard.press("Backspace");
    await searchInput2.type("villa in Pune");

    const buttons = await page.$$("button");
    for (const b of buttons) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes("Semantic AI")) {
        await b.click();
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 3500));
    await page.evaluate(() => {
      window.scrollBy(0, 480);
    });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, "verified-villa-pune.png") });
  }

  console.log("4. Testing Property Detail Page for Property 29...");
  await page.goto("http://localhost:3000/properties/29", { waitUntil: "networkidle2" });
  await page.screenshot({ path: path.join(OUTPUT_DIR, "property-29-detail.png") });

  console.log("5. Testing Dark Theme on Property Detail Page...");
  const themeToggle = await page.$('button[aria-label*="theme" i], button[aria-label*="Theme" i], button[title*="theme" i]');
  if (themeToggle) {
    await themeToggle.click();
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(OUTPUT_DIR, "property-29-detail-dark.png") });
  }

  await browser.close();
  console.log("All screenshots successfully captured in public/screenshots/!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
