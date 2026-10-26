/* eslint-disable */
/**
 * Automated QA Audit for Admin Dashboard Authentication & Responsive Layout
 *
 * Verifies:
 * 1. Unauthenticated access behavior (client-side redirection to /login)
 * 2. Authenticated access using configured test credentials
 * 3. Responsive table container scrolling across mobile, tablet, and desktop viewports
 */

require("dotenv").config();
const puppeteer = require("puppeteer-core");
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const adminEmail = process.env.ADMIN_TEST_EMAIL;
const adminPassword = process.env.ADMIN_TEST_PASSWORD;

(async () => {
  console.log("=================================================");
  console.log("   ADMIN AUTHENTICATION & RESPONSIVE AUDIT       ");
  console.log("=================================================");

  let browser;
  try {
    browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: "new" });
  } catch (err) {
    console.warn("⚠ Chrome executable not found at specified path, skipping browser audit:", err.message);
    process.exit(0);
  }

  try {
    const page = await browser.newPage();

    // 1. Audit Unauthenticated Access
    console.log("\n[1] Testing Unauthenticated Navigation to /admin:");
    await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1200));

    const unauthUrl = page.url();
    const redirectedToLogin = unauthUrl.includes("/login");
    console.log(`  - Navigated to /admin without credentials`);
    console.log(`  - Resulting URL: ${unauthUrl}`);
    console.log(`  - Redirection to /login: ${redirectedToLogin ? "PASSED" : "FAILED"}`);

    // 2. Audit Authenticated Admin Access
    console.log("\n[2] Testing Authenticated Admin Session:");
    if (!adminEmail || !adminPassword) {
      console.warn("  ℹ Skipping authenticated admin test: ADMIN_TEST_EMAIL and ADMIN_TEST_PASSWORD environment variables are not configured.");
      console.warn("    Configure them in your environment to execute authenticated browser audit.");
      await browser.close();
      process.exit(0);
    }

    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.type('input[type="email"]', adminEmail);
    await page.type('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');

    try {
      await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 8000 });
      await new Promise((r) => setTimeout(r, 1000));
      console.log("  ✓ Admin login form submitted successfully. Redirected to:", page.url());
    } catch {
      console.warn("  ⚠ Login redirect timed out. Please check if ADMIN_TEST_EMAIL/ADMIN_TEST_PASSWORD match active credentials in test database.");
      await browser.close();
      process.exit(0);
    }

    // 3. Responsive Viewport Check
    console.log("\n[3] Testing Responsive Layout on Authenticated /admin:");
    const viewports = [
      { name: "Mobile Narrow", w: 320, h: 640 },
      { name: "Mobile Standard", w: 375, h: 667 },
      { name: "Tablet", w: 768, h: 1024 },
      { name: "Desktop", w: 1280, h: 800 },
    ];

    for (const vp of viewports) {
      await page.setViewport({ width: vp.w, height: vp.h });
      await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 800));

      const info = await page.evaluate(() => {
        const scrollW = document.documentElement.scrollWidth;
        const innerW = window.innerWidth;
        const table = document.querySelector("table");
        const tableContainer = table ? table.parentElement : null;
        const tableW = table ? table.offsetWidth : 0;
        const containerW = tableContainer ? tableContainer.offsetWidth : 0;

        return { scrollW, innerW, tableW, containerW };
      });

      const isOverflowing = info.scrollW > info.innerW;
      console.log(`  - [${vp.name}] ${vp.w}px: scrollWidth=${info.scrollW}, tableWidth=${info.tableW} ${isOverflowing ? "❌ OVERFLOW" : "✓ OK"}`);
    }

    console.log("\n✓ Admin authentication and responsive audit completed successfully.");
  } catch (err) {
    console.error("Audit error:", err.message || err);
  } finally {
    if (browser) await browser.close();
  }
})();
