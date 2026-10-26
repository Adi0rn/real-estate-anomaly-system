/* eslint-disable */
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const OUTPUT_DIR = path.join(__dirname, "../qa-output/verification");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  console.log("=== STARTING COMPREHENSIVE VERIFICATION SUITE ===");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  const results = {
    authSecurity: {},
    tableScrolling: {},
    modalConstraints: {},
    badgeWrapping: {},
    mobileDrawerTheme: {},
    specWrapping: {},
  };

  // -------------------------------------------------------------
  // TEST 1: Unauthenticated access to /admin
  // -------------------------------------------------------------
  console.log("\n[Test 1] Testing Unauthenticated /admin Access...");
  await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 600));
  const unauthUrl = page.url();
  const isRedirectedToLogin = unauthUrl.includes("/login");
  console.log(`  Unauthenticated /admin URL: ${unauthUrl} (Redirected: ${isRedirectedToLogin})`);
  await page.screenshot({ path: path.join(OUTPUT_DIR, "01_admin_unauthenticated_redirect.png") });
  results.authSecurity.unauthenticatedRedirect = isRedirectedToLogin;

  // -------------------------------------------------------------
  // TEST 2: Non-Admin (USER role) access to /admin
  // -------------------------------------------------------------
  console.log("\n[Test 2] Testing Non-Admin (USER role) /admin Access...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
  await page.type('input[type="email"]', "arjun@example.com");
  await page.type('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname !== "/login", { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 800));

  await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 600));
  const nonAdminPageContent = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasForbiddenNotice: text.includes("Administrator Privileges Required"),
      hasStandardRoleNotice: text.includes("standard role"),
      hasTable: Boolean(document.querySelector("table")),
    };
  });
  console.log("  Non-admin access evaluation:", nonAdminPageContent);
  await page.screenshot({ path: path.join(OUTPUT_DIR, "02_admin_non_admin_forbidden.png") });
  results.authSecurity.nonAdminBlocked = nonAdminPageContent.hasForbiddenNotice && !nonAdminPageContent.hasTable;

  // Sign out non-admin
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });
  const signOutBtn = await page.$('button:has-text("Sign Out")').catch(() => null);
  await page.evaluate(() => {
    fetch("/api/auth/logout", { method: "POST" });
  });
  await new Promise((r) => setTimeout(r, 500));

  // -------------------------------------------------------------
  // TEST 3: Authorized ADMIN access to /admin
  // -------------------------------------------------------------
  console.log("\n[Test 3] Testing Authorized ADMIN /admin Access...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
  await page.type('input[type="email"]', "admin@example.com");
  await page.type('input[type="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname !== "/login", { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 800));

  await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1000));

  const adminPageContent = await page.evaluate(() => {
    const table = document.querySelector("table");
    const kpiSummary = document.querySelectorAll(".grid.grid-cols-2 div");
    return {
      title: document.querySelector("h1")?.textContent,
      hasTable: Boolean(table),
      rowCount: table ? table.querySelectorAll("tbody tr").length : 0,
      kpiCount: kpiSummary.length,
    };
  });
  console.log("  Authorized Admin page content:", adminPageContent);
  await page.screenshot({ path: path.join(OUTPUT_DIR, "03_admin_authorized_dashboard.png") });
  results.authSecurity.adminAuthorized = adminPageContent.hasTable && adminPageContent.rowCount > 0;

  // -------------------------------------------------------------
  // FIX VERIFICATION 1: Anomaly Table min-w-[720px] and Horizontal Scroll
  // -------------------------------------------------------------
  console.log("\n[Verification 1] Testing Anomaly Table Layout on Mobile & Desktop...");
  const tableTestViewports = [
    { name: "320-narrow-mobile", w: 320, h: 640 },
    { name: "375-mobile", w: 375, h: 667 },
    { name: "768-tablet", w: 768, h: 1024 },
    { name: "1280-desktop", w: 1280, h: 800 },
  ];

  for (const vp of tableTestViewports) {
    await page.setViewport({ width: vp.w, height: vp.h });
    await new Promise((r) => setTimeout(r, 400));

    const tableMetrics = await page.evaluate(() => {
      const pageScrollW = document.documentElement.scrollWidth;
      const innerW = window.innerWidth;
      const table = document.querySelector("table");
      const container = table ? table.parentElement : null;
      return {
        pageNoOverflow: pageScrollW <= innerW,
        pageScrollW,
        innerW,
        tableWidth: table ? table.offsetWidth : 0,
        containerWidth: container ? container.offsetWidth : 0,
        containerScrollWidth: container ? container.scrollWidth : 0,
        containerHasScroll: container ? container.scrollWidth > container.offsetWidth : false,
      };
    });

    console.log(`  Viewport ${vp.name} (${vp.w}px): Table width=${tableMetrics.tableWidth}px, Container scrollWidth=${tableMetrics.containerScrollWidth}px, Page overflow: ${!tableMetrics.pageNoOverflow}`);
    results.tableScrolling[vp.name] = tableMetrics;
    await page.screenshot({ path: path.join(OUTPUT_DIR, `fix1_table_${vp.name}.png`) });
  }

  // -------------------------------------------------------------
  // FIX VERIFICATION 2: Modal Height Constraints on Short Screen
  // -------------------------------------------------------------
  console.log("\n[Verification 2] Testing Modal Max-Height & Vertical Scroll...");
  // Set short mobile landscape viewport
  await page.setViewport({ width: 667, height: 375 });
  await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 800));

  // Click Inspect Reason
  const allTableBtns = await page.$$("table button");
  for (const btn of allTableBtns) {
    const text = await page.evaluate((el) => el.textContent, btn);
    if (text.includes("Inspect Reason")) {
      await btn.evaluate((b) => b.click());
      await new Promise((r) => setTimeout(r, 600));
      break;
    }
  }

    const modalMetrics = await page.evaluate(() => {
      const modal = document.querySelector(".fixed.inset-0.z-50 .max-w-lg");
      const vh = window.innerHeight;
      return {
        modalHeight: modal ? modal.offsetHeight : 0,
        viewportHeight: vh,
        fitsInViewport: modal ? modal.offsetHeight <= vh : false,
        hasOverflowClass: modal ? modal.className.includes("overflow-y-auto") : false,
      };
    });
    console.log("  Inspect Reason Modal on 375px height viewport:", modalMetrics);
    results.modalConstraints.reasonModal = modalMetrics;
    await page.screenshot({ path: path.join(OUTPUT_DIR, "fix2_reason_modal_short_screen.png") });

    // Close modal
    const closeBtn = await page.$('.fixed.inset-0.z-50 button');
    if (closeBtn) await closeBtn.click();

  // Also test Quick Spec Modal on /
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 800));
  const quickSpecBtns = await page.$$("article button");
  for (const btn of quickSpecBtns) {
    const text = await page.evaluate((el) => el.textContent, btn);
    if (text.includes("Quick Spec")) {
      await btn.click();
      await new Promise((r) => setTimeout(r, 600));
      const quickSpecMetrics = await page.evaluate(() => {
        const modal = document.querySelector(".fixed.inset-0.z-50 .max-w-2xl");
        const vh = window.innerHeight;
        return {
          modalHeight: modal ? modal.offsetHeight : 0,
          viewportHeight: vh,
          fitsInViewport: modal ? modal.offsetHeight <= vh : false,
          hasOverflowClass: modal ? modal.className.includes("overflow-y-auto") : false,
        };
      });
      console.log("  Quick Spec Modal on 375px height viewport:", quickSpecMetrics);
      results.modalConstraints.quickSpecModal = quickSpecMetrics;
      await page.screenshot({ path: path.join(OUTPUT_DIR, "fix2_quick_spec_short_screen.png") });
      break;
    }
  }

  // -------------------------------------------------------------
  // FIX VERIFICATION 3: Property Card Badge Wrapping on 320px
  // -------------------------------------------------------------
  console.log("\n[Verification 3] Testing Property Card Badge Wrapping on 320px...");
  await page.setViewport({ width: 320, height: 640 });
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 800));

  const badgeMetrics = await page.evaluate(() => {
    const overlay = document.querySelector("article .pointer-events-none.absolute");
    const badges = overlay ? overlay.querySelectorAll("span") : [];
    let overlapping = false;
    for (let i = 0; i < badges.length; i++) {
      for (let j = i + 1; j < badges.length; j++) {
        const r1 = badges[i].getBoundingClientRect();
        const r2 = badges[j].getBoundingClientRect();
        if (
          r1.left < r2.right &&
          r1.right > r2.left &&
          r1.top < r2.bottom &&
          r1.bottom > r2.top
        ) {
          overlapping = true;
        }
      }
    }
    return {
      badgeCount: badges.length,
      overlayWidth: overlay ? overlay.offsetWidth : 0,
      hasWrappingClass: overlay ? overlay.className.includes("flex-wrap") : false,
      hasCollision: overlapping,
    };
  });
  console.log("  Badge metrics on 320px card:", badgeMetrics);
  results.badgeWrapping = badgeMetrics;
  await page.screenshot({ path: path.join(OUTPUT_DIR, "fix3_card_badge_wrapping_320px.png") });

  // -------------------------------------------------------------
  // FIX VERIFICATION 4: Mobile Drawer Theme Toggle Access
  // -------------------------------------------------------------
  console.log("\n[Verification 4] Testing Mobile Drawer Theme Toggle Access...");
  await page.setViewport({ width: 375, height: 667 });
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });
  const menuBtn = await page.$('button[aria-label="Toggle navigation menu"]');
  if (menuBtn) {
    await menuBtn.click();
    await new Promise((r) => setTimeout(r, 400));

    const drawerInfo = await page.evaluate(() => {
      const drawer = document.querySelector("div.border-t.border-slate-200, div.border-t.border-\\[\\#30363d\\]");
      const rows = drawer ? Array.from(drawer.querySelectorAll(".flex.items-center.justify-between")) : [];
      const themeRow = rows.find((r) => r.textContent.includes("Theme"));
      const toggle = themeRow ? themeRow.querySelector("button") : null;
      return {
        hasDrawer: Boolean(drawer),
        hasThemeRow: Boolean(themeRow),
        themeLabel: themeRow ? themeRow.textContent.trim() : "",
        hasToggleBtn: Boolean(toggle),
      };
    });
    console.log("  Mobile drawer evaluation:", drawerInfo);
    results.mobileDrawerTheme = drawerInfo;
    await page.screenshot({ path: path.join(OUTPUT_DIR, "fix4_mobile_drawer_theme_toggle.png") });
  }

  // -------------------------------------------------------------
  // FIX VERIFICATION 5: Specification Value Wrapping on 320px
  // -------------------------------------------------------------
  console.log("\n[Verification 5] Testing Specification Values on 320px...");
  await page.setViewport({ width: 320, height: 640 });
  await page.goto(`${BASE_URL}/properties/1`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 800));

  const specMetrics = await page.evaluate(() => {
    const specBar = document.querySelector(".grid.grid-cols-2.sm\\:grid-cols-4");
    const items = specBar ? specBar.querySelectorAll("div") : [];
    const values = [];
    items.forEach((item) => {
      const val = item.querySelector("span:nth-child(2)");
      if (val) {
        values.push({
          text: val.textContent?.trim(),
          fontSize: window.getComputedStyle(val).fontSize,
          height: val.offsetHeight,
        });
      }
    });
    const pageScrollW = document.documentElement.scrollWidth;
    return {
      pageNoOverflow: pageScrollW <= 320,
      specItems: values,
    };
  });
  console.log("  Specification values evaluation on 320px:", specMetrics);
  results.specWrapping = specMetrics;
  await page.screenshot({ path: path.join(OUTPUT_DIR, "fix5_spec_values_320px.png") });

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "verification-summary.json"),
    JSON.stringify(results, null, 2)
  );

  console.log("\n=== ALL VERIFICATIONS COMPLETED SUCCESSFULLY ===");
  await browser.close();
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
