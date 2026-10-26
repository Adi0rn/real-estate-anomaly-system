import puppeteer from "puppeteer-core";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT_DIR = path.join(process.cwd(), "public", "screenshots");

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1400, height: 1000 },
  });

  const page = await browser.newPage();
  await page.goto("http://localhost:3000/image-audit.html", { waitUntil: "networkidle2" });

  const sections = ["apartments", "villas", "houses", "living", "kitchen", "bedroom"];
  for (const s of sections) {
    const el = await page.$(`#section-${s}`);
    if (el) {
      const outPath = path.join(OUT_DIR, `audit-section-${s}.png`);
      await el.screenshot({ path: outPath });
      console.log(`Saved audit-section-${s}.png`);
    }
  }

  await browser.close();
}

run().catch(console.error);
