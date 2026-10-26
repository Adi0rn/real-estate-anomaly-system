/* eslint-disable */
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const OUTPUT_DIR = path.join(__dirname, "../qa-output");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: "320-narrow-mobile", width: 320, height: 640 },
  { name: "375-mobile", width: 375, height: 667 },
  { name: "390-modern-mobile", width: 390, height: 844 },
  { name: "768-tablet", width: 768, height: 1024 },
  { name: "1024-small-desktop", width: 1024, height: 768 },
  { name: "1280-desktop", width: 1280, height: 800 },
  { name: "1440-wide-desktop", width: 1440, height: 900 },
];

async function runAudit() {
  console.log("Starting QA audit with Chrome at:", CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const findings = [];
  const consoleErrors = [];

  const page = await browser.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push({ url: page.url(), text: msg.text() });
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push({ url: page.url(), text: err.toString() });
  });

  // Test routes
  const routes = [
    { path: "/", name: "home" },
    { path: "/properties/1", name: "property-detail" },
    { path: "/login", name: "login" },
    { path: "/register", name: "register" },
    { path: "/admin", name: "admin-unauth" },
  ];

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    console.log(`\n--- Auditing Viewport ${vp.name} (${vp.width}x${vp.height}) ---`);

    for (const route of routes) {
      for (const theme of ["light", "dark"]) {
        const fullUrl = `${BASE_URL}${route.path}`;
        await page.goto(fullUrl, { waitUntil: "networkidle2" });

        // Set theme
        await page.evaluate((th) => {
          localStorage.setItem("propaudit-theme", th);
          if (th === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }, theme);

        await new Promise((r) => setTimeout(r, 400));

        // Layout checks: Horizontal overflow
        const overflow = await page.evaluate(() => {
          const docWidth = document.documentElement.offsetWidth;
          const scrollWidth = document.documentElement.scrollWidth;
          const bodyWidth = document.body.scrollWidth;
          const windowWidth = window.innerWidth;
          
          const overflowingElements = [];
          document.querySelectorAll("*").forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > windowWidth + 1) {
              overflowingElements.push({
                tag: el.tagName,
                className: el.className ? String(el.className).slice(0, 80) : "",
                right: Math.round(rect.right),
                windowWidth,
                diff: Math.round(rect.right - windowWidth),
              });
            }
          });

          return {
            hasOverflow: scrollWidth > windowWidth || bodyWidth > windowWidth,
            scrollWidth,
            windowWidth,
            overflowingElements: overflowingElements.slice(0, 5),
          };
        });

        if (overflow.hasOverflow) {
          findings.push({
            type: "HORIZONTAL_OVERFLOW",
            route: route.path,
            viewport: `${vp.width}x${vp.height}`,
            theme,
            details: `Page width (${overflow.scrollWidth}px) exceeds viewport (${overflow.windowWidth}px) by ${overflow.scrollWidth - overflow.windowWidth}px`,
            elements: overflow.overflowingElements,
          });
          console.warn(`[OVERFLOW] ${route.name} at ${vp.width}px (${theme}): scrollWidth=${overflow.scrollWidth} > window=${overflow.windowWidth}`);
        }

        // Capture screenshot for key viewports
        if (["320-narrow-mobile", "390-modern-mobile", "1280-desktop"].includes(vp.name)) {
          const filename = `${route.name}_${vp.name}_${theme}.png`;
          await page.screenshot({
            path: path.join(OUTPUT_DIR, filename),
            fullPage: false,
          });
        }
      }
    }
  }

  // Phase 3: Interactive Tests
  console.log("\n--- Testing Interactive Functionality ---");

  // 1. Theme toggle interaction
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(BASE_URL, { waitUntil: "networkidle2" });
  
  const initialTheme = await page.evaluate(() => document.documentElement.classList.contains("dark") ? "dark" : "light");
  const toggleBtn = await page.$('button[aria-label*="Switch to"]');
  if (toggleBtn) {
    await toggleBtn.click();
    await new Promise((r) => setTimeout(r, 200));
    const toggledTheme = await page.evaluate(() => document.documentElement.classList.contains("dark") ? "dark" : "light");
    console.log(`Theme toggle: ${initialTheme} -> ${toggledTheme}`);
    if (initialTheme === toggledTheme) {
      findings.push({
        type: "INTERACTION_FAILURE",
        route: "/",
        details: "Theme toggle click did not change documentElement dark class",
      });
    }
    // Verify persistence across reload
    await page.reload({ waitUntil: "networkidle2" });
    const reloadedTheme = await page.evaluate(() => document.documentElement.classList.contains("dark") ? "dark" : "light");
    console.log(`Theme persistence on reload: ${reloadedTheme}`);
  } else {
    findings.push({
      type: "MISSING_ELEMENT",
      route: "/",
      details: "Theme toggle button not found on desktop header",
    });
  }

  // 2. Search & Filter interaction
  console.log("Testing search & filter interaction...");
  const searchInput = await page.$('input[placeholder*="Search"]');
  if (searchInput) {
    await searchInput.type("luxury");
    await page.keyboard.press("Enter");
    await new Promise((r) => setTimeout(r, 1000));
    const resultsCount = await page.evaluate(() => {
      const heading = document.querySelector("#browse h2");
      const count = document.querySelector("#browse span.font-mono");
      return { heading: heading?.textContent, count: count?.textContent };
    });
    console.log("Search results:", resultsCount);
  }

  // 3. Quick Spec Modal test
  console.log("Testing Quick Spec Modal...");
  const allBtns = await page.$$("article button");
  let modalOpened = false;
  for (const btn of allBtns) {
    const text = await page.evaluate((el) => el.textContent, btn);
    if (text.includes("Quick Spec")) {
      await btn.click();
      await new Promise((r) => setTimeout(r, 600));
      modalOpened = await page.evaluate(() => Boolean(document.querySelector(".fixed.inset-0.z-50")));
      if (modalOpened) {
        console.log("Quick spec modal successfully opened!");
        await page.screenshot({ path: path.join(OUTPUT_DIR, "modal_open_desktop.png") });
        // Close modal
        const closeBtn = await page.$('.fixed.inset-0.z-50 button');
        if (closeBtn) await closeBtn.click();
        await new Promise((r) => setTimeout(r, 300));
      }
      break;
    }
  }

  // 4. Test Mobile Menu drawer
  await page.setViewport({ width: 375, height: 667 });
  await page.goto(BASE_URL, { waitUntil: "networkidle2" });
  const mobileMenuBtn = await page.$('button[aria-label="Toggle navigation menu"]');
  if (mobileMenuBtn) {
    await mobileMenuBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    const menuOpened = await page.evaluate(() => Boolean(document.querySelector("div.border-t.border-slate-200")));
    console.log("Mobile menu drawer opened:", menuOpened);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "mobile_menu_open.png") });
  }

  // Output summary
  console.log("\n=== AUDIT FINDINGS SUMMARY ===");
  console.log("Total layout findings:", findings.length);
  findings.forEach((f, idx) => {
    console.log(`\nFinding #${idx + 1}: [${f.type}] on ${f.route} (${f.viewport}, ${f.theme})`);
    console.log(`  Details: ${f.details}`);
    if (f.elements) {
      console.log("  Overflowing elements:", JSON.stringify(f.elements, null, 2));
    }
  });

  console.log("\nTotal Console Errors:", consoleErrors.length);
  consoleErrors.forEach((ce) => console.log(`  Console Error on ${ce.url}: ${ce.text}`));

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "audit-results.json"),
    JSON.stringify({ findings, consoleErrors }, null, 2)
  );

  await browser.close();
  console.log("Audit complete. Results saved in qa-output/.");
}

runAudit().catch(console.error);
