async function main() {
  const url = "https://unsplash.com/napi/search/photos?query=modern+villa+exterior&per_page=5";
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  console.log("Status:", res.status);
  if (res.ok) {
    const data = await res.json();
    console.log("Total found:", data.total);
    for (const r of data.results) {
      console.log(`- ID: ${r.id}, Raw: ${r.urls.raw.split("?")[0]}`);
      console.log(`  Desc: ${r.description || r.alt_description}`);
    }
  }
}
main().catch(console.error);
