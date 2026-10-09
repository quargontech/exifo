// Builds packages/exifo-core: ESM + CJS bundles and type declarations, from src/lib/core.ts.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const PKG = path.resolve("packages/exifo-core");
const DIST = path.join(PKG, "dist");
fs.rmSync(DIST, { recursive: true, force: true });

const common = { entryPoints: ["src/lib/core.ts"], bundle: true, platform: "neutral", target: "es2020", sourcemap: true, logLevel: "warning" };
await build({ ...common, format: "esm", outfile: path.join(DIST, "index.js") });
await build({ ...common, format: "cjs", outfile: path.join(DIST, "index.cjs") });

const tsc = spawnSync("npx", ["tsc", "-p", "tsconfig.core.json"], { stdio: "inherit", shell: true });
if (tsc.status !== 0) process.exit(tsc.status ?? 1);

// Verify the package has no runtime imports.
const out = fs.readFileSync(path.join(DIST, "index.js"), "utf8");
if (/^\s*import\s.+from\s+["'][^.]/m.test(out)) {
  console.error("exifo-core must not import external modules");
  process.exit(1);
}
console.log(`exifo-core built: ${(out.length / 1024).toFixed(1)} KB (ESM)`);
