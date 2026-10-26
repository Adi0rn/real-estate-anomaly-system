/* eslint-disable */
const puppeteer = require("puppeteer-core");
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: "new" });
  const page = await browser.newPage();
  
  // Login as admin
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
  await page.type('input[type="email"]', "admin@propaudit.internal");
  await page.type('input[type="password"]', "AdminSecure2026!");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1000));

  console.log("Logged in! Current URL:", page.url());

  const viewports = [
    { w: 320, h: 640 },
    { w: 375, h: 667 },
    { w: 768, h: 1024 },
    { w: 1280, h: 800 }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.w, height: vp.h });
    await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 600));

    const info = await page.evaluate(() => {
      const scrollW = document.documentElement.scrollWidth;
      const innerW = window.innerWidth;
      const table = document.querySelector("table");
      const tableContainer = table ? table.parentElement : null;
      const tableW = table ? table.offsetWidth : 0;
      const containerW = tableContainer ? tableContainer.offsetWidth : 0;
      
      const bad = [];
      document.querySelectorAll("*").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right > innerW + 1) {
          bad.push({ tag: el.tagName, class: (el.className || "").toString().slice(0, 50), right: Math.round(rect.right), width: Math.round(rect.width) });
        }
      });
      return { scrollW, innerW, tableW, containerW, bad: bad.slice(0, 5) };
    });

    console.log(`/admin at ${vp.w}px => scrollWidth: ${info.scrollW}, tableWidth: ${info.tableW}, containerWidth: ${info.containerW} ${info.scrollW > info.innerW ? "[PAGE OVERFLOW!]" : "[OK]"}`);
    if (info.bad.length) console.log("  Overflowing elements:", info.bad);
  }

  await browser.close();
})();
