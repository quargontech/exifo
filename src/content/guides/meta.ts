import type { ToolId } from "@/lib/tools";

export interface GuideMeta {
  slug: string;
  title: string;
  /** Shorter title for cards and the footer. */
  short: string;
  description: string;
  category: "Basics" | "Privacy" | "AI and provenance" | "Formats";
  published: string;
  updated?: string;
  minutes: number;
  /** The tool the guide leads to. */
  tool: ToolId;
}

export const GUIDES: GuideMeta[] = [
  {
    slug: "what-is-exif-data",
    title: "What is EXIF data? A plain guide to photo metadata",
    short: "What is EXIF data?",
    description: "EXIF, XMP, IPTC and the other blocks hidden in your photos: what they contain, who adds them, what they reveal, and how to see them.",
    category: "Basics",
    published: "2026-10-10",
    minutes: 6,
    tool: "inspect",
  },
  {
    slug: "remove-exif-data",
    title: "How to remove EXIF data from photos without losing quality",
    short: "Remove EXIF data from photos",
    description:
      "Step-by-step: strip EXIF, GPS and other metadata from JPEG, PNG and WebP photos without re-compressing them, and check that nothing else changed.",
    category: "Privacy",
    published: "2026-10-10",
    minutes: 5,
    tool: "clean",
  },
  {
    slug: "remove-location-from-photos",
    title: "How to remove location data from photos before you share them",
    short: "Remove location from photos",
    description:
      "Phone photos often carry the exact GPS position where they were taken. How to check for it, remove only the location, and stop your camera adding it.",
    category: "Privacy",
    published: "2026-10-10",
    minutes: 5,
    tool: "inspect",
  },
  {
    slug: "what-are-content-credentials",
    title: "What are Content Credentials (C2PA)?",
    short: "What are Content Credentials?",
    description:
      "Content Credentials are signed records of where an image came from and how it was edited. How C2PA works, where it is stored, and what it can and cannot prove.",
    category: "AI and provenance",
    published: "2026-10-10",
    minutes: 7,
    tool: "check",
  },
  {
    slug: "check-if-image-is-ai-generated",
    title: "How to check if an image is AI-generated from its metadata",
    short: "Check if an image is AI-generated",
    description:
      "What an image's metadata can tell you about AI generation: Content Credentials, IPTC digital source types and generator prompts, and the limits of each.",
    category: "AI and provenance",
    published: "2026-10-10",
    minutes: 6,
    tool: "check",
  },
  {
    slug: "ai-prompts-in-png-metadata",
    title: "Why AI images can contain your prompt, and how to see it",
    short: "AI prompts hidden in PNG files",
    description:
      "Stable Diffusion, ComfyUI and other generators save the prompt, seed and settings inside the PNG. How to read them, and remove them before sharing.",
    category: "AI and provenance",
    published: "2026-10-10",
    minutes: 5,
    tool: "inspect",
  },
  {
    slug: "heic-to-jpg",
    title: "How to convert HEIC photos to JPG",
    short: "Convert HEIC to JPG",
    description: "Why iPhones save HEIC, why some websites reject it, and how to convert HEIC to JPG on any device without uploading your photos.",
    category: "Formats",
    published: "2026-10-10",
    minutes: 4,
    tool: "convert",
  },
  {
    slug: "compress-image-to-size",
    title: "How to compress an image to under 100 KB, 200 KB or 1 MB",
    short: "Compress an image to a size",
    description:
      "Upload forms often set a file size limit. How to make a photo small enough while keeping it readable, and when to resize instead of lowering quality.",
    category: "Formats",
    published: "2026-10-10",
    minutes: 5,
    tool: "compress",
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
export const guidesForTool = (tool: ToolId) => GUIDES.filter((g) => g.tool === tool);
