import Link from "next/link";
import { faqJsonLd, pageMetadata, webAppJsonLd } from "@/lib/seo";
import { HOME_FAQS } from "@/content/faqs";
import { GUIDES } from "@/content/guides/meta";
import { AnatomyDemo } from "@/components/home/AnatomyDemo";
import { HomeDropzone } from "@/components/home/HomeDropzone";
import { FaqList, GuideCards, SectionHeading, ToolCards } from "@/components/content/ContentBlocks";
import { ArrowRightIcon, CheckCircleIcon, ClockIcon, EditIcon, ImageIcon, LayersIcon, LockIcon, PinIcon, SparkIcon, TickIcon } from "@/components/icons";
import { JsonLd } from "@/components/JsonLd";
import { Mark } from "@/components/Logo";
import { Container } from "@/components/site/Container";
import { buttonVariants } from "@/components/ui/button";

export const metadata = pageMetadata({
  title: "Exifo: Remove EXIF and Metadata from Photos, Free and Private",
  absoluteTitle: true,
  description:
    "Remove EXIF, GPS and AI metadata from photos without losing quality, then check, edit, compress and convert images. Free and private: nothing is uploaded.",
  path: "/",
  og: "home",
});

const REVEALS = [
  {
    icon: PinIcon,
    title: "Where you were",
    text: "Phones record GPS coordinates accurate to a few metres, often with the altitude and the direction you faced.",
  },
  {
    icon: ImageIcon,
    title: "What you shoot with",
    text: "Camera and lens make and model and, on many cameras, a serial number that links every photo to one device.",
  },
  { icon: ClockIcon, title: "When, to the second", text: "The date and time the photo was taken, edited and saved, with the time zone." },
  { icon: SparkIcon, title: "How it was made", text: "Content Credentials, AI source labels, and the full prompt, seed and settings in AI-generated PNGs." },
  {
    icon: EditIcon,
    title: "How it was edited",
    text: "The apps that touched the file, an edit history, and sometimes the owner name set in the camera or software.",
  },
  {
    icon: LayersIcon,
    title: "A picture inside the picture",
    text: "Embedded thumbnails that may not match the edited picture, and motion-photo video stored after the image.",
  },
];

const COMPARISON: [string, string, string][] = [
  ["Your files are uploaded to a server", "Never", "Yes"],
  ["The image is decoded and saved again", "No, bytes are copied", "Often"],
  ["Colour profile kept", "Always", "Often lost"],
  ["Proof the image is unchanged", "SHA-256 check on every file", "Rarely"],
  ["Shows what was found first", "Every block and field", "Sometimes"],
  ["Content Credentials and AI prompts", "Read, verified and removable", "Rarely"],
  ["Works offline", "Yes, after the first visit", "No"],
];

