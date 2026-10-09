import path from "node:path";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig: NextConfig = {
  // Fully static site: no server code, deployable to any static host.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  webpack(config, { webpack }) {
    // jSquash ships multi-threaded AVIF and OxiPNG builds that only run on cross-origin isolated
    // pages. This site is not, so bundle the single-threaded builds only: smaller output, faster
    // compiles, and no nested worker chunks.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/avif_enc_mt\.js$/, (resource: { request: string }) => {
        resource.request = resource.request.replace("avif_enc_mt.js", "avif_enc.js");
      }),
      new webpack.NormalModuleReplacementPlugin(/pkg-parallel[\\/]squoosh_oxipng\.js$/, path.resolve("src/lib/shims/oxipng-st.js")),
    );
    return config;
  },
};

// The dev server gets its own folder so `npm run build` can run while `npm run dev` is up:
// sharing .next corrupts both ("no direct app page entry found for /_not-found"). Builds keep
// the default, because a static export is written to distDir instead of out/ when it is changed.
export default function config(phase: string): NextConfig {
  return phase === PHASE_DEVELOPMENT_SERVER ? { ...nextConfig, distDir: ".next-dev" } : nextConfig;
}
