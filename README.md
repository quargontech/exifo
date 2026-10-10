# Exifo

**Check, edit and clean image metadata in your browser.** A static, frontend-only web app: no backend, no database, no login, no uploads.

Exifo removes metadata blocks (Content Credentials, XMP, EXIF and GPS, IPTC, PNG generator prompts, thumbnails, trailing data) from JPEG, PNG and WebP **without decoding or re-encoding the image**, and proves it with a SHA-256 check of the image data on every file. Around that core it adds Inspect, Check, Edit, Compare, and image tools for Compress, Convert (including HEIC), Resize and crop, Watermark, Rename and Images to PDF.

## Quick start

```sh
npm install
npm run dev          # http://localhost:3000, pre-compiles every page in the background
npm run build        # static export to out/ (+ service worker)
npm start            # serve out/ on http://localhost:3000
```

Requires Node 22 (`.nvmrc`; `engines` pins Vercel builds to 22.x). `npm run build` downloads the three Google fonts once at build time and bundles them. The deployed site makes no third-party requests unless analytics is configured and the visitor allows it.

## Scripts

| Script                        | What it does                                                                                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev`                         | Next.js dev server via `scripts/dev.mjs`: once it is up, every page in the sitemap is compiled in the background so switching tools is fast. `dev:plain` skips the warm-up. |
| `build`                       | Exports the static site to `out/`, then writes `out/sw.js`. Dev compiles into `.next-dev`, so a build can run while `dev` is up                                             |
| `og`                          | Regenerates the 1200 × 630 social images in `public/og/` from the built pages (run after changing page titles; needs Chrome)                                                |
| `start`                       | Serves `out/` with a tiny static server (`scripts/serve.mjs`)                                                                                                               |
| `build:core`                  | Builds the zero-dependency parser package in `packages/exifo-core`                                                                                                          |
| `lint`, `typecheck`, `format` | ESLint, `tsc --noEmit`, Prettier                                                                                                                                            |

## How it is built

| Layer           | Choice                                                                                                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | Next.js 15 App Router, `output: "export"`, `trailingSlash: true`                                                                                                                                                      |
| Language        | TypeScript (strict)                                                                                                                                                                                                   |
| Styling         | Tailwind CSS v4 with design tokens from the Exifo brand canvas (light and dark)                                                                                                                                       |
| Fonts           | Bricolage Grotesque (display), Instrument Sans (interface), JetBrains Mono (data)                                                                                                                                     |
| State           | Zustand: one queue for the metadata tools, one for the image tools                                                                                                                                                    |
| Workers         | Two Web Workers via Comlink: `strip.worker.ts` (scan, report, clean, verify, lossless rotate) and `image.worker.ts` (decode, resize, watermark, encode). A crashed worker is restarted and the file marked as failed. |
| Parsers         | Own TypeScript code in `src/lib`: `jpeg.ts`, `png.ts`, `webp.ts`, `tiff.ts`, `exif-edit.ts`, `exif-min.ts`, `crc32.ts`, `verify.ts`                                                                                   |
| Report          | `exifr` for EXIF values; own readers for XMP (`xml-lite.ts`, `xmp.ts`), IPTC, ICC, PNG text and Content Credentials (`c2pa-lite.ts`: JUMBF + CBOR + certificate subject)                                              |
| Signature check | `@contentauth/c2pa-web` (9 MB wasm, loaded only on Check for files with Content Credentials; no trust list is fetched)                                                                                                |
| Codecs          | jSquash: MozJPEG, libwebp, libavif, OxiPNG, Lanczos resize; `heic2any` for HEIC; all lazy-loaded                                                                                                                      |
| Other           | `fflate` (ZIP in store mode, zlib), `pdf-lib`, `react-dropzone`, `react-image-crop`, `@dnd-kit`, `leaflet` (opt-in map)                                                                                               |
| Offline         | Hand-written service worker (`scripts/sw-template.js`), precache list generated from `out/` after each build                                                                                                          |

### The lossless rule

Output for Clean, Edit, selective removal and lossless rotation is built by copying kept segments or chunks byte for byte. `strip()` re-parses the output and compares the SHA-256 of the image data (JPEG: DQT, DHT, SOF, DRI, scans, EOI; PNG: IHDR, PLTE, IDAT, fdAT; WebP: VP8, VP8L, ALPH, ANMF); on a mismatch it throws and nothing is written. Canvas is only used for the optional pixel comparison and by the image tools, which are labelled “Re-encodes image”.

### Folder structure

```
src/app/(site)/     home page, guides, FAQ, how-it-works, privacy, terms (header + footer layout)
src/app/(tools)/    one route per tool (site header + tool sidebar); each page = the tool + server-rendered content
src/content/        tool page copy and FAQs, guide articles, home FAQs
src/app/            root layout, robots, sitemap, 404
src/components/     AppShell, Dropzone, AnatomyStrip, FileBar, ExportMenu, ui/ primitives (incl. progress.tsx:
                    spinner, progress bar, skeletons; keyframes live in globals.css),
                    and one folder per tool (clean, inspect, check, edit, compare, compress, …)
