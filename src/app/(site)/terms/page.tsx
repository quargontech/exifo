import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Container, PageIntro } from "@/components/site/Container";

import { Prose } from "@/components/Prose";
import { Notice } from "@/components/ui/notice";

export const metadata = pageMetadata({
  title: "Terms of Use",
  description:
    "Terms of use for Exifo, a free privacy tool for image metadata: what it is for, your responsibilities around AI content, and what it cannot do.",
  path: "/terms/",
  og: "home",
});

export default function Page() {
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Exifo", path: "/" },
          { name: "Terms of use", path: "/terms/" },
        ])}
      />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Terms of use" }]} />
      <PageIntro eyebrow="Legal" title="Terms of use" lead="Exifo is a privacy tool for image metadata. Use it responsibly." />
      <Notice tone="info" className="max-w-[760px] text-sm">
        You are responsible for following platform rules and the law where you live on disclosing AI-generated content. Do not use Exifo to pass off synthetic
        media as real.
      </Notice>
      <Prose>
        <h2>What Exifo is for</h2>
        <p>
          Exifo helps you see and control the information stored inside your images: removing a home location from a photo before you share it, removing device
          details and serial numbers, adding your name and copyright, or checking what a file says about its own origin.
        </p>

        <h2>Responsible use</h2>
        <ul>
          <li>
            You are responsible for following the rules of the platforms you publish on, and the laws that apply to you, about labelling and disclosing
            AI-generated or AI-edited content.
          </li>
          <li>
            You must not use Exifo to pass off synthetic or manipulated media as real, to deceive people, or to remove labels or provenance information where
            the law or a platform requires them to stay.
          </li>
          <li>
            Some laws require AI-generated content to carry labels and provenance metadata and prohibit removing them. For example, India’s IT (Intermediary
            Guidelines and Digital Media Ethics Code) Amendment Rules, 2026, and the transparency duties in the EU AI Act. Check the rules that apply to you
            before removing Content Credentials or AI source information.
          </li>
          <li>Only process files you have the right to process.</li>
        </ul>

        <h2>What Exifo does not do</h2>
        <ul>
          <li>It does not remove watermarks embedded in pixels (such as SynthID) or visible watermarks.</li>
          <li>It does not stop platforms from detecting AI content with their own classifiers. A cleaned file is not undetectable.</li>
          <li>
            The Check tool reports what a file says about itself. No provenance data does not mean an image is not AI-generated; metadata can be missing,
            removed or, when unsigned, edited.
          </li>
        </ul>

        <h2>No warranty</h2>
        <p>
          Exifo is provided as it is, without warranty of any kind. Every lossless clean is verified against the original before you can download it, but keep
          your originals. To the extent the law allows, the makers of Exifo are not liable for any loss arising from its use.
        </p>

        <h2>Open-source components</h2>
        <p>
          Exifo uses MozJPEG, libwebp, libavif and OxiPNG (via jSquash), the Content Credentials SDK (c2pa-web), exifr, fflate, pdf-lib, heic2any and Leaflet.
          Map data © OpenStreetMap contributors. Each component is used under its own licence.
        </p>
      </Prose>
    </Container>
  );
}
