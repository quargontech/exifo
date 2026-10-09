import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { TOOLS } from "@/lib/tools";
import { GUIDES } from "@/content/guides/meta";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const url = (p: string) => `${SITE_URL}${p}`;
  return [
    { url: url("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...TOOLS.map((t) => ({ url: url(t.href), lastModified: now, changeFrequency: "monthly" as const, priority: t.id === "clean" ? 0.95 : 0.85 })),
    { url: url("/guides/"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...GUIDES.map((g) => ({
      url: url(`/guides/${g.slug}/`),
      lastModified: new Date(g.updated ?? g.published),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: url("/how-it-works/"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: url("/faq/"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: url("/privacy/"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: url("/terms/"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
