"use client";

import { useCallback, useEffect } from "react";
import { useDropzone, type Accept } from "react-dropzone";
import { cn } from "@/lib/cn";
import { LockIcon, UploadIcon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";

export const ACCEPT_META: Accept = {
  "image/jpeg": [".jpg", ".jpeg", ".jfif"],
  "image/png": [".png", ".apng"],
  "image/webp": [".webp"],
};

export const ACCEPT_IMAGES: Accept = {
  ...ACCEPT_META,
  "image/heic": [".heic", ".heif"],
  "image/heif": [".heif"],
  "image/avif": [".avif"],
  "image/gif": [".gif"],
  "image/bmp": [".bmp"],
};

/** Paste images from the clipboard anywhere on the page (not while typing in a field). */
export function usePasteFiles(onFiles: (files: File[]) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (!files.length) return;
      e.preventDefault();
      onFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFiles, enabled]);
}

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  variant?: "hero" | "compact" | "panel";
  accept?: Accept;
  multiple?: boolean;
  title?: string;
  hint?: string;
  compactTitle?: string;
  className?: string;
  /** Listen for paste events on the whole page. */
  paste?: boolean;
  browseLabel?: string;
}

export function Dropzone({
  onFiles,
  variant = "hero",
  accept = ACCEPT_META,
  multiple = true,
  title = "Drop images here",
  hint = "JPEG · PNG · WebP · up to 50 MB each · 50 files at a time",
  compactTitle = "Drop more images, or paste from the clipboard",
  className,
  paste = true,
  browseLabel = "Browse files",
}: DropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[], rejected: { file: File }[]) => {
      const all = [...accepted, ...rejected.map((r) => r.file)];
      if (all.length) onFiles(multiple ? all : all.slice(0, 1));
    },
    [onFiles, multiple],
  );
  usePasteFiles(onFiles, paste);
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept,
    multiple,
    noClick: true,
    noKeyboard: true,
    useFsAccessApi: false,
  });

  if (variant === "compact") {
    return (
      <section
        aria-label="Add images"
        {...getRootProps()}
        className={cn(
          "flex flex-wrap items-center gap-3.5 rounded-[14px] border-[1.5px] border-dashed bg-surface px-4 py-3.5 transition-colors",
          isDragActive ? "border-proof bg-proof-tint" : "border-line-strong",
          className,
        )}
      >
        <input {...getInputProps()} />
        <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink sm:flex">
          <UploadIcon size={20} />
        </div>
        <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5">
          <div className="font-semibold">
            <span className="hidden sm:inline">{isDragActive ? "Drop to add" : compactTitle}</span>
            <span className="sm:hidden">{isDragActive ? "Drop to add" : "Add images"}</span>
          </div>
          <div className="hidden font-mono text-xs text-ink-3 sm:block">{hint.replace(/ · 50 files at a time$/, "")}</div>
          <div className="flex items-center gap-1.5 text-[13px] text-ink-2 sm:hidden">
            <LockIcon size={13} strokeWidth={2} />
            Files never leave your device
          </div>
        </div>
        <button type="button" onClick={open} className={buttonVariants({ variant: "secondary" })}>
          <span className="hidden sm:inline">{browseLabel}</span>
          <span className="sm:hidden">Browse</span>
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label="Add images"
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center gap-5 rounded-[20px] border-[1.5px] border-dashed bg-surface px-6 py-10 text-center transition-colors",
        variant === "hero" ? "min-h-[360px] sm:min-h-[480px]" : "min-h-[260px]",
        isDragActive ? "border-proof bg-proof-tint" : "border-line-strong",
        className,
      )}
    >
      <input {...getInputProps()} />
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-ink">
        <UploadIcon size={24} />
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="m-0 text-[22px] font-semibold leading-7 tracking-[-0.01em]">{isDragActive ? "Drop to add" : title}</h2>
        <p className="m-0 text-ink-2">{paste ? "You can also paste from the clipboard." : "Or choose a file from your device."}</p>
      </div>
      <button type="button" onClick={open} className={buttonVariants({ variant: "primary", className: "px-5" })}>
        {browseLabel}
      </button>
      <div className="font-mono text-xs text-ink-3">{hint}</div>
    </section>
  );
}
