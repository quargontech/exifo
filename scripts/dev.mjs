// Starts `next dev` and compiles every page in the background as soon as the server is up,
// so the first click on each tool is fast instead of waiting for on-demand compilation.
// Usage: npm run dev   (PORT=3001 npm run dev to change the port)
import { spawn } from "node:child_process";

const port = Number(process.env.PORT || 3000);
const origin = `http://localhost:${port}`;
const child = spawn("npx", ["next", "dev", "-p", String(port)], { stdio: "inherit", shell: true });

const stop = () => {
  child.kill("SIGINT");
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));

async function get(path) {
  const res = await fetch(origin + path, { headers: { "x-exifo-warmup": "1" } });
  await res.arrayBuffer();
  return res.status;
}

async function warm() {
  for (let i = 0; i < 240; i++) {
    try {
      if ((await get("/")) < 500) break;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  let paths = ["/"];
  try {
    const xml = await (await fetch(`${origin}/sitemap.xml`)).text();
    paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  } catch {
    // keep the home page only
  }
  const t = Date.now();
  for (const p of paths) {
    try {
      await get(p);
    } catch {
      // ignore; the page compiles on first visit instead
    }
  }
  console.log(`\n  ✓ Warmed up ${paths.length} pages in ${((Date.now() - t) / 1000).toFixed(1)} s. Switching between pages is now fast.\n`);
}

if (!process.env.NO_WARMUP) void warm();
