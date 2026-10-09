# exifo-core

Lossless metadata removal for JPEG, PNG and WebP, from the [Exifo](https://exifo.app) web app.

- **Lossless.** The compressed image data is copied byte for byte. Nothing is decoded or re-encoded.
- **Verified.** Every clean compares a SHA-256 of the image data before and after, and refuses to return a file if they differ.
- **Zero dependencies.** Runs in browsers, Web Workers and Node 20+.

It finds and removes Content Credentials (C2PA), XMP, EXIF (including GPS), IPTC, PNG text chunks (Stable Diffusion and ComfyUI prompts), comments, thumbnails and trailing data. Colour profiles, transparency, animation and the Adobe colour-transform block are always kept, and the orientation is written back as a 36-byte block so the image still displays the right way up.

## Install

```sh
npm install exifo-core
```

## Clean a file

```js
import { strip } from "exifo-core";
import { readFile, writeFile } from "node:fs/promises";

const input = new Uint8Array(await readFile("photo.jpg"));
const result = await strip(input); // removes everything, keeps orientation
console.log(
  result.removed.map((b) => b.label),
  result.bytesBefore,
  "→",
  result.bytesAfter,
);
await writeFile("photo-clean.jpg", new Uint8Array(result.output));
```

`strip` throws an `ExifoError` with `code` `"damaged"` (truncated or corrupt file), `"unsupported"` (not JPEG, PNG or WebP), `"variant"` (unknown critical PNG chunk) or `"unsafe"` (verification failed). It never returns a partial file.

## Choose what to remove

```js
await strip(input, {
  remove: ["c2pa", "xmp", "text", "comment"], // keep EXIF and IPTC
  keepOrientation: true,
  exifEdits: { gps: true, device: true }, // in-place: remove location and serial numbers from the kept EXIF
});
```

Block kinds: `c2pa`, `xmp`, `exif`, `iptc`, `text`, `comment`, `thumbnail`, `mpf`, `trailer`, `unknown`.

In-place EXIF edits (`gps`, `device`, `dates`, `thumbnail`) remove entries from their IFD and zero the data they pointed to. The block keeps its size, so no other offsets move.

## Inspect a file

```js
import { scan } from "exifo-core";

const s = scan(input);
s.format; // "jpeg" | "png" | "webp"
s.blocks; // [{ kind: "exif", label: "EXIF", offset: 2, size: 21904, ... }]
s.segments; // every segment or chunk in file order
s.orientation; // 1–8
s.hasGps;
```

## Write descriptive XMP

```js
import { strip, buildXmpPacket } from "exifo-core";

const xmp = buildXmpPacket({ creator: ["Jane Doe"], copyright: "© 2026 Jane Doe", keywords: ["harbour"] });
const res = await strip(input, { remove: [], keepOrientation: true, xmp }); // replaces existing XMP
```

## Lossless JPEG rotation

```js
import { composeOrientation, setJpegOrientation, scan } from "exifo-core";

const next = composeOrientation(scan(input).orientation, 90); // rotate 90° clockwise
const rotated = setJpegOrientation(input, next); // only the orientation tag changes
```

## Verify two files

```js
import { verifyImageData } from "exifo-core";
await verifyImageData(original, cleaned); // true when the image data is byte-identical
```

## Formats

| Block               | JPEG          | PNG                        | WebP       |
| ------------------- | ------------- | -------------------------- | ---------- |
| Content Credentials | APP11 (JUMBF) | `caBX`                     | `C2PA`     |
| XMP                 | APP1          | `iTXt` `XML:com.adobe.xmp` | `XMP `     |
| EXIF                | APP1          | `eXIf`                     | `EXIF`     |
| IPTC                | APP13         | –                          | –          |
| Text, comments      | COM           | `tEXt`, `zTXt`, `iTXt`     | –          |
| Trailing data       | after EOI     | after IEND                 | after RIFF |

JPEG multi-picture (MPF) data, such as HDR gain maps and motion photos, is removed together with its index unless everything from the MPF segment to the end of the image is kept unchanged.
