import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function scrapeCategory(query: string, count: number) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();
  const url = `https://unsplash.com/s/photos/${encodeURIComponent(query)}`;
  console.log(`Navigating to ${url}...`);

  await page.goto(url, { waitUntil: "networkidle2" });

  // Scroll to load photos
  for (let s = 0; s < 4; s++) {
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise((r) => setTimeout(r, 1000));
  }

  const photos = await page.evaluate(() => {
    const imgs = document.querySelectorAll('figure img[srcset], figure img[src*="images.unsplash.com/photo-"]');
    const items: Array<{ id: string; url: string; alt: string }> = [];
    const seen = new Set<string>();

    for (const img of Array.from(imgs)) {
      const src = img.getAttribute("src") || "";
      const alt = img.getAttribute("alt") || "";
      const match = src.match(/photo-([a-zA-Z0-9_-]+)/);
      if (match && !seen.has(match[1])) {
        seen.add(match[1]);
        const cleanUrl = `https://images.unsplash.com/photo-${match[1]}?auto=format&fit=crop&w=1200&q=80`;
        items.push({ id: match[1], url: cleanUrl, alt });
      }
    }
    return items;
  });

  await browser.close();
  console.log(`Found ${photos.length} photos for "${query}"`);
  return photos.slice(0, count);
}

async function main() {
  const sample = await scrapeCategory("modern-villa", 5);
  console.log(JSON.stringify(sample, null, 2));
}

main().catch(console.error);