const VERDICTS = [
  { title: "Marked as AI-generated", swatch: <span className="h-4 w-4 rounded bg-tag" /> },
  { title: "Marked as AI-edited", swatch: <span className="box-border h-4 w-4 rounded border-[2.5px] border-tag" /> },
  { title: "Content Credentials, no AI marker", swatch: <span className="h-4 w-4 rounded-full bg-proof" /> },
  { title: "No provenance data found", swatch: <span className="box-border h-4 w-4 rounded-full border-2 border-dashed border-ink-3" /> },
];

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          webAppJsonLd({
            name: "Exifo",
            path: "/",
            description:
              "Free image metadata toolkit that runs in the browser: remove, inspect, check and edit metadata, and compress, convert, resize and watermark images.",
            features: [
              "Lossless EXIF, GPS, XMP, IPTC and C2PA removal",
              "EXIF viewer",
              "AI provenance and Content Credentials check",
              "XMP copyright editor",
              "Image compression with target size",
              "HEIC to JPG conversion",
              "Resize, crop and watermark",
              "Images to PDF",
            ],
          }),
          faqJsonLd(HOME_FAQS),
        ]}
      />

      {/* Hero */}
      <Container as="section" className="grid items-center gap-10 pb-16 pt-10 sm:pt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            {["Free", "Private", "Lossless"].map((t) => (
              <span
                key={t}
                className="inline-flex h-7 items-center rounded-full border border-line-strong bg-surface px-3 text-[13px] font-semibold text-ink-2 dark:bg-transparent"
              >
                {t}
              </span>
            ))}
          </div>
          <h1 className="font-display m-0 text-[42px] font-bold leading-[1.04] sm:text-[56px] lg:text-[62px]">Clean image metadata. Keep every pixel.</h1>
          <p className="m-0 max-w-[560px] text-lg leading-[1.55] text-ink-2">
            See and remove the hidden data in your photos (location, device serial numbers, AI provenance and prompts) right in your browser. The image data is
            copied byte for byte, and nothing is ever uploaded.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/clean/" className={buttonVariants({ variant: "primary", size: "lg", className: "no-underline hover:text-primary-fg" })}>
              Clean images
              <ArrowRightIcon size={18} />
            </Link>
            <Link href="/inspect/" className={buttonVariants({ variant: "secondary", size: "lg", className: "no-underline hover:text-ink" })}>
              See what a photo reveals
            </Link>
          </div>
          <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-sm text-ink-2">
            <li className="flex items-center gap-2">
              <LockIcon size={16} /> Files never leave your device
            </li>
            <li className="flex items-center gap-2">
              <TickIcon size={16} className="text-proof" /> Verified lossless
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon size={16} /> Works offline
            </li>
          </ul>
        </div>
        <HomeDropzone />
      </Container>

      {/* What photos reveal */}
      <section className="border-y border-line bg-surface py-16 sm:py-20">
        <Container className="flex flex-col gap-10">
          <div className="flex max-w-[720px] flex-col gap-3">
            <SectionHeading>What your photos say about you</SectionHeading>
            <p className="m-0 text-[17px] leading-[1.55] text-ink-2">
              A photo file is a container. Next to the picture sit blocks of metadata that apps add without asking, and that travel with the file when you send
              it by email, chat or a cloud link.
            </p>
          </div>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
            {REVEALS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex flex-col gap-2 rounded-2xl border border-line bg-ground p-5 dark:bg-surface-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tag-tint text-tag-deep">
                  <Icon size={20} />
                </span>
                <h3 className="m-0 mt-1 text-base font-semibold">{title}</h3>
                <p className="m-0 text-sm leading-[1.55] text-ink-2">{text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* How it works */}
      <Container as="section" className="grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:gap-14">
        <div className="flex flex-col gap-6">
          <SectionHeading>The image stays whole. The extra blocks come off.</SectionHeading>
          <p className="m-0 text-[17px] leading-[1.55] text-ink-2">
            Most metadata removers draw your photo onto a canvas and save it again, which re-compresses it and can drop its colour profile. Exifo reads the
            file&apos;s structure instead and copies the blocks you keep, byte for byte.
          </p>
          <ol className="m-0 flex list-none flex-col gap-4 p-0">
            {[
              ["Drop your images", "JPEG, PNG and WebP, up to 50 at a time. Or paste from the clipboard."],
              ["See every block", "EXIF, GPS, XMP, IPTC, Content Credentials and AI prompts, with sizes, before anything is removed."],
              ["Download a verified copy", "Exifo checks a SHA-256 hash of the image data against the original before you can download."],
            ].map(([title, text], i) => (
              <li key={title} className="flex gap-4">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary font-mono text-sm font-semibold text-primary-fg"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="m-0 text-base font-semibold">{title}</h3>
                  <p className="m-0 text-sm leading-[1.55] text-ink-2">{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link href="/how-it-works/" className="flex items-center gap-1 self-start text-[15px] font-semibold">
            How lossless cleaning works <ArrowRightIcon size={16} />
          </Link>
        </div>
        <AnatomyDemo />
      </Container>

      {/* Tools */}
      <section className="border-y border-line bg-surface py-16 sm:py-20">
        <Container className="flex flex-col gap-10">
          <div className="flex max-w-[720px] flex-col gap-3">
            <SectionHeading>Eleven tools. No uploads.</SectionHeading>
            <p className="m-0 text-[17px] leading-[1.55] text-ink-2">
              Metadata tools never touch the image data. Image tools re-encode by design, and say so. All of them run on your device.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="m-0 font-mono text-[11px] font-normal tracking-[0.08em] text-ink-3">METADATA TOOLS</h3>
            <ToolCards ids={["clean", "inspect", "check", "edit", "compare"]} className="xl:[grid-template-columns:repeat(5,minmax(0,1fr))]" />
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="m-0 font-mono text-[11px] font-normal tracking-[0.08em] text-ink-3">IMAGE TOOLS</h3>
            <ToolCards ids={["compress", "convert", "resize", "watermark", "rename", "pdf"]} className="lg:[grid-template-columns:repeat(3,minmax(0,1fr))]" />
          </div>
        </Container>
      </section>

      {/* Comparison */}
      <Container as="section" className="flex flex-col gap-8 py-16 sm:py-20">
        <div className="flex max-w-[720px] flex-col gap-3">
          <SectionHeading>Lossless, not re-saved</SectionHeading>
          <p className="m-0 text-[17px] leading-[1.55] text-ink-2">How Exifo differs from a typical online metadata remover.</p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[620px] border-collapse text-left text-[15px]">
            <thead>
              <tr className="border-b border-line text-sm text-ink-2">
                <th scope="col" className="px-5 py-3.5 font-semibold">
                  <span className="sr-only">Feature</span>
                </th>
                <th scope="col" className="px-5 py-3.5 font-semibold text-ink">
                  <span className="flex items-center gap-2">
                    <Mark size={18} /> Exifo
                  </span>
                </th>
                <th scope="col" className="px-5 py-3.5 font-semibold">
                  Typical online remover
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([f, a, b]) => (
                <tr key={f} className="border-t border-line">
                  <th scope="row" className="px-5 py-3.5 text-left font-medium">
                    {f}
                  </th>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-2 font-semibold text-proof">
                      <TickIcon size={16} /> {a}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-ink-2">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>

      {/* AI and provenance */}
      <section className="border-y border-line bg-surface py-16 sm:py-20">
        <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="flex flex-col gap-5">
            <SectionHeading>See what an image says about its origin</SectionHeading>
            <p className="m-0 text-[17px] leading-[1.55] text-ink-2">
              Check reads Content Credentials (C2PA), the IPTC labels that mark AI-generated and AI-edited media, and the prompts Stable Diffusion and ComfyUI
              save in PNG files. Signed credentials are verified in your browser with the official C2PA SDK.
            </p>
            <p className="m-0 text-sm leading-[1.55] text-ink-3">
              Missing metadata does not mean an image is real, and removing labels can break platform rules or the law. Exifo is a privacy tool, not a way to
              hide that an image was AI-generated.
            </p>
            <Link href="/check/" className={buttonVariants({ variant: "secondary", className: "self-start no-underline hover:text-ink" })}>
              Check an image
              <ArrowRightIcon size={16} />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {VERDICTS.map((v) => (
              <div key={v.title} className="flex flex-col gap-3 rounded-[14px] border border-line bg-ground p-4 dark:bg-surface-2">
                {v.swatch}
                <div className="text-[15px] font-semibold leading-[1.35]">{v.title}</div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Guides */}
      <Container as="section" className="flex flex-col gap-8 py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex max-w-[720px] flex-col gap-3">
            <SectionHeading>Guides</SectionHeading>
            <p className="m-0 text-[17px] leading-[1.55] text-ink-2">Plain explanations of photo metadata, privacy and image formats.</p>
          </div>
          <Link href="/guides/" className="flex items-center gap-1 text-[15px] font-semibold">
            All guides <ArrowRightIcon size={16} />
          </Link>
        </div>
        <GuideCards guides={GUIDES.slice(0, 3)} />
      </Container>

      {/* FAQ */}
      <Container as="section" className="flex flex-col gap-8 pb-16 sm:pb-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading>Questions</SectionHeading>
          <Link href="/faq/" className="flex items-center gap-1 text-[15px] font-semibold">
            All questions <ArrowRightIcon size={16} />
          </Link>
        </div>
        <FaqList faqs={HOME_FAQS} />
      </Container>

      {/* CTA */}
      <Container as="section" className="pb-16 sm:pb-20">
        <div className="flex flex-col items-start gap-6 rounded-[20px] bg-primary p-8 text-primary-fg sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div className="flex flex-col gap-2">
            <h2 className="font-display m-0 text-[28px] font-bold leading-[34px] sm:text-[34px] sm:leading-[40px]">Share the photo, not the metadata.</h2>
            <p className="m-0 text-base opacity-80">Free, private and lossless. Works offline after the first visit.</p>
          </div>
          <Link
            href="/clean/"
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-primary-fg px-6 text-base font-semibold text-primary no-underline hover:text-primary hover:opacity-90"
          >
            Clean images
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </Container>
    </>
  );
}
