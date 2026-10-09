import {
  CheckCircleIcon,
  CleanIcon,
  CompareIcon,
  CompressIcon,
  ConvertIcon,
  EditIcon,
  InspectIcon,
  PdfIcon,
  RenameIcon,
  ResizeIcon,
  WatermarkIcon,
  type IconComponent,
} from "@/components/icons";

export type ToolId = "clean" | "inspect" | "check" | "edit" | "compare" | "compress" | "convert" | "resize" | "watermark" | "rename" | "pdf";

export interface Tool {
  id: ToolId;
  href: string;
  label: string;
  group: "metadata" | "image";
  title: string;
  subtitle: string;
  /** Title tag for search (the site name is appended). */
  seoTitle: string;
  /** Meta description for search. */
  description: string;
  /** One line for tool cards on the home page and in related links. */
  blurb: string;
  icon: IconComponent;
  lossy?: boolean;
}

export const TOOLS: Tool[] = [
  {
    id: "clean",
    href: "/clean/",
    label: "Clean",
    group: "metadata",
    icon: CleanIcon,
    title: "Clean",
    subtitle: "Remove metadata without touching a single pixel.",
    seoTitle: "Remove EXIF Data and Metadata from Photos, Losslessly",
    description:
      "Remove EXIF, GPS location, XMP, IPTC, Content Credentials and AI prompts from JPEG, PNG and WebP. Free, lossless and private: nothing is uploaded.",
    blurb: "Remove EXIF, GPS, XMP, IPTC and AI data. The image data is copied byte for byte.",
  },
  {
    id: "inspect",
    href: "/inspect/",
    label: "Inspect",
    group: "metadata",
    icon: InspectIcon,
    title: "Inspect",
    subtitle: "View everything inside an image, without changing it.",
    seoTitle: "Online EXIF Viewer: See All Photo Metadata",
    description:
      "Free online EXIF viewer. See every EXIF, GPS, XMP, IPTC, colour profile and PNG text field in an image, plus its file structure. Nothing is uploaded.",
    blurb: "Every field and every block, with location, search and export.",
  },
  {
    id: "check",
    href: "/check/",
    label: "Check",
    group: "metadata",
    icon: CheckCircleIcon,
    title: "Check",
    subtitle: "See what a file says about its own origin.",
    seoTitle: "Check If an Image Is AI-Generated: C2PA and Metadata",
    description:
      "Check an image for Content Credentials (C2PA), IPTC AI source types and Stable Diffusion or ComfyUI prompts. Signatures are verified in your browser.",
    blurb: "Content Credentials, AI source types and generator prompts, with signature checks.",
  },
  {
    id: "edit",
    href: "/edit/",
    label: "Edit",
    group: "metadata",
    icon: EditIcon,
    title: "Edit",
    subtitle: "Add a title, creator and copyright without re-encoding.",
    seoTitle: "Add Copyright and Author to Photos: XMP Editor",
    description:
      "Add a title, description, creator, copyright, credit and keywords to JPEG, PNG and WebP files without re-encoding. Works on one file or a whole batch.",
    blurb: "Write creator, copyright, title and keywords without re-encoding.",
  },
  {
    id: "compare",
    href: "/compare/",
    label: "Compare",
    group: "metadata",
    icon: CompareIcon,
    title: "Compare",
    subtitle: "See how the metadata of two files differs.",
    seoTitle: "Compare Image Metadata: EXIF Diff Tool",
    description: "Compare the metadata of two images side by side and check whether their image data is byte-identical. Free and private, in your browser.",
    blurb: "Diff two files and prove whether their image data is identical.",
  },
  {
    id: "compress",
    href: "/compress/",
    label: "Compress",
    group: "image",
    icon: CompressIcon,
    lossy: true,
    title: "Compress",
    subtitle: "Make images smaller, or fit them under a size limit.",
    seoTitle: "Compress Images to 100 KB, 200 KB or Any Size",
    description:
      "Compress JPEG, PNG, WebP and AVIF images in your browser with MozJPEG and OxiPNG. Set a quality or a target size such as 100 KB. Nothing is uploaded.",
    blurb: "MozJPEG, WebP, AVIF and OxiPNG, with a “make it under X KB” mode.",
  },
  {
    id: "convert",
    href: "/convert/",
    label: "Convert",
    group: "image",
    icon: ConvertIcon,
    lossy: true,
    title: "Convert",
    subtitle: "Change format, including HEIC to JPG.",
    seoTitle: "HEIC to JPG Converter: Convert HEIC, WebP, AVIF and PNG",
    description:
      "Convert HEIC, AVIF, WebP, GIF, BMP, PNG and JPEG to JPG, PNG, WebP or AVIF. Free, private and in batches: photos are converted on your device.",
    blurb: "HEIC to JPG and more: JPEG, PNG, WebP and AVIF out.",
  },
  {
    id: "resize",
    href: "/resize/",
    label: "Resize and crop",
    group: "image",
    icon: ResizeIcon,
    lossy: true,
    title: "Resize and crop",
    subtitle: "Change dimensions, crop, rotate and flip.",
    seoTitle: "Resize and Crop Images Online: Instagram, Story and Passport Sizes",
    description:
      "Resize images by pixels, percent or longest side, crop freely or to 1:1, 4:5 and 9:16, and rotate JPEGs losslessly. Free and private, in your browser.",
    blurb: "Exact sizes, social presets, free crop and lossless JPEG rotation.",
  },
  {
    id: "watermark",
    href: "/watermark/",
    label: "Watermark",
    group: "image",
    icon: WatermarkIcon,
    lossy: true,
    title: "Watermark",
    subtitle: "Add visible text or a logo to your images.",
    seoTitle: "Add a Watermark to Photos: Text or Logo",
    description:
      "Add a text or logo watermark to one photo or a whole batch. Choose position, tiling, opacity, size and rotation. Free and private, in your browser.",
    blurb: "Text or logo, placed or tiled, applied to a whole batch.",
  },
  {
    id: "rename",
    href: "/rename/",
    label: "Rename",
    group: "image",
    icon: RenameIcon,
    title: "Rename",
    subtitle: "Rename files by pattern and the date they were taken.",
    seoTitle: "Batch Rename Photos by Date Taken (EXIF)",
    description: "Batch rename photos with a pattern using the EXIF date taken, camera model, size and a counter. Preview every name, then download a ZIP.",
    blurb: "Name files by date taken, camera and counter. Contents untouched.",
  },
  {
    id: "pdf",
    href: "/pdf/",
    label: "Images to PDF",
    group: "image",
    icon: PdfIcon,
    title: "Images to PDF",
    subtitle: "Combine images into one PDF.",
    seoTitle: "Images to PDF: Combine JPG and PNG into One PDF",
    description:
      "Combine JPG, PNG, WebP and HEIC images into one PDF. Reorder pages, choose A4, Letter or fit to image. JPEGs are embedded without re-encoding.",
    blurb: "Reorder pages and export one PDF. JPEGs embedded as they are.",
  },
];

export const toolById = (id: ToolId) => TOOLS.find((t) => t.id === id)!;
