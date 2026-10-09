import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Images are local blob: URLs in a static export, where next/image does not apply.
  { rules: { "@next/next/no-img-element": "off" } },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-dev/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "packages/*/dist/**",
      "public/wasm/**",
      "test-results/**",
    ],
  },
];

export default eslintConfig;
