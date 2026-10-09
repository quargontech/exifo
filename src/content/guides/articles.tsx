import Link from "next/link";
import type { ReactNode } from "react";

const Table = ({ head, rows }: { head: string[]; rows: ReactNode[][] }) => (
  <div className="overflow-x-auto rounded-xl border border-line bg-surface">
    <table className="w-full min-w-[460px] border-collapse text-left text-sm">
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

const Note = ({ children }: { children: ReactNode }) => (
  <div className="rounded-xl bg-proof-tint px-4 py-3.5 text-[15px] leading-[1.6] text-ink">{children}</div>
);

export const ARTICLES: Record<string, () => ReactNode> = {
  "what-is-exif-data": () => (
    <>
      <p>
        When a phone or camera saves a photo, it writes more than the picture. Alongside the image it stores a block of facts about how the photo was taken: the
        device, the settings, the date and time, and often the place. That block is called EXIF, and it travels with the file wherever you send it.
      </p>

      <h2>What EXIF stands for</h2>
      <p>
        EXIF is short for Exchangeable Image File Format, a standard from the camera industry first published in the 1990s and now maintained by the Japanese
        industry bodies CIPA and JEITA. Almost every digital camera and phone writes it into JPEG photos, and it can also be stored in PNG, WebP, HEIC and TIFF
        files.
      </p>

      <h2>What EXIF can contain</h2>
      <Table
        head={["Field", "What it records"]}
        rows={[
          ["Make and Model", "The camera or phone, for example the brand and model name."],
          ["DateTimeOriginal", "The date and time the photo was taken, often with the time zone offset."],
          ["GPSLatitude, GPSLongitude", "Where the photo was taken, usually accurate to a few metres. Often with altitude and direction."],
          ["ExposureTime, FNumber, ISO", "Shutter speed, aperture and sensitivity."],
          ["LensModel, FocalLength", "The lens and the focal length used."],
          ["Software", "The app or firmware that saved the file, such as a camera version or an editor."],
          ["BodySerialNumber", "On many cameras, a serial number that links every photo to one device."],
          ["Orientation", "Which way up to display the photo. Removing it can make photos appear sideways."],
          ["Thumbnail", "A small preview image that is not always updated when the photo is edited."],
        ]}
      />

      <h2>EXIF is not the only metadata</h2>
      <p>A photo can carry several other blocks next to EXIF:</p>
      <ul>
        <li>
          <strong>XMP</strong>, an XML format introduced by Adobe, stores edit history, ratings, keywords, rights, and the IPTC digital source type that marks
          AI-generated images.
        </li>
        <li>
          <strong>IPTC-IIM</strong>, an older newsroom standard, holds captions, bylines, credit lines and keywords.
        </li>
        <li>
          <strong>Content Credentials (C2PA)</strong> are signed records of where an image came from and how it was edited. See{" "}
          <Link href="/guides/what-are-content-credentials/">what Content Credentials are</Link>.
        </li>
        <li>
          <strong>PNG text chunks</strong> can hold anything an app chooses, including the full prompt and settings of AI image generators. See{" "}
          <Link href="/guides/ai-prompts-in-png-metadata/">AI prompts in PNG files</Link>.
        </li>
        <li>
          <strong>A colour (ICC) profile</strong> describes how to display the colours. It contains nothing personal and should be kept.
        </li>
      </ul>

      <h2>Why it matters</h2>
      <p>
        Most of this data is useful: it lets photo apps sort by date, map your holidays and show camera settings. The problem is that it leaves with the file. A
        photo of a sale item can reveal your home address; a photo sent to a stranger can show which phone you use and when you are usually at a place. Many
        large social networks remove most metadata from the copies they publish, but files sent as email attachments, as documents in messaging apps, through
        cloud links, or uploaded to websites and marketplaces often keep it.
      </p>

      <h2>How to see a photo&apos;s metadata</h2>
      <ul>
        <li>
          <strong>Any browser:</strong> drop the photo into <Link href="/inspect/">Exifo Inspect</Link>. It lists every EXIF, GPS, XMP and IPTC field and the
          file&apos;s full structure, without uploading the photo.
        </li>
        <li>
          <strong>Windows:</strong> right-click the file, choose Properties, then the Details tab.
        </li>
        <li>
          <strong>Mac:</strong> open the photo in Preview and choose Tools, then Show Inspector.
        </li>
        <li>
          <strong>iPhone:</strong> open the photo in Photos and swipe up, or tap the info button, to see the date, camera and location.
        </li>
      </ul>

      <h2>How to remove it</h2>
      <p>
        To remove metadata without re-compressing the photo, use <Link href="/clean/">Exifo Clean</Link>: it copies the image data byte for byte and leaves the
        metadata out. To remove only the location and keep the rest, follow{" "}
        <Link href="/guides/remove-location-from-photos/">how to remove location data from photos</Link>.
      </p>
    </>
  ),

  "remove-exif-data": () => (
    <>
      <p>
        Removing EXIF data is the simplest way to stop a photo from revealing where it was taken, which device took it, and when. The catch is that many tools
        do it by opening the photo and saving it again, which re-compresses the image and can lose quality and colour accuracy. This guide shows how to remove
        the metadata and keep every pixel.
      </p>

      <h2>Re-saving versus removing</h2>
      <p>
        A JPEG is compressed. When a program opens it and saves a new JPEG, it compresses the picture again, and each round loses a little detail. Some tools
        also drop the colour profile, so colours shift on wide-gamut screens. A lossless tool never decodes the picture. It reads the file&apos;s structure,
        copies the blocks that hold the image exactly as they are, and leaves out the metadata blocks. The image you get back is bit-for-bit the image you put
        in.
      </p>

      <h2>Remove EXIF data with Exifo Clean</h2>
      <ol>
        <li>
          Open <Link href="/clean/">Clean</Link>. Everything runs in your browser; nothing is uploaded.
        </li>
        <li>Drop your photos on the page, paste one from the clipboard, or browse. JPEG, PNG and WebP are supported, up to 50 files at a time.</li>
        <li>Each file shows the blocks it contains, such as EXIF, XMP and Content Credentials, with their sizes. Expand the report to see the values.</li>
        <li>
          Keep <strong>Remove everything</strong> selected, or choose <strong>Custom</strong> to keep some blocks.
        </li>
        <li>
          Select <strong>Clean all</strong>. Each file shows the bytes removed and an <strong>Image data identical</strong> badge.
        </li>
        <li>Download the files one by one, or all of them as a ZIP.</li>
      </ol>
      <Note>
        Clean keeps the colour profile and writes back the orientation as a tiny block, so photos still appear the right way up. You can switch orientation off
        too.
      </Note>

      <h2>Keep some metadata</h2>
      <p>Choose Custom to remove only part of it. The presets cover the usual cases:</p>
      <ul>
        <li>
          <strong>Location only</strong> removes GPS and keeps the camera details and dates.
        </li>
        <li>
          <strong>Device details</strong> removes make, model, serial numbers and maker notes.
        </li>
        <li>
          <strong>Dates</strong> removes when the photo was taken and edited.
        </li>
        <li>
          <strong>Keep copyright only</strong> removes everything, then writes back your name and copyright notice.
        </li>
      </ul>

      <h2>Check the result</h2>
      <p>
        Open a cleaned file in <Link href="/inspect/">Inspect</Link> to confirm that no metadata is left, or put the original and the cleaned copy side by side
        in <Link href="/compare/">Compare</Link>, which confirms the image data is identical while the metadata differs.
      </p>

      <h2>Other ways to remove EXIF</h2>
      <ul>
        <li>
          <strong>Windows:</strong> File Properties, Details tab, then <em>Remove Properties and Personal Information</em>.
        </li>
        <li>
          <strong>Mac:</strong> in Preview, Tools, Show Inspector, the location tab offers <em>Remove Location Info</em>.
        </li>
        <li>
          <strong>iPhone:</strong> when sharing, tap Options at the top of the share sheet and turn off Location.
        </li>
      </ul>
      <p>
        These built-in options often handle only some fields, and do not show you what was there. A dedicated tool lets you see every block first and confirms
        nothing else changed.
      </p>
    </>
  ),

  "remove-location-from-photos": () => (
    <>
      <p>
        Photos taken on a phone usually record exactly where they were taken. That is handy for your own albums, but when you send the original file to someone,
        post it on a marketplace or attach it to an email, the location goes with it. Here is how to check for it, remove only the location, and stop your
        camera adding it in future.
      </p>

      <h2>How location gets into a photo</h2>
      <p>
        When location access is allowed, the camera app saves GPS coordinates in the photo&apos;s EXIF metadata, often with altitude and the direction you were
        facing. Some apps also copy the location into the XMP block. The coordinates are typically accurate to a few metres, enough to identify a building.
      </p>

      <h2>Check whether a photo has a location</h2>
      <ol>
        <li>
          Open <Link href="/inspect/">Inspect</Link> and drop the photo on the page.
        </li>
        <li>
          If a location is present, you will see a GPS group with the badge <strong>This photo contains a location</strong>, and the coordinates.
        </li>
        <li>
          To see the place on a map, choose <strong>Show map</strong> or <strong>Open in OpenStreetMap</strong>. Maps are only loaded when you ask, because
          loading map tiles tells the map provider roughly where the photo was taken.
        </li>
      </ol>

      <h2>Remove only the location</h2>
      <p>
        In Inspect, select <strong>Remove location</strong> to download a copy without the GPS data. For many photos at once, open{" "}
        <Link href="/clean/">Clean</Link>, choose <strong>Custom</strong> and the <strong>Location only</strong> preset, then <strong>Clean all</strong>.
      </p>
      <p>
        Exifo removes the GPS entries from inside the EXIF block without changing its size, so the rest of the metadata, such as the date and camera settings,
        stays readable. Any location stored in XMP is removed as well. The image data is copied unchanged.
      </p>

      <h2>Stop your camera saving the location</h2>
      <ul>
        <li>
          <strong>iPhone:</strong> Settings, Privacy &amp; Security, Location Services, Camera, then Never. When sharing a single photo, you can also tap
          Options in the share sheet and turn off Location.
        </li>
        <li>
          <strong>Android:</strong> open the camera app&apos;s settings and turn off the option to save or tag location. The name varies by manufacturer.
        </li>
      </ul>

      <h2>Location can hide elsewhere</h2>
      <ul>
        <li>IPTC and XMP can hold a city, region and country as text. Use Remove everything if you want those gone too.</li>
        <li>The picture itself can give a place away: street signs, house numbers, landmarks and the view from a window.</li>
      </ul>
    </>
  ),

  "what-are-content-credentials": () => (
    <>
      <p>
        Content Credentials are a signed record, stored inside a file, of where a piece of content came from and what has been done to it. They are built on an
        open standard from the Coalition for Content Provenance and Authenticity (C2PA), a group founded in 2021 by companies including Adobe, Arm, the BBC,
        Intel, Microsoft and Truepic. You may see them shown as a small <strong>CR</strong> icon on images.
      </p>

      <h2>What a manifest records</h2>
      <p>The record is called a manifest. It is made of statements, called assertions, such as:</p>
      <ul>
        <li>
          <strong>Actions:</strong> created, opened, edited, cropped, resized, and the software that did each one.
        </li>
        <li>
          <strong>Digital source type:</strong> whether the content was captured by a camera or made with a generative model, using IPTC terms such as{" "}
          <code>trainedAlgorithmicMedia</code>.
        </li>
        <li>
          <strong>Ingredients:</strong> earlier files the image was made from, each possibly with its own manifest.
        </li>
        <li>
          <strong>A hash of the content</strong>, so any later change to the image can be detected.
        </li>
      </ul>
      <p>
        The manifest is signed with a certificate, much like a website&apos;s HTTPS certificate. Anyone can check that the signature is valid and that the image
        has not changed since it was signed. A file can carry several manifests, one for each step in its history.
      </p>

      <h2>Where it is stored</h2>
      <Table
        head={["Format", "Where the manifest lives"]}
        rows={[
          ["JPEG", "APP11 segments holding a JUMBF box"],
          ["PNG", "A caBX chunk"],
          ["WebP", "A C2PA chunk"],
        ]}
      />
      <p>Manifests can also be stored online and linked from the file.</p>

      <h2>Who adds Content Credentials</h2>
      <p>
        Adobe&apos;s Photoshop and Firefly can add them, as do several AI image generators, including OpenAI&apos;s. A growing number of cameras and phones sign
        photos at capture, and some news organisations and platforms display them.
      </p>

      <h2>What they can and cannot prove</h2>
      <ul>
        <li>
          A valid signature proves who signed the manifest and that the image has not changed since. It is the strongest provenance evidence a file can carry.
        </li>
        <li>It does not prove that what the picture shows is true. A signer can only vouch for what their software saw.</li>
        <li>
          Manifests can be removed. A file without Content Credentials is not proof of anything. Some systems pair them with invisible watermarks or
          fingerprints so they can be recovered.
        </li>
        <li>Editing a file after signing, even only its other metadata, makes the signature fail its hash check.</li>
      </ul>

      <h2>How to read them</h2>
      <p>
        Drop an image into <Link href="/check/">Exifo Check</Link>. It shows the generating tool, the signer, the signing time and the recorded actions, and
        verifies the signature in your browser with the official C2PA SDK. It also tells you whether the manifest marks the image as AI-generated or AI-edited.
      </p>

      <h2>Removing Content Credentials</h2>
      <p>
        <Link href="/clean/">Clean</Link> can remove Content Credentials along with other metadata, for example to protect a photographer&apos;s identity. But
        they often exist to disclose that content was made with AI, and some rules require that disclosure to stay. India&apos;s IT Amendment Rules, 2026,
        prohibit removing AI labels and provenance metadata, and the EU AI Act sets transparency duties for AI-generated content. Check the rules that apply to
        you, and never use metadata removal to pass off synthetic media as real.
      </p>
    </>
  ),

  "check-if-image-is-ai-generated": () => (
    <>
      <p>
        There is no single test that proves whether an image was made by AI. But an image file can say a lot about its own origin, if you know where to look.
        This guide covers the three kinds of evidence metadata can hold, how strong each one is, and how to read them in seconds.
      </p>

      <h2>1. Content Credentials (C2PA)</h2>
      <p>
        Signed Content Credentials are the strongest evidence. If an AI tool signed a manifest saying it created the image, and the signature is valid, you know
        which tool made it and that the file has not been changed since. Read more in{" "}
        <Link href="/guides/what-are-content-credentials/">what Content Credentials are</Link>.
      </p>

      <h2>2. The IPTC digital source type</h2>
      <p>The IPTC, the standards body for news media, defines terms that say how an image was made. Several generators write them into the XMP metadata:</p>
      <Table
        head={["Term", "Meaning"]}
        rows={[
          [<code key="a">trainedAlgorithmicMedia</code>, "Created by a model trained on sampled content (most AI image generators)"],
          [<code key="b">compositeWithTrainedAlgorithmicMedia</code>, "A composite that includes AI-generated elements, such as generative fill"],
          [<code key="c">algorithmicMedia</code>, "Created purely by an algorithm, without sampled training data"],
          [<code key="d">digitalCapture</code>, "Captured by a camera"],
        ]}
      />
      <p>Unlike a signed manifest, this label is plain text. It can be added, changed or removed by anyone, so treat it as a claim rather than proof.</p>

      <h2>3. Generator settings and software names</h2>
      <p>
        Local image generators often save their settings in the file. Stable Diffusion web interfaces write a <code>parameters</code> text chunk with the
        prompt, seed and sampler; ComfyUI saves its whole <code>prompt</code> and <code>workflow</code>. Some tools also name themselves in the Software or
        Creator Tool field. See <Link href="/guides/ai-prompts-in-png-metadata/">why AI images can contain your prompt</Link>.
      </p>

      <h2>Check an image in seconds</h2>
      <ol>
        <li>
          Open <Link href="/check/">Exifo Check</Link> and drop the image. Nothing is uploaded.
        </li>
        <li>
          Read the verdict: <strong>Marked as AI-generated</strong>, <strong>Marked as AI-edited</strong>,{" "}
          <strong>Has Content Credentials, no AI marker</strong>, or <strong>No provenance data found</strong>.
        </li>
        <li>Look at the details: the generating tool, who signed it and when, the recorded actions, whether the signature is valid, and any prompt found.</li>
      </ol>

      <h2>The limits of metadata</h2>
      <ul>
        <li>Screenshots, many apps and most social networks remove metadata, so its absence means nothing.</li>
        <li>Unsigned labels can be faked in either direction.</li>
        <li>
          Invisible watermarks such as Google&apos;s SynthID live in the pixels, not the metadata, and can only be detected with the maker&apos;s own tools.
          Exifo does not look for them.
        </li>
        <li>AI-detection classifiers estimate probabilities and can be wrong; Exifo does not use one.</li>
      </ul>
      <Note>
        A valid signed manifest is the only strong evidence. Everything else is a clue to weigh alongside the source of the image, its context, and a reverse
        image search.
      </Note>
    </>
  ),

  "ai-prompts-in-png-metadata": () => (
    <>
      <p>
        If you generate images with Stable Diffusion, ComfyUI or similar tools, the PNG files they save often contain your prompt, the negative prompt, the seed
        and every setting needed to recreate the image. Anyone you send the original file to can read it. Sometimes that is what you want; often it is not.
      </p>

      <h2>What different tools save</h2>
      <Table
        head={["Tool", "Where", "What"]}
        rows={[
          [
            "Stable Diffusion web UIs (AUTOMATIC1111, Forge)",
            <code key="a">parameters</code>,
            "Prompt, negative prompt, steps, sampler, CFG scale, seed, size and model hash",
          ],
          [
            "ComfyUI",
            <span key="b">
              <code>prompt</code>, <code>workflow</code>
            </span>,
            "The full node graph as JSON, including models, LoRAs, seeds and sometimes file names",
          ],
          [
            "NovelAI",
            <span key="c">
              <code>Description</code>, <code>Comment</code>
            </span>,
            "The prompt and a JSON block of generation settings",
          ],
          ["InvokeAI", <code key="d">invokeai_metadata</code>, "Prompt, model and generation settings"],
        ]}
      />
      <p>
        These live in PNG text chunks (<code>tEXt</code>, <code>zTXt</code> or <code>iTXt</code>). When the same tools save JPEG or WebP, they may put the
        settings in the EXIF UserComment field instead.
      </p>

      <h2>Why it can matter</h2>
      <ul>
        <li>Your prompt and settings are work you may not want to give away.</li>
        <li>A seed and settings let anyone reproduce the image exactly.</li>
        <li>Workflows can include the names of private models, LoRAs and local file paths.</li>
      </ul>

      <h2>How to see the prompt in a PNG</h2>
      <p>
        Drop the file into <Link href="/inspect/">Inspect</Link>. The PNG text group lists every keyword and its full value, with AI-related fields highlighted.{" "}
        <Link href="/check/">Check</Link> shows the prompt it found alongside its provenance verdict.
      </p>

      <h2>How to remove it</h2>
      <p>
        Open <Link href="/clean/">Clean</Link> and add the images. With Remove everything selected, the text chunks are removed along with all other metadata.
        To keep other blocks, choose Custom and leave only <strong>Text and comments</strong> selected. PNG chunks carry their own checksums, so removing whole
        chunks is lossless: the image data is unchanged.
      </p>
      <Note>
        Removing your settings is about privacy, not about hiding that an image is AI-generated. Where platform rules or laws require AI content to be
        disclosed, label it.
      </Note>
    </>
  ),

  "heic-to-jpg": () => (
    <>
      <p>
        iPhones save photos as HEIC by default. The files are about half the size of the equivalent JPEG at similar quality, but many websites, upload forms and
        older programs still do not accept them. Converting to JPG makes a photo open everywhere.
      </p>

      <h2>What HEIC is</h2>
      <p>
        HEIC is a version of the High Efficiency Image File Format (HEIF) that compresses photos with HEVC, the codec used for modern video. Apple made it the
        default camera format in iOS 11, under the name High Efficiency. It also supports features JPEG lacks, such as 10-bit colour and several images in one
        file.
      </p>

      <h2>Convert HEIC to JPG in your browser</h2>
      <ol>
        <li>
          Open <Link href="/convert/">Convert</Link>.
        </li>
        <li>Drop your HEIC photos on the page. You can add many at once.</li>
        <li>
          Choose <strong>JPEG</strong> and a quality. 85 to 90 keeps photos looking the same at a sensible size.
        </li>
        <li>
          Select <strong>Convert to JPEG</strong>, then download the photos one by one or as a ZIP.
        </li>
      </ol>
      <p>The photos are decoded on your device, so private pictures are not uploaded to a conversion website.</p>
      <Note>
        Converted files are new files: the original metadata, including the date taken and the location, is not carried over. If you need the date in the file
        name, rename the originals first with <Link href="/rename/">Rename</Link>.
      </Note>

      <h2>Make your iPhone save JPG instead</h2>
      <ul>
        <li>
          <strong>For new photos:</strong> Settings, Camera, Formats, then Most Compatible.
        </li>
        <li>
          <strong>When copying to a computer:</strong> Settings, Photos, then under Transfer to Mac or PC choose Automatic, which converts to JPEG during
          transfer.
        </li>
      </ul>

      <h2>Other formats</h2>
      <p>
        Convert also opens AVIF, WebP, PNG, GIF and BMP, and saves JPEG, PNG, WebP or AVIF. To make a converted photo smaller still, use{" "}
        <Link href="/compress/">Compress</Link>.
      </p>
    </>
  ),

  "compress-image-to-size": () => (
    <>
      <p>
        Job applications, visa portals and exam forms often reject images above a size such as 100 KB or 200 KB. Getting under the limit is easy; getting under
        it while keeping the photo clear takes a little care. Here is how.
      </p>

      <h2>Two ways to make a file smaller</h2>
      <ul>
        <li>
          <strong>Lower the quality.</strong> JPEG, WebP and AVIF discard detail you are unlikely to notice. Between quality 70 and 85 most photos look almost
          the same at a fraction of the size.
        </li>
        <li>
          <strong>Reduce the dimensions.</strong> Fewer pixels means a smaller file. A 12-megapixel phone photo is far larger than any form needs.
        </li>
      </ul>
      <p>For the best result, reduce the dimensions to what the form actually displays, then use the highest quality that fits.</p>

      <h2>Compress to a target size with Exifo</h2>
      <ol>
        <li>
          Open <Link href="/compress/">Compress</Link> and add the image.
        </li>
        <li>
          Choose <strong>Target size</strong> and enter the limit, or pick 100 KB, 200 KB, 500 KB or 1 MB.
        </li>
        <li>
          Select <strong>Compress all</strong>. Exifo searches for the highest quality that fits, and only reduces the dimensions if quality alone is not
          enough.
        </li>
        <li>Check the size shown next to the file, then download it.</li>
      </ol>

      <h2>A rough guide to dimensions</h2>
      <p>File sizes vary a lot with detail, but for a typical photo saved as JPEG at about quality 75:</p>
      <Table
        head={["Target", "Longest side, roughly"]}
        rows={[
          ["100 KB", "1,000 to 1,400 px"],
          ["200 KB", "1,400 to 2,000 px"],
          ["500 KB", "2,000 to 3,000 px"],
          ["1 MB", "3,000 to 4,000 px"],
        ]}
      />
      <p>
        To set exact dimensions first, use <Link href="/resize/">Resize and crop</Link>, which also has a 413 × 531 px passport preset.
      </p>

      <h2>Tips</h2>
      <ul>
        <li>Crop away anything the form does not need; it saves more than lowering quality.</li>
        <li>If the form accepts WebP or AVIF, they reach the same quality at a smaller size than JPEG.</li>
        <li>For scanned documents with text, keep the quality higher and reduce the dimensions instead.</li>
        <li>Compress from the original each time. Compressing an already compressed file loses detail twice.</li>
        <li>Check the form&apos;s rules for format and pixel dimensions as well as file size.</li>
      </ul>
    </>
  ),
};
