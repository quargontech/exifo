import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { GUIDES, type GuideMeta } from "@/content/guides/meta";
import { GuideCards, SectionHeading } from "@/components/content/ContentBlocks";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Container, PageIntro } from "@/components/site/Container";

export const metadata = pageMetadata({
  title: "Guides to Photo Metadata, Privacy and Image Formats",
  description:
    "Plain guides to EXIF data, removing location from photos, Content Credentials (C2PA), checking for AI-generated images, HEIC to JPG and compressing images.",
  path: "/guides/",
  og: "guides",
});

const ORDER: GuideMeta["category"][] = ["Basics", "Privacy", "AI and provenance", "Formats"];

export default function GuidesPage() {
  return (
    <Container className="flex flex-col gap-12 py-10 sm:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Exifo", path: "/" },
          { name: "Guides", path: "/guides/" },
        ])}
      />
      <div className="flex flex-col gap-5">
        <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Guides" }]} />
        <PageIntro
          eyebrow="Guides"
          title="Photo metadata, explained"
          lead="What your images carry besides the picture, how to see it, and how to remove it without losing quality. Plus practical guides to image formats and file sizes."
        />
      </div>
      {ORDER.map((cat) => {
        const list = GUIDES.filter((g) => g.category === cat);
        return list.length ? (
          <section key={cat} className="flex flex-col gap-5">
            <SectionHeading>{cat}</SectionHeading>
            <GuideCards guides={list} />
          </section>
        ) : null;
      })}
    </Container>
  );
}
