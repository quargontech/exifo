import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Container, PageIntro } from "@/components/site/Container";
import Link from "next/link";

import { Prose } from "@/components/Prose";

export const metadata = pageMetadata({
  title: "How Lossless Metadata Removal Works",
  description: "How Exifo removes EXIF, XMP, IPTC and Content Credentials without decoding or re-encoding the image, and how it proves nothing else changed.",
  path: "/how-it-works/",
  og: "how-it-works",
});

const BLOCKS: [string, string, string, string, string][] = [
  ["Content Credentials (C2PA)", "Signed provenance manifest: generator, edit actions, signer", "APP11", "caBX chunk", "C2PA chunk"],
  ["XMP", "IPTC digital source type, creator tool, edit history, credit lines", "APP1", "iTXt", "XMP chunk"],
  ["EXIF", "Camera, software, date, GPS location, comments, thumbnail", "APP1", "eXIf", "EXIF chunk"],
  ["IPTC-IIM", "Credit, source, caption, byline", "APP13", "–", "–"],
  ["Text", "Stable Diffusion parameters, ComfyUI prompt and workflow, software, comments", "COM", "tEXt, zTXt, iTXt", "–"],
  ["Thumbnails", "An embedded preview that can differ from the main image", "APP0 JFXX, EXIF", "–", "–"],
  ["Trailing data", "Bytes after the end of the image: motion photo video, HDR gain map", "after EOI", "after IEND", "after RIFF"],
];

const STRIP = [
  { size: 0.6, found: false },
  { size: 2, found: true },
  { size: 1, found: true },
  { size: 1, found: false },
  { size: 0.8, found: false },
  { size: 16, found: false },
  { size: 0.6, found: false },
];

export default function Page() {
  return (
    <Container className="flex flex-col gap-6 py-10 sm:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Exifo", path: "/" },
          { name: "How it works", path: "/how-it-works/" },
        ])}
      />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "How it works" }]} />
      <PageIntro
        eyebrow="How it works"
        title="How lossless metadata removal works"
        lead="Metadata comes off. The image stays exactly as it was, and Exifo proves it."
      />
      <Prose>
        <p>
          An image file is a container. Inside it, the compressed picture sits next to separate blocks of information about the picture: where and when it was
          taken, the camera or software that made it, edit history, and sometimes a signed record of its origin. Exifo reads the container, lists every block,
          and writes a new file that leaves out the blocks you choose.
        </p>

        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5">
          <div className="flex gap-[3px]" role="img" aria-label="A JPEG file: two metadata blocks near the start, then the image data">
            {STRIP.map((s, i) => (
              <div key={i} className={s.found ? "h-3.5 rounded-[3px] bg-tag" : "h-3.5 rounded-[3px] bg-kept"} style={{ flex: `${s.size} 1 0` }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-3.5 rounded-[3px] bg-tag" />
              Metadata
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-3.5 rounded-[3px] bg-kept" />
              Image data and anything that affects how it looks
            </span>
          </div>
          <div className="font-mono text-[13px] tracking-[0.04em] text-ink-3">
            FF D8 FF E1 55 98 <span className="font-semibold text-tag-deep">45 78 69 66</span> 00 00 4D 4D 00 2A …
          </div>
          <p className="m-0 text-[13px] text-ink-3">The first bytes of a JPEG. The highlighted four spell “Exif”.</p>
        </div>

        <h2>Lossless by design</h2>
        <p>
          Most “metadata removers” draw the picture onto a canvas and save it again. That re-compresses a JPEG or WebP, loses quality, and can drop the colour
          profile. Exifo never decodes the picture to produce the file you download:
        </p>
        <ol>
          <li>The file is read as raw bytes, on your device.</li>
          <li>The container is parsed into its segments (JPEG) or chunks (PNG, WebP).</li>
          <li>A new file is assembled by copying the blocks that are kept, byte for byte, and skipping the rest.</li>
          <li>The compressed image data is copied untouched.</li>
        </ol>

        <h2>What is found and removed</h2>
      </Prose>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="bg-ground text-ink-2 dark:bg-surface-2">
              <th scope="col" className="px-4 py-2.5 font-semibold">
                Block
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                What it contains
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                JPEG
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                PNG
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                WebP
              </th>
            </tr>
          </thead>
          <tbody>
            {BLOCKS.map((r) => (
              <tr key={r[0]} className="border-t border-line align-top">
                <td className="px-4 py-2.5 font-semibold">{r[0]}</td>
                <td className="px-4 py-2.5 text-ink-2">{r[1]}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{r[2]}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{r[3]}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{r[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Prose>
        <p>
          Files are flagged <strong>AI provenance found</strong> when they carry an IPTC digital source type such as <code>trainedAlgorithmicMedia</code>,
          Content Credentials that name a generative model, or generator settings in PNG text (Stable Diffusion <code>parameters</code>, ComfyUI{" "}
          <code>prompt</code> and <code>workflow</code>). Software names and credit lines are shown so you can judge them yourself.
        </p>

        <h2>What is always kept</h2>
        <p>Some blocks change how the picture looks, so they stay in every file:</p>
        <ul>
          <li>The colour profile (ICC), so colours look the same.</li>
          <li>Orientation. If the full EXIF block is removed, a 36-byte block holding only the orientation is written back. You can turn this off.</li>
          <li>Transparency, gamma, colour space and HDR colour information.</li>
          <li>Animation frames and timing (APNG and animated WebP).</li>
          <li>The Adobe colour-transform block in JPEG, which CMYK images need.</li>
        </ul>
        <p>
          Phones store HDR gain maps and motion-photo videos after the end of the main JPEG, indexed by a multi-picture (MPF) block. Those offsets break when
          other blocks are removed, so in this version the extra images are removed together with their index. The main image is unchanged, and the file becomes
          a standard single-image JPEG.
        </p>

        <h2>Proof that nothing else changed</h2>
        <p>
          Every cleaned file is checked before you can download it. Exifo hashes the image data of the original and of the result with SHA-256: for JPEG the
          quantisation and Huffman tables, frame header and every scan; for PNG the header, palette and all image data chunks; for WebP the VP8, VP8L, ALPH and
          animation frame payloads. If the hashes differ, the output is thrown away and you see an error instead. You can also decode both files and compare
          every pixel with <strong>Compare pixels</strong>, or check any two files with <Link href="/compare/">Compare</Link>.
        </p>

        <h2>Formats</h2>
        <p>
          Lossless cleaning and editing work on JPEG, PNG and WebP. <Link href="/convert/">Convert</Link> also opens HEIC, AVIF, GIF and BMP. The image tools
          (Compress, Convert, Resize, Watermark) re-encode by design and are marked <strong>Re-encodes image</strong>. Rotating a JPEG without cropping or
          resizing only changes its orientation tag, which is lossless.
        </p>

        <h2>What Exifo cannot do</h2>
        <ul>
          <li>It does not remove watermarks embedded in the pixels, such as SynthID, or visible watermarks. These are not metadata.</li>
          <li>It does not stop platforms from detecting AI content with their own classifiers.</li>
          <li>A cleaned file is not “undetectable”.</li>
        </ul>
        <p>
          Removing provenance from AI-generated images can be against platform rules or the law where you live. See the <Link href="/terms/">terms</Link>.
        </p>

        <h2>Private and offline</h2>
        <p>
          Everything runs in your browser, in a background worker. Files are never uploaded, and after the first visit the app works offline. Read the{" "}
          <Link href="/privacy/">privacy statement</Link>.
        </p>
      </Prose>
    </Container>
  );
}
