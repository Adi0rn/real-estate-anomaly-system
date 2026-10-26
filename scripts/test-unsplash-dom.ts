import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();
  await page.goto("https://unsplash.com/s/photos/modern-villa", { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 3000));

  const data = await page.evaluate(() => {
    const allImgs = Array.from(document.querySelectorAll("img"));
    const srcList = allImgs.map((i) => i.src).filter((s) => s.includes("images.unsplash.com/photo-"));
    return {
      title: document.title,
      totalImgs: allImgs.length,
      unsplashPhotos: srcList.slice(0, 10),
    };
  });

  console.log("Result:", data);
  await browser.close();
}

main().catch(console.error);
