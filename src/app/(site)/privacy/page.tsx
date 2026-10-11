import { ANALYTICS_ENABLED } from "@/lib/analytics-config";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Container, PageIntro } from "@/components/site/Container";

import { Prose } from "@/components/Prose";

export const metadata = pageMetadata({
  title: "Privacy",
  description: ANALYTICS_ENABLED
    ? "Exifo processes images entirely in your browser. Nothing is uploaded, there are no accounts, and analytics only runs if you allow it."
    : "Exifo processes images entirely in your browser. Nothing is uploaded, there are no accounts and no tracking.",
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
      <p className="m-0 text-[13px] text-ink-3">Last updated 10 October 2026.</p>
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
          {ANALYTICS_ENABLED && <li>Whether you allowed or declined analytics, in local storage.</li>}
          <li>The app’s own files, in the browser cache, so it works offline after the first visit.</li>
          <li>
            If you share images to Exifo from your phone’s share menu, they are held briefly in the browser cache until the page opens them, then deleted.
          </li>
        </ul>
        {ANALYTICS_ENABLED ? (
          <p>There are no accounts and no advertising. Analytics runs only if you allow it, as described below.</p>
        ) : (
          <p>There are no accounts, no advertising, no tracking cookies and no analytics scripts.</p>
        )}

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
          {ANALYTICS_ENABLED && (
            <li>
              If you allow analytics, your browser loads Google Analytics from <code>googletagmanager.com</code> and sends usage data to Google. See{" "}
              <a href="#analytics">Analytics</a>.
            </li>
          )}
        </ul>
        {ANALYTICS_ENABLED && (
          <>
            <h2 id="analytics">Analytics</h2>
            <p>
              Exifo asks before using Google Analytics. Nothing is loaded from Google until you choose <strong>Allow</strong>. If you decline, no analytics
              script runs and no analytics cookies are set.
            </p>
            <p>If you allow it, Google Analytics receives:</p>
            <ul>
              <li>the pages you visit on Exifo, the page that linked you here, and how long you stay;</li>
              <li>your browser, device type, screen size and language;</li>
              <li>an approximate location derived from your IP address (Google Analytics does not store the IP address itself).</li>
            </ul>
            <p>
              It sets first-party cookies named <code>_ga</code> and <code>_ga_…</code> that last up to two years. Google signals and ad personalisation are
              turned off. Google Analytics never receives your images, their file names or their metadata: files are processed on your device and are not part
              of any request.
            </p>
            <p>
              You can change your choice at any time with <strong>Analytics settings</strong> in the footer. Declining removes the cookies. Google’s handling of
              this data is described in the <a href="https://policies.google.com/privacy">Google Privacy Policy</a>.
            </p>
          </>
        )}

        <p>
          The web host that serves these pages may keep standard access logs, such as IP address, browser type and the page requested, as any website host does.
        </p>

        <h2>Metadata you download</h2>
        <p>
          Cleaned files contain only the blocks you chose to keep. Re-encoded files from the image tools (Compress, Convert, Resize and Watermark) contain no
          metadata except, where needed, the information required to display the image correctly, plus a short{" "}
          <strong>XMP credit naming Exifo (exifo.app) as the creator tool</strong>, about 0.4 KB. The credit is on by default, is visible in Inspect and any
          EXIF viewer, and can be switched off with the <strong>Add Exifo credit</strong> toggle in each of those tools. It is only added to JPEG, PNG and WebP
          output, never to AVIF, and never to cleaned files. Exported reports contain the metadata of the files you exported; treat them as you would the
          original files.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy or your privacy can be sent to <a href="mailto:hello@exifo.app">hello@exifo.app</a>. This policy may be updated; the date
          above shows when it last changed.
        </p>
      </Prose>
    </Container>
  );
}
