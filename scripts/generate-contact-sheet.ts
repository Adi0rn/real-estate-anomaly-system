import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getPropertyImage, getPropertyGallery } from "../src/lib/property-images";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL || "" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const properties = await prisma.property.findMany({
    orderBy: { propertyId: "asc" },
  });

  const cities = ["Mumbai", "Pune", "Bangalore", "Chennai", "Hyderabad"];

  let htmlBody = "";

  for (const city of cities) {
    const inCity = properties.filter((p) => p.city === city);
    htmlBody += `
      <section class="city-section" id="city-${city.toLowerCase()}">
        <div class="city-header">
          <h2>${city.toUpperCase()} (${inCity.length} Listings)</h2>
          <span class="city-tag">City Region: ${city}</span>
        </div>
        <div class="grid">
    `;

    for (const p of inCity) {
      const heroUrl = getPropertyImage(p.propertyId, p.propertyType);
      const gallery = getPropertyGallery(p.propertyId, p.propertyType);
      const pps = Math.round(Number(p.price) / p.areaSqft);
      const priceLakh = (Number(p.price) / 100000).toFixed(1);

      htmlBody += `
        <div class="card" id="prop-${p.propertyId}">
          <div class="header">
            <span class="id">#${p.propertyId}</span>
            <span class="type ${p.propertyType.toLowerCase()}">${p.propertyType}</span>
            <span class="beds">${p.bedrooms} BHK</span>
            <span class="price">₹${priceLakh}L</span>
          </div>
          <div class="img-wrap">
            <img src="${heroUrl}" alt="${p.title}" loading="lazy" />
            <div class="hero-badge">Hero Photograph</div>
          </div>
          <div class="info">
            <h4>${p.title}</h4>
            <p class="specs">${p.areaSqft} sqft • ₹${pps}/sqft • ${p.listingType}</p>
          </div>
          <div class="gallery-strip">
            ${gallery
              .map(
                (img, idx) => `
              <div class="thumb-wrap ${idx === 0 ? "active" : ""}">
                <img src="${img}" title="Photo ${idx + 1}" loading="lazy" />
                <span class="thumb-label">${idx === 0 ? "Hero" : idx === 1 ? "Living" : idx === 2 ? "Kitchen" : "Bedroom"}</span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    }

    htmlBody += `
        </div>
      </section>
    `;
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PropAudit - Regionally Authentic Indian Real Estate Contact Sheet</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0c0e14; color: #e2e8f0; padding: 24px; line-height: 1.5; }
    header.main-header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #1e293b; }
    h1 { font-size: 24px; color: #fff; margin-bottom: 6px; }
    p.lead { font-size: 13px; color: #94a3b8; }
    .city-section { margin-bottom: 40px; }
    .city-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 10px 16px; background: #131722; border-left: 4px solid #38bdf8; border-radius: 4px; }
    .city-header h2 { font-size: 16px; font-weight: 700; color: #f8fafc; letter-spacing: 0.5px; }
    .city-tag { font-size: 11px; font-family: monospace; color: #38bdf8; background: #082f49; padding: 3px 8px; border-radius: 4px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .card { background: #161a24; border: 1px solid #242c3d; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.15s, border-color 0.15s; }
    .card:hover { border-color: #38bdf8; }
    .header { padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; background: #12151d; border-bottom: 1px solid #242c3d; }
    .id { font-family: monospace; font-weight: 700; color: #38bdf8; }
    .type { padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px; text-transform: uppercase; }
    .type.apartment { background: #0369a1; color: #fff; }
    .type.villa { background: #047857; color: #fff; }
    .type.house { background: #b45309; color: #fff; }
    .beds { color: #94a3b8; font-weight: 600; }
    .price { font-family: monospace; font-weight: 700; color: #34d399; }
    .img-wrap { width: 100%; height: 190px; position: relative; background: #090a0f; overflow: hidden; }
    .img-wrap img { width: 100%; height: 100%; object-fit: cover; }
    .hero-badge { position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); color: #fff; font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; letter-spacing: 0.5px; border: 1px solid rgba(255,255,255,0.2); }
    .info { padding: 10px 12px; flex: 1; }
    .info h4 { font-size: 12px; font-weight: 600; color: #f8fafc; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .specs { font-size: 11px; color: #94a3b8; font-family: monospace; }
    .gallery-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 8px 12px; background: #10131a; border-top: 1px solid #1e2636; }
    .thumb-wrap { position: relative; height: 50px; background: #000; border-radius: 3px; overflow: hidden; border: 1px solid #242c3d; }
    .thumb-wrap.active { border: 2px solid #38bdf8; }
    .thumb-wrap img { width: 100%; height: 100%; object-fit: cover; }
    .thumb-label { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.8); font-size: 8px; text-align: center; color: #cbd5e1; padding: 1px 0; font-family: monospace; }
  </style>
</head>
<body>
  <header class="main-header">
    <h1>PropAudit - Regional Indian Property Image Verification Matrix</h1>
    <p class="lead">Audit of all 100 listings categorized across Mumbai, Pune, Bangalore, Chennai, and Hyderabad. Evaluates architectural realism, city context, price tiers, and gallery consistency.</p>
  </header>
  ${htmlBody}
</body>
</html>`;

  const outputDir = path.join(process.cwd(), "docs", "qa-artifacts");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, "image-contact-sheet.html");
  fs.writeFileSync(outputPath, fullHtml, "utf8");
  console.log(`Updated contact sheet generated at: ${outputPath}`);
}

main().finally(() => prisma.$disconnect());