src/lib/            parsers, report, provenance, clean options, codecs, image pipeline, pdf, zip
src/store/          files (metadata queue), clean, images (image-tool queue), results, actions
src/workers/        strip.worker.ts, image.worker.ts
scripts/            dev warm-up, copy-wasm, build-sw, serve, og-images, build-core
packages/exifo-core zero-dependency npm package of the parser
```

## Pages and SEO

- `/` is the home page; the tools live at `/clean/`, `/inspect/`, `/check/` and so on. Dropping images on the home page queues them and opens Clean.
- Every tool page renders its guidance, how-to steps, FAQs and related links on the server, so the text is in the static HTML.
- Eight guides live at `/guides/<slug>/` (`src/content/guides`); add one by adding its metadata to `meta.ts` and its body to `articles.tsx`.
- Each page has a unique title, description, canonical URL, Open Graph and Twitter tags, and a social image. Structured data: WebSite and Organization on every page, WebApplication + BreadcrumbList + FAQPage on tools, Article + BreadcrumbList on guides, FAQPage on the FAQ.
- `sitemap.xml` and `robots.txt` are generated at build time.

## Deploying

The site is plain static files in `out/`.

- **Vercel:** `vercel.json` is included (Next.js preset, build command, headers). Vercel's Next.js builder detects the static export and serves it as static files. Its output directory is pinned to `.next`, which overrides the dashboard: an Output Directory of `out` makes the build fail with "routes-manifest.json couldn't be found".
- **Cloudflare Pages:** build command `npm run build`, output directory `out`. `public/_headers` sets security and cache headers.
- **Anything else:** serve `out/` with `/x/` resolving to `/x/index.html`.

Environment variables (see `.env.example`; both are read at build time, so redeploy after changing them). `.env.production` holds the production defaults and sets the GA ID; a variable set in the hosting dashboard overrides it:

| Variable               | Purpose                                                                           |
| ---------------------- | --------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, the sitemap and Open Graph tags. Default `https://exifo.app`.     |
| `NEXT_PUBLIC_GA_ID`    | Google Analytics 4 Measurement ID (`G-…`). Leave empty to ship without analytics. |

GitHub Actions (`.github/workflows/ci.yml`) runs lint and a full production build on every push and pull request to `main`.

## Analytics

Google Analytics 4 is optional and consent-based (`src/lib/analytics.ts`, `src/components/Analytics.tsx`).

- Without `NEXT_PUBLIC_GA_ID` nothing is loaded and no banner is shown.
- With it, visitors see a small banner. Nothing is requested from Google until they choose **Allow**; **Decline** is remembered and loads nothing. **Analytics settings** in the footer reopens the banner, and declining after allowing stops hits at once and deletes the `_ga` cookies.
- Google signals and ad personalisation are off; every ad consent signal is sent as denied.
- Page views, including client-side navigation between tools, come from GA4's enhanced measurement (on by default for a web stream). No custom events are sent, and files, file names and metadata are never part of any request.
- The Privacy page and the FAQ describe analytics only when it is configured.

The production Measurement ID is set in `.env.production`, so every production build (Vercel, Cloudflare or local `npm run build`) includes analytics; `npm run dev` does not. To use a different property, change it there or set `NEXT_PUBLIC_GA_ID` in the host's environment variables (for example Vercel **Settings → Environment Variables**), which takes precedence. To ship without analytics, remove the line from `.env.production`.

## PWA

The manifest declares a share target (Android: share images to Exifo, handled entirely in the service worker) and file handlers (installed desktop Chromium: “Open with Exifo”). The app works offline after the first visit; WASM codecs are cached the first time a tool uses them.

## Notes and decisions

- **Faster builds:** jSquash's multi-threaded AVIF and OxiPNG builds are swapped for the single-threaded ones in `next.config.ts`. Threads need a cross-origin isolated page, which a static host does not give by default, so they could never run.
- **Service worker:** a small hand-written worker plus a post-build precache script instead of `@serwist/next`, because it pairs cleanly with `output: "export"` and has to handle the share-target `POST` anyway.
- **UI components:** the controls are written to match the Exifo design canvas directly (Tailwind + `class-variance-authority`) rather than generated shadcn/ui components.
- **MPF and gain maps:** removed together with their index unless everything from the MPF segment to EOI is kept unchanged (for example when Edit only replaces XMP that sits before it), in which case they are kept.
- **Content Credentials kept in Custom mode:** removing other blocks changes the file, so the kept manifest will fail its hash check. The file card says so.
- **Location removal** also strips GPS properties from a kept XMP block.
- **Exifo credit:** the re-encoding image tools (Compress, Convert, Resize, Watermark) write a visible `xmp:CreatorTool = "Exifo (https://exifo.app)"` tag into the output (`src/lib/xmp-write.ts` `buildCreditXmp`, injected in `src/lib/image-ops.ts`). It is on by default, shows up in Inspect and any EXIF viewer, and each tool has an **Add Exifo credit** switch to turn it off (`src/lib/credit.ts`, remembered in local storage). It is only added to JPEG, PNG and WebP — never AVIF, and never to Clean's lossless output — and is disclosed on the Privacy page.
- **Share card:** `src/components/ShareExifo.tsx` shows a dismissible "share Exifo" card once files are cleaned or processed, with UTM-tagged links; dismissal is remembered in local storage. It never touches any file.
