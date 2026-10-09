import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Container, PageIntro } from "@/components/site/Container";

import { Prose } from "@/components/Prose";

export const metadata = pageMetadata({
  title: "Privacy",
  description: "Exifo processes images entirely in your browser. Nothing is uploaded, there are no accounts and no tracking.",
  path: "/privacy/",
  og: "home",
});

export default function Page() {
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Exifo", path: "/" },
          { name: "Privacy", path: "/privacy/" },
        ])}
      />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Privacy" }]} />
      <PageIntro eyebrow="Privacy" title="Privacy" lead="Nothing is uploaded. Your files stay on your device." />
      <Prose>
        <h2>Your files</h2>
        <p>
          Exifo reads, cleans, edits and converts images entirely inside your browser. The files you add are never sent to a server, and there is no server-side
          code that could receive them. Processing happens in a background worker on your device, and results are handed to you as downloads.
        </p>
        <p>When you close or reload the tab, the files and results held in memory are gone. Exifo does not keep a history.</p>

        <h2>What the app stores on your device</h2>
        <ul>
          <li>Your light or dark theme choice, in local storage.</li>
          <li>The app’s own files, in the browser cache, so it works offline after the first visit.</li>
          <li>
            If you share images to Exifo from your phone’s share menu, they are held briefly in the browser cache until the page opens them, then deleted.
          </li>
        </ul>
        <p>There are no accounts, no advertising, no tracking cookies and no analytics scripts.</p>

        <h2>Network requests</h2>
        <ul>
          <li>
            The pages, scripts, fonts and image codecs are loaded from the same site that serves Exifo. Fonts are bundled with the site, so no font service is
            contacted.
          </li>
          <li>
            The Check tool loads the Content Credentials SDK from this site when a file has Content Credentials. Signatures are checked on your device and no
            trust list is downloaded.
          </li>
          <li>
            Maps are never loaded automatically. If you choose <strong>Show map</strong> or <strong>Open in OpenStreetMap</strong> for a photo’s location,
            OpenStreetMap receives map tile or page requests that reveal roughly where the photo was taken. Your file is not sent.
          </li>
        </ul>
        <p>
          The web host that serves these pages may keep standard access logs, such as IP address, browser type and the page requested, as any website host does.
        </p>

        <h2>Metadata you download</h2>
        <p>
          Cleaned files contain only the blocks you chose to keep. Re-encoded files from the image tools contain no metadata except, where needed, the
          information required to display the image correctly. Exported reports contain the metadata of the files you exported; treat them as you would the
          original files.
        </p>
      </Prose>
    </Container>
  );
}
