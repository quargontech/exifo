import type { Faq } from "@/lib/seo";

export interface FaqGroup {
  id: string;
  title: string;
  faqs: Faq[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: "privacy",
    title: "Privacy and safety",
    faqs: [
      {
        q: "Are my photos uploaded to a server?",
        a: "No. Every tool runs in your browser. Files are read, cleaned, converted and compressed on your device, and there is no server-side code that could receive them.",
      },
      {
        q: "Does Exifo work offline?",
        a: "Yes. After your first visit the app is stored by your browser, so the tools keep working without a connection. Image codecs are stored the first time a tool uses them.",
      },
      {
        q: "Does Exifo track me or keep my files?",
        a: "There are no accounts, no tracking cookies and no analytics scripts. Files exist only in the open tab and are gone when you close or reload it. Only your light or dark theme choice is remembered.",
      },
      {
        q: "Is it safe to use Exifo on private photos?",
        a: "Yes. Because nothing is uploaded, private photos stay on your device. The only optional network request involving a photo is a map, which is loaded from OpenStreetMap only if you ask to see a photo's location.",
      },
    ],
  },
  {
    id: "cleaning",
    title: "Removing metadata",
    faqs: [
      {
        q: "Does removing metadata reduce image quality?",
        a: "No. Exifo copies the compressed image data byte for byte and leaves the metadata blocks out. Nothing is decoded or re-saved, so there is no quality loss and the colour profile is kept.",
      },
      {
        q: "How does Exifo prove the image did not change?",
        a: "Before you can download a cleaned file, Exifo compares a SHA-256 hash of its image data with the original's. If they differ, the file is discarded and you see an error. You can also compare the decoded pixels, or check any two files with Compare.",
      },
      {
        q: "Which file formats can be cleaned?",
        a: "JPEG, PNG and WebP, including animated PNG and animated WebP. HEIC and AVIF cannot be cleaned losslessly yet; convert them to JPEG first.",
      },
      {
        q: "What metadata does Exifo remove?",
        a: "EXIF (including GPS location, camera, serial numbers and dates), XMP, IPTC, Content Credentials (C2PA), PNG text such as AI generator prompts, comments, embedded thumbnails and data after the end of the image. You can choose exactly which blocks to remove.",
      },
      {
        q: "Can I remove only the location and keep everything else?",
        a: "Yes. In Clean, choose Custom and the Location only preset, or use Remove location in Inspect. The GPS data is removed from inside the EXIF block, and any location in XMP is removed too.",
      },
      {
        q: "What happens to HDR photos and motion photos?",
        a: "Some phones store an HDR gain map or a short video after the main JPEG. When other metadata is removed these extra images are removed too, because the index pointing to them would break. The main image is unchanged.",
      },
    ],
  },
  {
    id: "ai",
    title: "AI and provenance",
    faqs: [
      {
        q: "Can Exifo tell whether an image is AI-generated?",
        a: "It can tell you what the file says about itself: Content Credentials, the IPTC digital source type and generator prompts. That is evidence, not proof. Missing metadata does not mean an image is real, and only a valid signed manifest is strong evidence.",
      },
      {
        q: "Does removing metadata remove AI watermarks?",
        a: "No. Invisible watermarks such as SynthID are part of the pixels, not metadata, and visible watermarks are part of the picture. Exifo removes metadata only, and a cleaned image is not undetectable.",
      },
      {
        q: "Is it legal to remove Content Credentials?",
        a: "It depends on where you are and how you publish. Some rules, such as India's IT Amendment Rules, 2026, and the transparency duties in the EU AI Act, require AI-generated content to stay labelled. You are responsible for following platform rules and local law, and must not use Exifo to pass off synthetic media as real.",
      },
    ],
  },
  {
    id: "tools",
    title: "Image tools",
    faqs: [
      {
        q: "Which tools change the image itself?",
        a: "Compress, Convert, Resize and crop, and Watermark re-encode the image and are marked “Re-encodes image”. Clean, Inspect, Check, Edit, Compare and Rename never change the image data. Images to PDF embeds JPEG and PNG without re-encoding.",
      },
      {
        q: "Can I convert iPhone HEIC photos to JPG?",
        a: "Yes. Convert opens HEIC photos and saves them as JPEG, PNG, WebP or AVIF, decoding them on your device.",
      },
      {
        q: "Can I make an image smaller than a size limit, like 100 KB?",
        a: "Yes. In Compress, choose Target size and enter the limit. Exifo lowers the quality until the file fits, and reduces the dimensions only if it has to.",
      },
      {
        q: "Are there file size or file count limits?",
        a: "Each file can be up to 50 MB, and up to 50 files can be processed at a time.",
      },
    ],
  },
  {
    id: "general",
    title: "General",
    faqs: [
      {
        q: "Is Exifo free?",
        a: "Yes. All the tools are free to use and need no account. Exifo adds nothing to your images.",
      },
      {
        q: "Which browsers and devices are supported?",
        a: "Current versions of Chrome, Edge, Firefox and Safari on desktop and mobile. Exifo needs JavaScript, Web Workers and WebAssembly, which all modern browsers support. You can also install it as an app.",
      },
    ],
  },
];

/** A short selection for the home page. */
export const HOME_FAQS: Faq[] = [
  FAQ_GROUPS[0].faqs[0],
  FAQ_GROUPS[1].faqs[0],
  FAQ_GROUPS[1].faqs[2],
  FAQ_GROUPS[2].faqs[0],
  FAQ_GROUPS[2].faqs[1],
  FAQ_GROUPS[4].faqs[0],
];
