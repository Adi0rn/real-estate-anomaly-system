import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOTS_DIR = path.join(process.cwd(), "public", "screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log("Launching Chrome...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();

  // 1. Contact Sheet
  console.log("Loading contact sheet...");
  await page.goto("http://localhost:3000/image-contact-sheet.html", { waitUntil: "networkidle2" });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "contact-sheet-top.png"), fullPage: false });
  console.log("Saved contact-sheet-top.png");

  // Check IDs 59, 89, 29 specifically
  for (const id of [29, 59, 89]) {
    const el = await page.$(`#prop-${id}`);
    if (el) {
      await el.screenshot({ path: path.join(SCREENSHOTS_DIR, `contact-prop-${id}.png`) });
      console.log(`Saved contact-prop-${id}.png`);
    }
  }

  // 2. Open Homepage and Search "villas in Mumbai"
  console.log("Loading home page...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });

  // Toggle to Semantic mode or type in search box
  const searchInput = await page.$('input[type="text"]');
  if (searchInput) {
    await searchInput.click();
    await searchInput.type("villas in Mumbai");
    
    // Check if semantic mode is active or click Semantic AI button
    const buttons = await page.$$("button");
    for (const b of buttons) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes("Semantic AI")) {
        await b.click();
        break;
      }
    }

    // Submit form or press Enter
    await page.keyboard.press("Enter");
    console.log("Submitted search for 'villas in Mumbai'...");

    // Wait for results
    await page.waitForNetworkIdle({ timeout: 10000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "search-results-villas-mumbai.png") });
    console.log("Saved search-results-villas-mumbai.png");

    // Extract rendered card data
    const cardData = await page.evaluate(() => {
      const cards = document.querySelectorAll("article");
      return Array.from(cards).map((c) => {
        const title = c.querySelector("h3")?.textContent?.trim() || "";
        const price = c.querySelector("span.text-xl")?.textContent?.trim() || "";
        const idText = c.querySelector("span.font-mono")?.textContent?.trim() || "";
        const img = c.querySelector("img")?.src || "";
        const specs = Array.from(c.querySelectorAll(".grid > div")).map((s) => s.textContent?.trim());
        return { idText, title, price, specs, img };
      });
    });

    console.log("\nRendered Cards on Search Page:");
    console.log(JSON.stringify(cardData, null, 2));
  }

  await browser.close();
}

run().catch(console.error);
