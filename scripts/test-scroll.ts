import puppeteer from "puppeteer-core";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOTS_DIR = path.join(process.cwd(), "public", "screenshots");

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();
  await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });

  const searchInput = await page.$('input[type="text"]');
  if (searchInput) {
    await searchInput.type("villas in Mumbai");
    
    const buttons = await page.$$("button");
    for (const b of buttons) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes("Semantic AI")) {
        await b.click();
        break;
      }
    }

    await page.keyboard.press("Enter");
    await page.waitForNetworkIdle({ timeout: 10000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    // Scroll down to cards 4, 5, 6
    await page.evaluate(() => {
      window.scrollBy(0, 700);
    });
    await new Promise((r) => setTimeout(r, 1000));

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "search-results-scrolled.png") });
    console.log("Saved search-results-scrolled.png");
  }

  await browser.close();
}

run().catch(console.error);
