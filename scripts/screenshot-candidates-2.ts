import puppeteer from "puppeteer-core";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1400, height: 1200 },
  });

  const page = await browser.newPage();
  await page.goto("http://localhost:3000/candidates.html", { waitUntil: "networkidle2" });
  await page.evaluate(() => window.scrollBy(0, 900));
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(process.cwd(), "public", "screenshots", "candidates-overview-2.png") });
  await browser.close();
  console.log("Saved candidates-overview-2.png");
}

run().catch(console.error);
