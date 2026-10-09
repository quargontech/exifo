// Copies the C2PA SDK wasm into public/ so it is served as a static file (loaded only by Check).
import fs from "node:fs";
import path from "node:path";

const src = path.resolve("node_modules/@contentauth/c2pa-web/dist/resources/c2pa_bg.wasm");
const dest = path.resolve("public/wasm/c2pa_bg.wasm");
fs.mkdirSync(path.dirname(dest), { recursive: true });
if (!fs.existsSync(dest) || fs.statSync(dest).size !== fs.statSync(src).size) {
  fs.copyFileSync(src, dest);
  console.log("Copied c2pa_bg.wasm to public/wasm");
}
