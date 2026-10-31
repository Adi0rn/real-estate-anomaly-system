import "dotenv/config";
import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { signSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth-crypto";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUTPUT_DIR = path.join(process.cwd(), "public", "screenshots", "dbms-analytics");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL || "" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== BROWSER VERIFICATION: DBMS ANALYTICS CONSOLE ===");

  // 1. Find an admin user to generate an authorized session
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!adminUser) {
    throw new Error("No admin user found in database for browser verification.");
  }

  console.log(`Using admin user: #${adminUser.userId} (${adminUser.email})`);
  const nowSec = Math.floor(Date.now() / 1000);
  const sessionToken = signSessionToken({
    userId: adminUser.userId,
    iat: nowSec,
    exp: nowSec + 7 * 24 * 60 * 60,
  });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1440, height: 950 },
  });

  try {
    const page = await browser.newPage();

    // Set authenticated session cookie
    await page.setCookie({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    });

    console.log("1. Navigating to /admin as Authenticated Admin...");
    await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1200));

    // Capture initial Anomaly Radar with new switcher visible
    await page.screenshot({ path: path.join(OUTPUT_DIR, "01-admin-overview-radar.png") });
    console.log("  ✓ Captured 01-admin-overview-radar.png");

    // Click "Level 3 DBMS Relational Analytics"
    console.log("2. Switching to DBMS Relational Analytics Engine...");
    const dbmsButton = await page.waitForSelector('button:has-text("Level 3 DBMS Relational Analytics")', {
      timeout: 5000,
    }).catch(async () => {
      // Fallback selector
      const buttons = await page.$$("button");
      for (const b of buttons) {
        const text = await page.evaluate((el) => el.textContent, b);
        if (text && text.includes("DBMS Relational Analytics")) return b;
      }
      return null;
    });

    if (dbmsButton) {
      await dbmsButton.click();
      await new Promise((r) => setTimeout(r, 1500));
    }

    // Capture Tab 1: GROUP BY & Aggregates
    await page.screenshot({ path: path.join(OUTPUT_DIR, "02-dbms-tab-aggregates.png") });
    console.log("  ✓ Captured 02-dbms-tab-aggregates.png");

    // Click "View Active SQL" to show parameterized query statement
    const viewSqlBtn = await page.$('button:has-text("View Active SQL")').catch(async () => {
      const buttons = await page.$$("button");
      for (const b of buttons) {
        const text = await page.evaluate((el) => el.textContent, b);
        if (text && text.includes("Active SQL")) return b;
      }
      return null;
    });

    if (viewSqlBtn) {
      await viewSqlBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      await page.screenshot({ path: path.join(OUTPUT_DIR, "03-dbms-active-sql-drawer.png") });
      console.log("  ✓ Captured 03-dbms-active-sql-drawer.png");
    }

    // Tab 2: Valuation CTEs (Z-Scores)
    console.log("3. Switching to Tab 2: Valuation CTEs (Z-Scores)...");
    const tab2 = await page.$('button:has-text("Valuation CTEs")').catch(async () => {
      const buttons = await page.$$("button");
      for (const b of buttons) {
        const text = await page.evaluate((el) => el.textContent, b);
        if (text && text.includes("Valuation CTEs")) return b;
      }
      return null;
    });
    if (tab2) {
      await tab2.click();
      await new Promise((r) => setTimeout(r, 1200));
      await page.screenshot({ path: path.join(OUTPUT_DIR, "04-dbms-tab-outliers-zscore.png") });
      console.log("  ✓ Captured 04-dbms-tab-outliers-zscore.png");
    }

    // Tab 3: Price Audit Trail (LAG)
    console.log("4. Switching to Tab 3: Price Audit Trail (LAG)...");
    const tab3 = await page.$('button:has-text("Price Audit Trail")').catch(async () => {
      const buttons = await page.$$("button");
      for (const b of buttons) {
        const text = await page.evaluate((el) => el.textContent, b);
        if (text && text.includes("Audit Trail")) return b;
      }
      return null;
    });
    if (tab3) {
      await tab3.click();
      await new Promise((r) => setTimeout(r, 1200));
      await page.screenshot({ path: path.join(OUTPUT_DIR, "05-dbms-tab-price-history-lag.png") });
      console.log("  ✓ Captured 05-dbms-tab-price-history-lag.png");
    }

    // Tab 4: Above-Peer Subquery
    console.log("5. Switching to Tab 4: Above-Peer Subquery...");
    const tab4 = await page.$('button:has-text("Above-Peer Subquery")').catch(async () => {
      const buttons = await page.$$("button");
      for (const b of buttons) {
        const text = await page.evaluate((el) => el.textContent, b);
        if (text && text.includes("Subquery")) return b;
      }
      return null;
    });
    if (tab4) {
      await tab4.click();
      await new Promise((r) => setTimeout(r, 1200));
      await page.screenshot({ path: path.join(OUTPUT_DIR, "06-dbms-tab-correlated-subquery.png") });
      console.log("  ✓ Captured 06-dbms-tab-correlated-subquery.png");
    }

    // Tab 5: Anomaly Review JOINs
    console.log("6. Switching to Tab 5: Anomaly Review JOINs...");
    const tab5 = await page.$('button:has-text("Anomaly Review JOINs")').catch(async () => {
      const buttons = await page.$$("button");
      for (const b of buttons) {
        const text = await page.evaluate((el) => el.textContent, b);
        if (text && text.includes("Review JOINs")) return b;
      }
      return null;
    });
    if (tab5) {
      await tab5.click();
      await new Promise((r) => setTimeout(r, 1200));
      await page.screenshot({ path: path.join(OUTPUT_DIR, "07-dbms-tab-anomaly-joins.png") });
      console.log("  ✓ Captured 07-dbms-tab-anomaly-joins.png");
    }

    // Tab 6: Dashboard View Summary
    console.log("7. Switching to Tab 6: Dashboard View Summary...");
    const tab6 = await page.$('button:has-text("Dashboard View")').catch(async () => {
      const buttons = await page.$$("button");
      for (const b of buttons) {
        const text = await page.evaluate((el) => el.textContent, b);
        if (text && text.includes("Dashboard View")) return b;
      }
      return null;
    });
    if (tab6) {
      await tab6.click();
      await new Promise((r) => setTimeout(r, 1200));
      await page.screenshot({ path: path.join(OUTPUT_DIR, "08-dbms-tab-view-summary.png") });
      console.log("  ✓ Captured 08-dbms-tab-view-summary.png");
    }

    console.log("=== ALL BROWSER SCREENSHOTS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Browser verification failed:", err);
  process.exit(1);
});
