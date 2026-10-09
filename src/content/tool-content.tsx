import Link from "next/link";
import type { ReactNode } from "react";
import type { Faq } from "@/lib/seo";
import type { ToolId } from "@/lib/tools";

export interface ToolContent {
  heading: string;
  intro: ReactNode[];
  stepsHeading: string;
  steps: { title: string; text: string }[];
  sections: { heading: string; body: ReactNode }[];
  faqs: Faq[];
  related: ToolId[];
  features: string[];
}

const Table = ({ head, rows }: { head: string[]; rows: ReactNode[][] }) => (
  <div className="overflow-x-auto rounded-xl border border-line bg-surface">
    <table className="w-full min-w-[480px] border-collapse text-left text-sm">
      <thead>
        <tr className="bg-ground text-ink-2 dark:bg-surface-2">
          {head.map((h) => (
            <th key={h} scope="col" className="px-4 py-2.5 font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-line align-top">
            {r.map((c, j) => (
              <td key={j} className={j === 0 ? "px-4 py-2.5 font-semibold text-ink" : "px-4 py-2.5 text-ink-2"}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const code = (s: string) => <code>{s}</code>;

export const TOOL_CONTENT: Record<ToolId, ToolContent> = {
  clean: {
    heading: "Remove EXIF, GPS and AI metadata from photos",
    intro: [
      "Every photo carries more than the picture. Phones and cameras add the date, the device and often the exact GPS position. Editing apps add their own history. AI image generators add Content Credentials, source labels and sometimes the whole prompt. Clean removes those blocks from JPEG, PNG and WebP files while copying the image data byte for byte, so the picture you download is exactly the picture you added.",
      "Because nothing is decoded or saved again, there is no quality loss and the colour profile stays in place. Before you can download a cleaned file, Exifo compares a SHA-256 hash of its image data with the original's. If they do not match, nothing is written.",
    ],
    stepsHeading: "How to remove metadata from a photo",
    steps: [
      { title: "Add your images", text: "Drop them on the page, paste from the clipboard or browse. Up to 50 files at a time, 50 MB each." },
      {
        title: "Choose what to remove",
        text: "Remove everything, or switch to Custom to keep blocks such as Content Credentials, or remove only the location.",
      },
      {
        title: "Clean and download",
        text: "Clean one file or all of them, then download each file or a ZIP. Every card confirms the image data is identical.",
      },
    ],
    sections: [
      {
        heading: "What Clean removes",
        body: (
          <ul>
            <li>
              <strong>EXIF</strong>: GPS location, camera make and model, serial numbers, lens, date and time, exposure settings and the embedded thumbnail.
            </li>
            <li>
              <strong>XMP</strong>: edit history, the creator tool, rights and the IPTC digital source type that marks AI-generated media.
            </li>
            <li>
              <strong>IPTC</strong>: captions, bylines, credit lines and keywords stored by Photoshop and newsroom software.
            </li>
            <li>
              <strong>Content Credentials (C2PA)</strong>: signed provenance manifests with the generator, edit actions and signer.
            </li>
            <li>
              <strong>PNG text</strong>: Stable Diffusion {code("parameters")}, ComfyUI {code("prompt")} and {code("workflow")}, software names and comments.
            </li>
            <li>
              <strong>Everything else</strong>: JPEG comments, private application blocks, and data stored after the end of the image, such as motion-photo
              video.
            </li>
          </ul>
        ),
      },
      {
        heading: "What is always kept",
        body: (
          <p>
            The colour profile, transparency, animation frames and timing, and the Adobe colour-transform block CMYK images need. The orientation is written
            back as a tiny 36-byte block so the photo still displays the right way up; you can turn that off. Read{" "}
            <Link href="/how-it-works/">how lossless cleaning works</Link>.
          </p>
        ),
      },
      {
        heading: "Remove only some metadata",
        body: (
          <p>
            Choose <strong>Custom</strong> to pick blocks one by one. With EXIF kept, you can still remove just the location, device details or dates inside it,
            without changing the size of the block. Presets cover the common cases: <em>Location only</em>, <em>Device details</em>, <em>Dates</em>,{" "}
            <em>Thumbnail</em> and <em>Keep copyright only</em>.
          </p>
        ),
      },
    ],
    faqs: [
      {
        q: "Does removing metadata reduce image quality?",
        a: "No. Clean never decodes or re-saves the picture. It copies the compressed image data byte for byte and leaves out the metadata blocks, then checks a SHA-256 hash of the image data against the original before you download.",
      },
      {
        q: "Are my photos uploaded anywhere?",
        a: "No. Exifo runs entirely in your browser. Files are read and cleaned on your device and are never sent to a server. After your first visit it also works offline.",
      },
      {
        q: "Which formats can I clean?",
        a: "JPEG, PNG (including animated PNG) and WebP (including animated WebP). HEIC and AVIF cannot be cleaned losslessly yet; convert them to JPEG first with the Convert tool.",
      },
      {
        q: "Will my photo still display the right way up?",
        a: "Yes. If the original has an orientation tag, Clean writes back a tiny block that holds only the orientation. You can turn this off with the Keep orientation switch.",
      },
      {
        q: "Can I remove only the GPS location?",
        a: "Yes. Choose Custom and the Location only preset. The GPS data is removed from inside the EXIF block and any location in XMP is removed too, while the rest of the metadata stays.",
      },
      {
        q: "Does Clean remove AI watermarks such as SynthID?",
        a: "No. Invisible watermarks like SynthID are part of the pixels, not metadata, so they are not touched. A cleaned file is not undetectable, and you remain responsible for disclosing AI-generated content where rules or laws require it.",
      },
    ],
    related: ["inspect", "check", "edit"],
    features: [
      "Lossless metadata removal",
      "EXIF and GPS removal",
      "C2PA Content Credentials removal",
      "SHA-256 image data verification",
      "Batch processing with ZIP download",
      "Works offline",
    ],
  },

  inspect: {
    heading: "An online EXIF viewer that shows everything",
    intro: [
      "Inspect lists every metadata field in a JPEG, PNG or WebP file, and every block in the order it appears in the file. Most EXIF viewers stop at camera settings. Inspect also reads XMP, IPTC, the colour profile, PNG text chunks and Content Credentials, so you can see exactly what a photo would tell someone else.",
      "The file is read on your device and never changed. When you are done you can remove the location in one click, clean the whole file, or export the report.",
    ],
    stepsHeading: "How to view the metadata of a photo",
    steps: [
      { title: "Add an image", text: "Drop a JPEG, PNG or WebP file, or paste one. Nothing is uploaded." },
      { title: "Read the fields", text: "Fields are grouped by block. Search for GPS, Software or Copyright, and copy any value." },
      { title: "Check the structure", text: "See every segment or chunk with its offset and size. Metadata is marked in orange." },
      { title: "Act on it", text: "Remove the location, clean the file, or export the report as JSON, CSV or text." },
    ],
    sections: [
      {
        heading: "What Inspect shows",
        body: (
          <ul>
            <li>
              <strong>EXIF</strong>: make, model, lens, serial numbers, exposure, dates, software and orientation.
            </li>
            <li>
              <strong>GPS</strong>: latitude, longitude and altitude, with an optional map.
            </li>
            <li>
              <strong>XMP</strong>: creator tool, edit history, rights, and the IPTC digital source type.
            </li>
            <li>
              <strong>IPTC</strong>: caption, byline, credit, source and keywords.
            </li>
            <li>
              <strong>Colour profile</strong>: the ICC description, colour space and version.
            </li>
            <li>
              <strong>PNG text</strong>: generator prompts, seeds and workflows from AI image tools.
            </li>
            <li>
              <strong>Content Credentials</strong>: claim generator, signer, signing time and recorded actions.
            </li>
          </ul>
        ),
      },
      {
        heading: "See the location without sharing it",
        body: (
          <p>
            Coordinates are shown as text. A map is only loaded if you ask for one, because map tiles come from OpenStreetMap and requesting them reveals
            roughly where the photo was taken. Read more about <Link href="/guides/remove-location-from-photos/">removing location data from photos</Link>.
          </p>
        ),
      },
    ],
    faqs: [
      {
        q: "How do I see the EXIF data of a photo?",
        a: "Open Inspect and drop the photo on the page. Every EXIF field is listed with its value, along with XMP, IPTC, GPS and colour profile data. You can search the fields and copy any value.",
      },
      {
        q: "How can I tell if a photo has its location in it?",
        a: "Inspect shows a GPS group with the badge “This photo contains a location” when coordinates are present, in EXIF or in XMP. You can remove the location in one click.",
      },
      {
        q: "Is an online EXIF viewer safe for private photos?",
        a: "Exifo's viewer runs in your browser and does not upload files. The page is downloaded once; the photo itself is only read on your device.",
      },
      {
        q: "Why does my photo show no EXIF data?",
        a: "Screenshots, many messaging apps and most social networks remove EXIF when they save or re-compress an image. Some editing apps also drop it on export. Inspect still shows any XMP, colour profile or text data that remains.",
      },
      {
        q: "Can I export the metadata?",
        a: "Yes. Export report saves the metadata as JSON with every block and field, as CSV with one row per file, or as plain text. With several files open you can export all of them at once.",
      },
    ],
    related: ["clean", "check", "compare"],
    features: ["EXIF viewer", "GPS location viewer", "XMP and IPTC viewer", "ICC profile summary", "File structure view", "JSON, CSV and text export"],
  },

  check: {
    heading: "Check what an image says about its origin",
    intro: [
      "Check reads the provenance information an image carries about itself: Content Credentials (C2PA), the IPTC digital source type that marks AI-generated and AI-edited media, and the generator settings that tools such as Stable Diffusion and ComfyUI write into PNG files.",
      "Signed Content Credentials are verified in your browser with the official C2PA SDK, which checks that the signature matches and that the image has not changed since it was signed. No trust list is downloaded and nothing is uploaded.",
    ],
    stepsHeading: "How to check an image",
    steps: [
      { title: "Add an image", text: "Drop a JPEG, PNG or WebP file. Check reads it on your device." },
      { title: "Read the verdict", text: "One of four verdicts, with a sentence on which parts of the file support it." },
      { title: "Review the details", text: "Generating tool, signer, signing time, recorded actions, signature status and any prompt found." },
    ],
    sections: [
      {
        heading: "The four verdicts",
        body: (
          <ul>
            <li>
              <strong>Marked as AI-generated</strong>: Content Credentials or the IPTC source type say a generative model made the image, or the file holds
              generator settings.
            </li>
            <li>
              <strong>Marked as AI-edited</strong>: a generative tool changed part of the image, for example with generative fill.
            </li>
            <li>
              <strong>Has Content Credentials, no AI marker</strong>: a signed manifest is present and names no generative tool, as with some cameras and
              editing apps.
            </li>
            <li>
              <strong>No provenance data found</strong>: nothing in the file describes where it came from.
            </li>
          </ul>
        ),
      },
      {
        heading: "What metadata can and cannot prove",
        body: (
          <p>
            Metadata can be missing, removed or, when it is not signed, edited. So “No provenance data” does not mean an image is real, and Check does not use
            an AI classifier or look for watermarks in the pixels. A valid signed manifest is the only strong evidence. Learn more in{" "}
            <Link href="/guides/check-if-image-is-ai-generated/">how to check if an image is AI-generated</Link> and{" "}
            <Link href="/guides/what-are-content-credentials/">what Content Credentials are</Link>.
          </p>
        ),
      },
    ],
    faqs: [
      {
        q: "Can Exifo tell me for certain whether an image is AI-generated?",
        a: "No tool can from metadata alone. Check reports what the file says about itself. A valid C2PA signature is strong evidence; unsigned labels can be added or removed, and missing metadata proves nothing.",
      },
      {
        q: "What does the signature check do?",
        a: "It uses the C2PA SDK to confirm that the Content Credentials were signed by the certificate they name, and that the image and its claims have not changed since. It does not check the signer against a trust list.",
      },
      {
        q: "Why does a signature show as invalid?",
        a: "Usually because the file was changed after signing, for example re-saved, cropped or had other metadata removed. It can also mean the signature does not match the claim. Check shows the reason.",
      },
      {
        q: "Does Check use an AI detector?",
        a: "No. It only reads metadata stored in the file. It does not analyse pixels and does not detect invisible watermarks such as SynthID.",
      },
    ],
    related: ["inspect", "clean", "compare"],
    features: ["C2PA Content Credentials reader", "C2PA signature validation", "IPTC digital source type check", "Stable Diffusion and ComfyUI prompt reader"],
  },

  edit: {
    heading: "Add copyright and creator information to your photos",
    intro: [
      "Edit writes common descriptive fields into an image: title, description, creator, copyright notice, credit line, keywords and the date it was created. They are stored as one standard XMP packet that photo software such as Adobe Lightroom, Bridge and Photoshop can read.",
      "Like Clean, Edit never re-encodes the picture. The image data is copied byte for byte and checked against the original, so adding your name costs nothing in quality. Apply the same creator and copyright to a whole batch at once.",
    ],
    stepsHeading: "How to add copyright to a photo",
    steps: [
      { title: "Add images", text: "One photo or a whole batch of JPEG, PNG and WebP files." },
      { title: "Fill in the fields", text: "The form starts from the first file's existing values. Leave any field empty to skip it." },
      { title: "Write and download", text: "Write to every file, then download each one or a ZIP. Image data is verified identical." },
    ],
    sections: [
      {
        heading: "Fields and where they are stored",
        body: (
          <Table
            head={["Field", "XMP property"]}
            rows={[
              ["Title", code("dc:title")],
              ["Description", code("dc:description")],
              ["Creator", code("dc:creator")],
              ["Copyright notice", code("dc:rights")],
              ["Credit", code("photoshop:Credit")],
              ["Keywords", code("dc:subject")],
              ["Date created", code("photoshop:DateCreated")],
            ]}
          />
        ),
      },
      {
        heading: "Good to know",
        body: (
          <ul>
            <li>Any existing XMP block is replaced, so fields you leave empty are not kept. EXIF and IPTC are left as they are.</li>
            <li>Editing a file with Content Credentials would make them show as invalid, so Edit removes them, or skips those files if you prefer.</li>
          </ul>
        ),
      },
    ],
    faqs: [
      {
        q: "How do I add copyright information to a photo?",
        a: "Open Edit, add the photo, type your name in Creator and your notice in Copyright notice, then choose Write. Download the edited file; the copyright is stored in its XMP metadata.",
      },
      {
        q: "Does editing metadata change the image quality?",
        a: "No. Edit only replaces the XMP block. The compressed image data is copied unchanged and verified with a SHA-256 hash.",
      },
      {
        q: "Can I add the same copyright to many photos?",
        a: "Yes. Add all the photos, fill in the fields once, and write to every file in one go. Download them together as a ZIP.",
      },
    ],
    related: ["clean", "inspect", "compare"],
    features: ["Lossless XMP editing", "Batch copyright and creator", "Title, description and keywords"],
  },

  compare: {
    heading: "Compare the metadata of two images",
    intro: [
      "Compare puts two files side by side and lists every field that differs, every field only one of them has, and every metadata block. It also compares a SHA-256 hash of each file's image data, so you can prove two files hold exactly the same picture even when their metadata and file sizes differ.",
    ],
    stepsHeading: "How to compare two images",
    steps: [
      { title: "Add two files", text: "Drop one file on A and one on B, or drop both at once on A." },
      { title: "Read the image data result", text: "Identical means the compressed picture is byte for byte the same." },
      { title: "Review the differences", text: "See differing blocks and fields, or switch to all fields." },
    ],
    sections: [
      {
        heading: "When it is useful",
        body: (
          <ul>
            <li>Confirm a cleaned copy holds the same image as the original.</li>
            <li>See what an app or website changed when it saved or exported your photo.</li>
            <li>Find which of two similar files still contains a location.</li>
            <li>Check whether a “re-saved” image was actually re-compressed.</li>
          </ul>
        ),
      },
    ],
    faqs: [
      {
        q: "How do I know two images are identical?",
        a: "Compare hashes the image data of both files. If the hashes match, the compressed picture is byte for byte the same, even if the metadata differs.",
      },
      {
        q: "What does “Image data differs” mean?",
        a: "The pictures were encoded differently: re-compressed, resized, edited or saved by another program. They may look alike but are not the same bytes.",
      },
      {
        q: "Can I compare a JPEG with a PNG?",
        a: "Yes for metadata fields and blocks. Image data can only be compared byte for byte between files of the same format.",
      },
    ],
    related: ["inspect", "clean", "check"],
    features: ["Metadata diff", "Block comparison", "Image data hash comparison"],
  },

  compress: {
    heading: "Compress JPEG, PNG, WebP and AVIF images",
    intro: [
      "Compress makes images smaller with the encoders image-optimisation tools rely on: MozJPEG for JPEG, libwebp for WebP, libavif for AVIF and OxiPNG for lossless PNG. A before-and-after slider shows the result and its size as you move the quality setting.",
      "Target size mode answers the common upload-form question: “make it under 200 KB”. It finds the highest quality that fits, and only reduces the dimensions if quality alone cannot get there. Everything runs on your device.",
    ],
    stepsHeading: "How to compress an image",
    steps: [
      { title: "Add images", text: "JPEG, PNG, WebP, AVIF, HEIC, GIF or BMP, one or many." },
      { title: "Choose quality or a target size", text: "Pick a format and a quality, or switch to Target size and enter a limit in KB." },
      { title: "Compare and download", text: "Drag the preview slider, then compress all files and download them or a ZIP." },
    ],
    sections: [
      {
        heading: "Which format should I choose?",
        body: (
          <Table
            head={["Format", "Best for"]}
            rows={[
              ["JPEG", "Photos that must open everywhere. Quality 75 to 85 is a good balance."],
              ["WebP", "Photos and graphics for the web; usually smaller than JPEG at the same quality."],
              ["AVIF", "The smallest files at a given quality; slower to encode."],
              ["PNG", "Screenshots, text and graphics with sharp edges or transparency. Lossless."],
            ]}
          />
        ),
      },
      {
        heading: "Good to know",
        body: (
          <p>
            Compression re-encodes the image, so it is marked <strong>Re-encodes image</strong>. Metadata is removed and the orientation is applied to the
            pixels. Colours are converted to sRGB, so wide-gamut photos lose their extra range. See the guide on{" "}
            <Link href="/guides/compress-image-to-size/">compressing an image to a size limit</Link>.
          </p>
        ),
      },
    ],
    faqs: [
      {
        q: "How do I compress an image to under 100 KB?",
        a: "Open Compress, add the image, choose Target size and enter 100 KB. Exifo lowers the quality until the file fits, and reduces the dimensions only if it has to. The result shows the final size and quality.",
      },
      {
        q: "What quality setting should I use for photos?",
        a: "For JPEG, 75 to 85 keeps photos looking sharp at a much smaller size. Use the before-and-after slider to check fine detail such as text and hair.",
      },
      {
        q: "Why did my PNG barely get smaller?",
        a: "PNG is lossless, so OxiPNG can only find a better encoding of the same pixels. For photos saved as PNG, converting to JPEG or WebP saves far more.",
      },
      {
        q: "Are my images uploaded to compress them?",
        a: "No. The encoders run in your browser as WebAssembly. Your images never leave your device.",
      },
    ],
    related: ["convert", "resize", "clean"],
    features: ["MozJPEG compression", "WebP and AVIF encoding", "OxiPNG lossless optimisation", "Target file size mode", "Before and after preview"],
  },

  convert: {
    heading: "Convert HEIC to JPG, and between JPEG, PNG, WebP and AVIF",
    intro: [
      "Convert changes image formats in your browser. It opens HEIC and HEIF photos from iPhones, AVIF, WebP, PNG, JPEG, GIF and BMP, and writes JPEG, PNG, WebP or AVIF. HEIC photos are decoded on your device, so private photos never need to be uploaded to a conversion site.",
    ],
    stepsHeading: "How to convert HEIC to JPG",
    steps: [
      { title: "Add photos", text: "Drop HEIC files straight from an iPhone, or any supported image." },
      { title: "Pick the output", text: "Choose JPEG, PNG, WebP or AVIF and a quality. For JPEG, pick a background for transparent areas." },
      { title: "Convert and download", text: "Convert all files, then download each one or a ZIP." },
    ],
    sections: [
      {
        heading: "Supported formats",
        body: (
          <Table
            head={["", "Formats"]}
            rows={[
              ["Opens", "HEIC, HEIF, JPEG, PNG, WebP, AVIF, GIF (first frame), BMP"],
              ["Saves", "JPEG, PNG, WebP (lossy or lossless), AVIF (lossy or lossless)"],
            ]}
          />
        ),
      },
    ],
    faqs: [
      {
        q: "How do I convert HEIC to JPG?",
        a: "Open Convert, add your HEIC photos, choose JPEG and select Convert. Download the JPGs one by one or as a ZIP. The conversion happens on your device.",
      },
      {
        q: "Why won't a website accept my HEIC photo?",
        a: "HEIC is the default format on iPhones, but many websites, upload forms and older programs only accept JPEG or PNG. Converting to JPEG makes the photo open everywhere.",
      },
      {
        q: "Does converting keep transparency?",
        a: "PNG, WebP and AVIF keep transparency. JPEG has none, so transparent areas are filled with the background colour you choose, white by default.",
      },
      {
        q: "Can I convert animated GIFs?",
        a: "Convert uses the first frame of an animated GIF. Animation is not carried over.",
      },
    ],
    related: ["compress", "resize", "pdf"],
    features: ["HEIC to JPG conversion", "WebP and AVIF output", "Batch conversion", "Transparent background fill"],
  },

  resize: {
    heading: "Resize and crop images to exact sizes",
    intro: [
      "Resize and crop changes image dimensions with high-quality Lanczos resampling. Resize by exact pixels, by percent or by the longest side, crop freely or to a fixed aspect ratio, and use presets for social posts, video thumbnails and passport photos.",
      "Rotating or flipping a JPEG without cropping or resizing is lossless: only the orientation tag changes, and the image data stays exactly as it was.",
    ],
    stepsHeading: "How to resize or crop an image",
    steps: [
      { title: "Add images", text: "One image, or a batch to resize to the same size." },
      { title: "Crop", text: "Drag on the image for a free crop, or pick 1:1, 4:5, 3:2, 16:9 or 9:16." },
      { title: "Choose the size", text: "Pixels, percent, longest side, or a preset. Rotate or flip if needed." },
      { title: "Download", text: "Resize all files and download them, or a ZIP." },
    ],
    sections: [
      {
        heading: "Size presets",
        body: (
          <Table
            head={["Preset", "Size", "Use"]}
            rows={[
              ["Square", "1080 × 1080", "Square social posts"],
              ["Portrait", "1080 × 1350", "4:5 portrait posts"],
              ["Story", "1080 × 1920", "9:16 stories and short-video covers"],
              ["Video thumbnail", "1280 × 720", "16:9 video thumbnails"],
              ["Passport", "413 × 531", "35 × 45 mm at 300 dpi"],
            ]}
          />
        ),
      },
    ],
    faqs: [
      {
        q: "How do I crop a photo to a square?",
        a: "Choose the 1:1 aspect and drag the crop box to the part you want, or pick the Square preset to crop the centre and resize to 1080 × 1080.",
      },
      {
        q: "What size is a passport photo in pixels?",
        a: "A 35 × 45 mm photo at 300 dpi is 413 × 531 pixels, which is what the Passport preset produces. Check your country's rules for head size and background before printing.",
      },
      {
        q: "Does resizing reduce quality?",
        a: "Resizing re-encodes the image. Exifo uses Lanczos resampling and a quality of 92 by default to keep it sharp. Rotating a JPEG without cropping or resizing is lossless.",
      },
      {
        q: "Can I resize many images at once?",
        a: "Yes. Add them all and they are resized with the same settings. A drawn crop applies to the image you drew it on; presets crop each image from its centre.",
      },
    ],
    related: ["compress", "convert", "watermark"],
    features: [
      "Free and fixed-ratio crop",
      "Resize by pixels, percent or longest side",
      "Social and passport presets",
      "Lossless JPEG rotation",
      "Lanczos resampling",
    ],
  },

  watermark: {
    heading: "Add a text or logo watermark to your photos",
    intro: [
      "Watermark adds visible text or your logo to one photo or a whole batch. Place it in any of nine positions or tile it across the image, and set the opacity, size, rotation and margin. The preview updates as you change the settings.",
    ],
    stepsHeading: "How to watermark photos",
    steps: [
      { title: "Add photos", text: "Add every photo that should carry the same watermark." },
      { title: "Choose text or logo", text: "Type your text and pick a colour, or choose a PNG logo with transparency." },
      { title: "Place it", text: "Pick a position or tile it, then adjust opacity, size, rotation and margin." },
      { title: "Watermark all", text: "Apply it to every photo and download them, or a ZIP." },
    ],
    sections: [
      {
        heading: "Tips for a watermark that works",
        body: (
          <ul>
            <li>Place it over detail rather than an empty corner that is easy to crop away, or tile it.</li>
            <li>An opacity of 30 to 60 percent protects the image without hiding it.</li>
            <li>Keep the originals: a watermark cannot be removed cleanly once it is part of the pixels.</li>
          </ul>
        ),
      },
    ],
    faqs: [
      {
        q: "How do I add a watermark to many photos at once?",
        a: "Add all the photos, set up the watermark once on the preview, and select Watermark all. Every photo gets the same watermark, scaled to its size.",
      },
      {
        q: "Can I use my logo as a watermark?",
        a: "Yes. Choose Logo and select a PNG with a transparent background. Its size is set as a percentage of each image's width.",
      },
      {
        q: "Does watermarking remove metadata?",
        a: "Yes. Watermarking re-encodes the image, and the new file is written without the original metadata.",
      },
    ],
    related: ["resize", "compress", "edit"],
    features: ["Text watermarks", "Logo watermarks", "Tiled watermarks", "Batch watermarking"],
  },

  rename: {
    heading: "Batch rename photos by date taken",
    intro: [
      "Rename gives a batch of photos consistent names built from a pattern: the date and time they were taken (from EXIF), the camera make and model, the image size, the original name and a counter. Every new name is previewed before you download, and duplicates are flagged.",
      "Only the names change. File contents, including metadata, are copied as they are into a ZIP.",
    ],
    stepsHeading: "How to rename photos by date",
    steps: [
      { title: "Add photos", text: "Add the photos you want to rename, in any order." },
      { title: "Write a pattern", text: "Insert tokens such as {date} and {n}, and set where the counter starts." },
      { title: "Download", text: "Check the preview, then download the renamed files as a ZIP." },
    ],
    sections: [
      {
        heading: "Pattern tokens",
        body: (
          <Table
            head={["Token", "Becomes", "Example"]}
            rows={[
              [code("{date}"), "Date taken (or file date)", "2026-08-14"],
              [code("{time}"), "Time taken", "17-42-09"],
              [code("{n}"), "Counter with padding", "001"],
              [code("{name}"), "Original name", "IMG_4821"],
              [code("{make}"), "Camera make", "Apple"],
              [code("{model}"), "Camera model", "iPhone 15"],
              [code("{width}"), "Width in pixels", "4032"],
              [code("{height}"), "Height in pixels", "3024"],
            ]}
          />
        ),
      },
    ],
    faqs: [
      {
        q: "How do I rename photos by the date they were taken?",
        a: "Open Rename, add your photos and use the pattern {date}_{n}. Each file is named from its EXIF date taken plus a counter, for example 2026-08-14_001.jpg.",
      },
      {
        q: "What if a photo has no date taken?",
        a: "Then {date} and {time} use the file's last-modified date. Exifo tells you how many files have no EXIF date.",
      },
      {
        q: "Are the files changed?",
        a: "No. Only the names change; the contents are copied into the ZIP as they are.",
      },
    ],
    related: ["inspect", "pdf", "clean"],
    features: ["Rename by EXIF date taken", "Pattern tokens", "Duplicate detection", "ZIP download"],
  },

  pdf: {
    heading: "Combine images into a PDF",
    intro: [
      "Images to PDF puts your images on pages, one image per page, in the order you choose. JPEG files are embedded exactly as they are, with no re-encoding, so the PDF keeps their full quality. PNG files are embedded losslessly, and other formats, including HEIC, are converted to PNG first.",
    ],
    stepsHeading: "How to combine photos into one PDF",
    steps: [
      { title: "Add images", text: "JPEG, PNG, WebP, AVIF, HEIC, GIF or BMP." },
      { title: "Order the pages", text: "Drag the rows, or use the arrow buttons, to set the page order." },
      { title: "Choose the layout", text: "A4, Letter or fit to image, portrait or landscape, and margins." },
      { title: "Create the PDF", text: "The PDF downloads straight away." },
    ],
    sections: [
      {
        heading: "Quality and privacy",
        body: (
          <ul>
            <li>JPEGs are not re-compressed, and photos are rotated on the page to match their orientation.</li>
            <li>Metadata such as GPS is removed from each image before it goes into the PDF. You can turn this off.</li>
            <li>The PDF itself carries no personal metadata; it only names Exifo as the producer.</li>
          </ul>
        ),
      },
    ],
    faqs: [
      {
        q: "How do I combine several photos into one PDF?",
        a: "Open Images to PDF, add the photos, drag them into order, pick a page size and select Create PDF. All pages are in one file.",
      },
      {
        q: "Will the PDF reduce the quality of my photos?",
        a: "No for JPEG and PNG: JPEGs are embedded as they are and PNGs losslessly. Other formats are converted to lossless PNG.",
      },
      {
        q: "Can I use iPhone HEIC photos?",
        a: "Yes. HEIC photos are decoded on your device and embedded losslessly.",
      },
    ],
    related: ["convert", "compress", "resize"],
    features: ["JPEG embedded without re-encoding", "Drag to reorder pages", "A4, Letter or fit to image", "Metadata removed by default"],
  },
};
