// Generates the 1200 × 630 social images in public/og/ from the built site (run `npm run build` first).
// Each page's og:image id, eyebrow and headline are read from out/**/index.html, then rendered with
// the brand fonts in the system Chrome. The PNGs are committed; rerun after changing page titles.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const OUT = path.resolve("out");
const DEST = path.resolve("public/og");
const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => fs.existsSync(p));
if (!fs.existsSync(OUT)) {
  console.error("Run `npm run build` first.");
  process.exit(1);
}
fs.mkdirSync(DEST, { recursive: true });

const html = (f) => fs.readFileSync(f, "utf8");
const text = (s) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const pages = new Map();
// The home page first, so pages that reuse its image do not claim it.
const order = (entries) => entries.sort((a, b) => (a.name === "index.html" ? -1 : b.name === "index.html" ? 1 : 0));
(function walk(dir) {
  for (const e of order(fs.readdirSync(dir, { withFileTypes: true }))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "404" && e.name !== "_not-found") walk(p);
    } else if (e.name === "index.html") {
      const src = html(p);
      const og = /property="og:image" content="[^"]*\/og\/([\w-]+)\.png"/.exec(src)?.[1];
      if (!og || pages.has(og)) continue;
      const route = "/" + path.relative(OUT, path.dirname(p)).split(path.sep).join("/");
      const h1 = text(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(src)?.[1] ?? "");
      const after = text(/<\/h1>[\s\S]*?<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/.exec(src)?.[1] ?? "");
      const eyebrow = text(/tracking-\[0\.08em\] text-tag-deep">([^<]+)</.exec(src)?.[1] ?? "");
      const isTool = /^\/(clean|inspect|check|edit|compare|compress|convert|resize|watermark|rename|pdf)$/.test(route);
      pages.set(og, {
        eyebrow: isTool ? h1 : og === "home" ? "Image metadata toolkit" : eyebrow || "Exifo",
        headline: isTool ? after : h1,
      });
    }
  }
})(OUT);

const MARK = `<path d="M16 14H28a4 4 0 0 1 4 4V28a4 4 0 0 0 4 4H46a4 4 0 0 1 4 4V48a10 10 0 0 1-10 10H16A10 10 0 0 1 6 48V24A10 10 0 0 1 16 14Z" fill="#0F1218"/><rect x="40" y="6" width="18" height="18" rx="5" fill="#F45D0E"/>`;
const STRIP = [0.6, 2.4, 1.6, 1.8, 0.8, 0.7, 0.8, 12, 0.6]
  .map((f, i) => `<div style="flex:${f} 1 0;height:18px;border-radius:4px;background:${i >= 1 && i <= 3 ? "#F45D0E" : "#C9CED6"}"></div>`)
  .join("");

const card = ({ eyebrow, headline }) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&family=Instrument+Sans:wght@500;600&family=JetBrains+Mono:wght@500&display=block">
<style>
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#F5F6F8;color:#0F1218;font-family:'Instrument Sans',sans-serif}
.wrap{position:absolute;inset:0;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.top{display:flex;justify-content:space-between;align-items:center}
.logo{display:flex;align-items:baseline;gap:10px}.word{font-family:'Bricolage Grotesque';font-weight:700;font-size:54px;letter-spacing:-0.03em;line-height:1;font-variation-settings:'opsz' 24}
.chip{display:flex;align-items:center;gap:10px;height:44px;padding:0 18px;border-radius:22px;border:1.5px solid #C9CED6;background:#fff;font-size:20px;font-weight:600;color:#4A5261}
.eyebrow{font-family:'JetBrains Mono';font-size:22px;letter-spacing:.08em;color:#A83C06;text-transform:uppercase;margin-bottom:18px}
h1{margin:0;font-family:'Bricolage Grotesque';font-weight:700;letter-spacing:-0.035em;line-height:1.04;max-width:1000px;font-size:var(--fs)}
.bottom{display:flex;flex-direction:column;gap:18px}.strip{display:flex;gap:5px}
.foot{display:flex;justify-content:space-between;font-family:'JetBrains Mono';font-size:20px;color:#5F6878}
</style></head><body><div class="wrap">
<div class="top"><div class="logo"><svg viewBox="6 6 52 52" width="40" height="40">${MARK}</svg><div class="word">exifo</div></div>
<div class="chip"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0F1218" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>Files never leave your device</div></div>
<div><div class="eyebrow">${esc(eyebrow)}</div><h1 style="--fs:${headline.length > 70 ? 58 : headline.length > 44 ? 66 : 76}px">${esc(headline)}</h1></div>
<div class="bottom"><div class="strip">${STRIP}</div><div class="foot"><span>Free · Private · Lossless</span><span>exifo.app</span></div></div>
</div></body></html>`;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [id, data] of pages) {
  await page.setContent(card(data), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const file = path.join(DEST, `${id}.png`);
  await page.screenshot({ path: file });
  fs.mkdirSync(path.join(OUT, "og"), { recursive: true });
  fs.copyFileSync(file, path.join(OUT, "og", `${id}.png`));
  console.log(`og/${id}.png  ${data.eyebrow} | ${data.headline}`);
}
await browser.close();
