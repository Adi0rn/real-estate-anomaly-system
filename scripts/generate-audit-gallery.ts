import fs from "node:fs";
import path from "node:path";
import {
  APARTMENT_HEROES,
  VILLA_HEROES,
  HOUSE_HEROES,
  INTERIOR_LIVING,
  INTERIOR_KITCHEN,
  INTERIOR_BEDROOM,
} from "../src/lib/property-images";

function renderGroup(title: string, groupKey: string, urls: string[]) {
  const items = urls
    .map((u, idx) => {
      const match = u.match(/photo-([^?]+)/);
      const id = match ? match[1] : "unknown";
      const localPath = `/image-audit/${id}.jpg`;

      return `
      <div class="item" id="${groupKey}-${idx}">
        <div class="img-box">
          <img src="${localPath}" alt="${id}" />
        </div>
        <div class="meta">
          <span class="index">#${idx}</span>
          <span class="id">${id}</span>
        </div>
      </div>
    `;
    })
    .join("\n");

  return `
    <section class="group-section" id="section-${groupKey}">
      <h2>${title} (${urls.length} images)</h2>
      <div class="items-grid">
        ${items}
      </div>
    </section>
  `;
}

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Image Audit Gallery</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 20px; }
    h1 { margin-bottom: 20px; }
    h2 { margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #334155; font-size: 18px; color: #38bdf8; }
    .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .item { background: #1e293b; border-radius: 6px; overflow: hidden; border: 1px solid #334155; }
    .img-box { width: 100%; height: 140px; background: #000; }
    .img-box img { width: 100%; height: 100%; object-fit: cover; }
    .meta { padding: 6px 10px; font-size: 10px; font-family: monospace; display: flex; justify-content: space-between; background: #0f172a; }
    .index { color: #f59e0b; font-weight: bold; }
    .id { color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
  </style>
</head>
<body>
  <h1>PropAudit 130 Photographic Asset Inspection</h1>
  ${renderGroup("Apartment Heroes", "apartments", APARTMENT_HEROES)}
  ${renderGroup("Villa Heroes", "villas", VILLA_HEROES)}
  ${renderGroup("House Heroes", "houses", HOUSE_HEROES)}
  ${renderGroup("Interior Living Rooms", "living", INTERIOR_LIVING)}
  ${renderGroup("Interior Kitchens", "kitchen", INTERIOR_KITCHEN)}
  ${renderGroup("Interior Bedrooms", "bedroom", INTERIOR_BEDROOM)}
</body>
</html>`;

fs.writeFileSync(path.join(process.cwd(), "public", "image-audit.html"), html, "utf8");
console.log("Wrote public/image-audit.html");
