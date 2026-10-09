import type { Metadata } from "next";
import { SITE_URL } from "./site";

export const SITE_NAME = "Exifo";
export const TAGLINE = "Check, edit and clean image metadata in your browser.";

export interface PageSeo {
  /** Title tag; the site name is appended by the layout template unless `absoluteTitle` is set. */
  title: string;
  description: string;
  /** Path with trailing slash, e.g. "/clean/". */
  path: string;
  /** Social image id in /public/og, e.g. "clean". Defaults to "home". */
  og?: string;
  absoluteTitle?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
}

export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString();

export function pageMetadata(p: PageSeo): Metadata {
  const image = { url: `/og/${p.og ?? "home"}.png`, width: 1200, height: 630, alt: p.title };
  const fullTitle = p.absoluteTitle ? p.title : `${p.title} · ${SITE_NAME}`;
  return {
    title: p.absoluteTitle ? { absolute: p.title } : p.title,
    description: p.description,
    alternates: { canonical: p.path },
    openGraph: {
      type: p.type ?? "website",
      siteName: SITE_NAME,
      locale: "en_GB",
      url: p.path,
      title: fullTitle,
      description: p.description,
      images: [image],
      ...(p.type === "article" ? { publishedTime: p.publishedTime, modifiedTime: p.modifiedTime ?? p.publishedTime } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description: p.description, images: [image.url] },
  };
}

/* ------------------------------------------------------------- JSON-LD */

type Json = Record<string, unknown>;

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

export function siteJsonLd(): Json {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl("/icons/icon-512.png"),
      },
      {
        "@type": "WebSite",
        "@id": SITE_ID,
        name: SITE_NAME,
        url: SITE_URL,
        description: TAGLINE,
        publisher: { "@id": ORG_ID },
        inLanguage: "en",
      },
    ],
  };
}

export function webAppJsonLd(o: { name: string; path: string; description: string; features?: string[] }): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: o.name,
    url: absoluteUrl(o.path),
    description: o.description,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any (runs in a web browser)",
    browserRequirements: "Requires a modern browser with JavaScript and WebAssembly",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: o.features,
    publisher: { "@id": ORG_ID },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

export interface Faq {
  q: string;
  a: string;
}

export function faqJsonLd(faqs: Faq[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function articleJsonLd(o: { title: string; description: string; path: string; published: string; modified?: string; og?: string }): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: o.title,
    description: o.description,
    url: absoluteUrl(o.path),
    mainEntityOfPage: absoluteUrl(o.path),
    image: absoluteUrl(`/og/${o.og ?? "home"}.png`),
    datePublished: o.published,
    dateModified: o.modified ?? o.published,
    author: { "@id": ORG_ID, "@type": "Organization", name: SITE_NAME },
    publisher: { "@id": ORG_ID, "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: absoluteUrl("/icons/icon-512.png") } },
    inLanguage: "en",
  };
}
