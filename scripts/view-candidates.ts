import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "public", "candidate-audit");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg"));

const items = files.map((f, i) => `
  <div class="card">
    <img src="/candidate-audit/${f}" />
    <div class="name">#${i}: ${f.replace(".jpg", "")}</div>
  </div>
`).join("\n");

const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #111; color: #fff; font-family: sans-serif; padding: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .card { background: #222; border-radius: 6px; overflow: hidden; }
    img { width: 100%; height: 150px; object-fit: cover; }
    .name { font-size: 10px; font-family: monospace; padding: 6px; color: #aaa; word-break: break-all; }
  </style>
</head>
<body>
  <h1>Candidate Images Review</h1>
  <div class="grid">${items}</div>
</body>
</html>`;

fs.writeFileSync(path.join(process.cwd(), "public", "candidates.html"), html, "utf8");
console.log("Wrote public/candidates.html");
