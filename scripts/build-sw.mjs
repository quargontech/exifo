// Generates out/sw.js with a precache list of the exported app (run after `next build`).
// Large WASM codecs are not precached; they are cached the first time a tool uses them.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("out");
if (!fs.existsSync(OUT)) {
  console.error("out/ not found. Run `next build` first.");
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(p);
  }
})(OUT);

const hash = crypto.createHash("sha256");
const urls = [];
for (const f of files.sort()) {
  const rel = path.relative(OUT, f).split(path.sep).join("/");
  if (rel === "sw.js" || rel.endsWith(".map") || rel.endsWith(".wasm") || rel.startsWith("wasm/") || rel.startsWith("__shared")) continue;
  if (rel === "404.html" || rel === "robots.txt") continue;
  if (rel.startsWith("og/") || rel.startsWith("icons/exifo-logo") || rel === "_headers" || rel === "robots.txt" || rel === "sitemap.xml") continue;
  hash.update(rel).update(fs.readFileSync(f));
  if (rel === "index.html") urls.push("/");
  else if (rel.endsWith("/index.html")) urls.push(`/${rel.slice(0, -"index.html".length)}`);
  else urls.push(`/${rel}`);
}

const version = hash.digest("hex").slice(0, 12);
const template = fs.readFileSync(path.resolve("scripts/sw-template.js"), "utf8");
fs.writeFileSync(path.join(OUT, "sw.js"), template.replace("__VERSION__", version).replace("__PRECACHE__", JSON.stringify(urls, null, 0)));
console.log(`sw.js: ${urls.length} files precached, version ${version}`);
