import fs from "node:fs";

// Read property-images.ts to extract all URLs
const content = fs.readFileSync("src/lib/property-images.ts", "utf8");
const urlMatches = content.match(/https:\/\/images\.unsplash\.com\/photo-[^"\s,]+/g) || [];
const uniqueUrls = Array.from(new Set(urlMatches));

console.log(`Found ${uniqueUrls.length} unique Unsplash URLs in property-images.ts`);

async function inspectPhoto(url: string) {
  const match = url.match(/photo-([^?]+)/);
  if (!match) return { url, id: "unknown", title: "unknown", desc: "" };
  const id = match[1];

  try {
    const res = await fetch(`https://unsplash.com/photos/${id}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      return { url, id, status: res.status, title: "NOT_OK", desc: "" };
    }
    const html = await res.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(/ \| Unsplash$/, "") : "No title";

    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ||
                      html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
    const desc = descMatch ? descMatch[1] : "";

    return { url, id, status: 200, title, desc };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { url, id, status: 0, title: "ERROR: " + msg, desc: "" };
  }
}

async function main() {
  console.log("Inspecting photo content from Unsplash...");
  const results = [];
  // Inspect in batches of 5 to avoid rate limit
  for (let i = 0; i < uniqueUrls.length; i += 5) {
    const batch = uniqueUrls.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(inspectPhoto));
    results.push(...batchResults);
    process.stdout.write(`Processed ${results.length}/${uniqueUrls.length}...\r`);
  }
  console.log("\nFinished inspecting photos.");

  fs.writeFileSync("scripts/photo-inspection-results.json", JSON.stringify(results, null, 2), "utf8");

  // Analyze for suspicious terms
  const suspiciousKeywords = ["chef", "cook", "food", "kitchen", "restaurant", "office", "commercial", "skyscraper", "building", "person", "man", "woman", "portrait"];
  
  console.log("\n=== SUSPICIOUS OR INTERESTING PHOTOS ===");
  for (const r of results) {
    const text = `${r.title} ${r.desc}`.toLowerCase();
    const matches = suspiciousKeywords.filter((k) => text.includes(k));
    if (matches.length > 0) {
      console.log(`[${r.id}] matches [${matches.join(", ")}]:\n  Title: ${r.title}\n  Desc: ${r.desc.slice(0, 80)}...\n`);
    }
  }
}

main().catch(console.error);
