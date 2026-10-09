import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articleJsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { toolById } from "@/lib/tools";
import { ARTICLES } from "@/content/guides/articles";
import { GUIDES, guideBySlug } from "@/content/guides/meta";
import { GuideCards, SectionHeading } from "@/components/content/ContentBlocks";
import { ArrowRightIcon } from "@/components/icons";
import { JsonLd } from "@/components/JsonLd";
import { Prose } from "@/components/Prose";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Container } from "@/components/site/Container";
import { buttonVariants } from "@/components/ui/button";

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  if (!g) return {};
  return pageMetadata({
    title: g.title,
    description: g.description,
    path: `/guides/${g.slug}/`,
    og: `guide-${g.slug}`,
    type: "article",
    publishedTime: g.published,
    modifiedTime: g.updated,
  });
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = guideBySlug((await params).slug);
  const Body = g && ARTICLES[g.slug];
  if (!g || !Body) notFound();
  const tool = toolById(g.tool);
  const path = `/guides/${g.slug}/`;
  const related = GUIDES.filter((x) => x.slug !== g.slug && (x.category === g.category || x.tool === g.tool)).slice(0, 3);

  return (
    <Container className="flex flex-col gap-12 py-10 sm:py-14">
      <JsonLd
        data={[
          articleJsonLd({ title: g.title, description: g.description, path, published: g.published, modified: g.updated, og: `guide-${g.slug}` }),
          breadcrumbJsonLd([
            { name: "Exifo", path: "/" },
            { name: "Guides", path: "/guides/" },
            { name: g.short, path },
          ]),
        ]}
      />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
        <article className="flex min-w-0 flex-col gap-6">
          <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Guides", path: "/guides/" }, { name: g.short }]} />
          <header className="flex max-w-[760px] flex-col gap-3">
            <div className="font-mono text-[11px] tracking-[0.08em] text-tag-deep">{g.category.toUpperCase()}</div>
            <h1 className="font-display m-0 text-[32px] font-bold leading-[38px] sm:text-[42px] sm:leading-[48px]">{g.title}</h1>
            <p className="m-0 text-[17px] leading-[1.55] text-ink-2">{g.description}</p>
            <p className="m-0 text-[13px] text-ink-3">
              <time dateTime={g.updated ?? g.published}>{formatDate(g.updated ?? g.published)}</time> · {g.minutes} min read
            </p>
          </header>
          <Prose className="[&_h2]:mt-8">
            <Body />
          </Prose>
        </article>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
            <div className="font-mono text-[11px] tracking-[0.08em] text-ink-3">TRY IT</div>
            <div className="text-lg font-semibold">{tool.label}</div>
            <p className="m-0 text-sm leading-[1.5] text-ink-2">{tool.blurb}</p>
            <Link href={tool.href} className={buttonVariants({ variant: "primary", className: "no-underline hover:text-primary-fg" })}>
              Open {tool.label}
              <ArrowRightIcon size={16} />
            </Link>
            <p className="m-0 text-xs text-ink-3">Free. Runs in your browser; nothing is uploaded.</p>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="flex flex-col gap-5 border-t border-line pt-10">
          <SectionHeading>Related guides</SectionHeading>
          <GuideCards guides={related} />
        </section>
      )}
    </Container>
  );
}
