import fs from "node:fs";
import path from "node:path";

// Extract all URLs from property-images.ts
const content = fs.readFileSync("src/lib/property-images.ts", "utf8");
const urlMatches = content.match(/https:\/\/images\.unsplash\.com\/photo-[^"\s,]+/g) || [];
const uniqueUrls = Array.from(new Set(urlMatches));

const AUDIT_DIR = path.join(process.cwd(), "public", "image-audit");
if (!fs.existsSync(AUDIT_DIR)) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
}

async function downloadThumbnail(url: string, index: number) {
  const match = url.match(/photo-([^?]+)/);
  const id = match ? match[1] : `img-${index}`;
  const filePath = path.join(AUDIT_DIR, `${id}.jpg`);

  if (fs.existsSync(filePath)) {
    return { id, url, filePath, exists: true };
  }

  const thumbUrl = url.replace(/w=\d+/, "w=400").replace(/q=\d+/, "q=70");
  try {
    const res = await fetch(thumbUrl);
    if (!res.ok) {
      return { id, url, error: `HTTP ${res.status}` };
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    return { id, url, size: buffer.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { id, url, error: msg };
  }
}

async function main() {
  console.log(`Downloading ${uniqueUrls.length} thumbnails for visual inspection...`);
  for (let i = 0; i < uniqueUrls.length; i += 10) {
    const chunk = uniqueUrls.slice(i, i + 10);
    await Promise.all(chunk.map((u, idx) => downloadThumbnail(u, i + idx)));
    process.stdout.write(`Downloaded ${Math.min(i + 10, uniqueUrls.length)}/${uniqueUrls.length}...\r`);
  }
  console.log("\nDownload complete!");
}

main().catch(console.error);
