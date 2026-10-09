import Link from "next/link";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";
import { FAQ_GROUPS } from "@/content/faqs";
import { FaqList, SectionHeading } from "@/components/content/ContentBlocks";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Container, PageIntro } from "@/components/site/Container";

export const metadata = pageMetadata({
  title: "Frequently Asked Questions",
  description: "Answers about privacy, lossless metadata removal, supported formats, AI provenance and Content Credentials, and Exifo's image tools.",
  path: "/faq/",
  og: "faq",
});

export default function FaqPage() {
  return (
    <Container className="flex flex-col gap-12 py-10 sm:py-14">
      <JsonLd
        data={[
          faqJsonLd(FAQ_GROUPS.flatMap((g) => g.faqs)),
          breadcrumbJsonLd([
            { name: "Exifo", path: "/" },
            { name: "FAQ", path: "/faq/" },
          ]),
        ]}
      />
      <div className="flex flex-col gap-5">
        <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "FAQ" }]} />
        <PageIntro eyebrow="FAQ" title="Frequently asked questions" lead="How Exifo works, what it does with your files, and what it cannot do.">
          <nav aria-label="Topics" className="flex flex-wrap gap-2 pt-1">
            {FAQ_GROUPS.map((g) => (
              <a
                key={g.id}
                href={`#${g.id}`}
                className="rounded-full border border-line-strong px-3 py-1.5 text-[13px] font-semibold text-ink-2 no-underline hover:text-ink"
              >
                {g.title}
              </a>
            ))}
          </nav>
        </PageIntro>
      </div>
      {FAQ_GROUPS.map((g) => (
        <section key={g.id} id={g.id} className="flex scroll-mt-24 flex-col gap-5">
          <SectionHeading>{g.title}</SectionHeading>
          <FaqList faqs={g.faqs} />
        </section>
      ))}
      <p className="m-0 text-[15px] text-ink-2">
        Still curious? Read <Link href="/how-it-works/">how Exifo works</Link> or browse the <Link href="/guides/">guides</Link>.
      </p>
    </Container>
  );
}
