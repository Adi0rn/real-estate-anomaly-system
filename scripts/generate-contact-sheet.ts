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

  console.log(`Loaded ${properties.length} properties from database.`);

  const cardsHtml = properties
    .map((p) => {
      const heroUrl = getPropertyImage(p.propertyId, p.propertyType);
      const gallery = getPropertyGallery(p.propertyId, p.propertyType);
      const photoIdMatch = heroUrl.match(/photo-([^?]+)/);
      const photoId = photoIdMatch ? photoIdMatch[1] : "unknown";

      return `
      <div class="card" id="prop-${p.propertyId}">
        <div class="header">
          <span class="id">ID #${p.propertyId}</span>
          <span class="type ${p.propertyType.toLowerCase()}">${p.propertyType}</span>
          <span class="city">${p.city}</span>
        </div>
        <div class="img-wrap">
          <img src="${heroUrl}" alt="${p.title}" loading="lazy" />
        </div>
        <div class="info">
          <h4>${p.title}</h4>
          <p class="price">₹${Number(p.price).toLocaleString("en-IN")} • ${p.bedrooms} Beds • ${p.bathrooms} Baths • ${p.areaSqft} sqft</p>
          <p class="photo-id">Unsplash ID: <code>${photoId}</code></p>
        </div>
        <div class="gallery-strip">
          ${gallery
            .map(
              (img, idx) => `
            <img src="${img}" class="${idx === 0 ? "active" : ""}" title="Gallery ${idx}" loading="lazy" />
          `
            )
            .join("")}
        </div>
      </div>
    `;
    })
    .join("\n");

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PropAudit - 100 Property Image Contact Sheet</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f1117; color: #e2e8f0; padding: 24px; }
    h1 { font-size: 24px; margin-bottom: 8px; color: #fff; }
    p.subtitle { font-size: 14px; color: #94a3b8; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .card { background: #1e222d; border: 1px solid #334155; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
    .header { padding: 8px 12px; display: flex; align-items: center; justify-between: space-between; gap: 8px; font-size: 11px; background: #181b24; border-bottom: 1px solid #334155; }
    .id { font-family: monospace; font-weight: bold; color: #38bdf8; }
    .type { padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; }
    .type.apartment { background: #0284c7; color: #fff; }
    .type.villa { background: #059669; color: #fff; }
    .type.house { background: #d97706; color: #fff; }
    .city { margin-left: auto; color: #94a3b8; }
    .img-wrap { width: 100%; height: 180px; position: relative; background: #000; overflow: hidden; }
    .img-wrap img { width: 100%; height: 100%; object-fit: cover; }
    .info { padding: 12px; flex: 1; }
    .info h4 { font-size: 13px; font-weight: 600; color: #f8fafc; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .price { font-size: 11px; color: #cbd5e1; margin-bottom: 6px; }
    .photo-id { font-size: 10px; color: #64748b; font-family: monospace; }
    .gallery-strip { display: flex; gap: 4px; padding: 8px 12px; background: #151820; border-top: 1px solid #28303f; }
    .gallery-strip img { width: 50px; height: 35px; object-fit: cover; border-radius: 2px; opacity: 0.7; }
    .gallery-strip img.active { border: 2px solid #38bdf8; opacity: 1; }
  </style>
</head>
<body>
  <h1>PropAudit 100 Property Primary Image & Gallery Contact Sheet</h1>
  <p class="subtitle">Complete visual verification matrix for properties 1–100 across architectural types (Apartment, Villa, House).</p>
  <div class="grid">
    ${cardsHtml}
  </div>
</body>
</html>`;

  const outputPath = path.join(process.cwd(), "public", "image-contact-sheet.html");
  fs.writeFileSync(outputPath, fullHtml, "utf8");
  console.log(`Contact sheet generated at: ${outputPath}`);
}

main().finally(() => prisma.$disconnect());
