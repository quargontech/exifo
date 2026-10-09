"use client";

/** Trigger a download of a Blob with the given file name. */
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function downloadUrl(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadText(text: string, name: string, mime: string) {
  downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), name);
}
