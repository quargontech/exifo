"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { downloadUrl } from "@/lib/download";
import { canCopyImage, canSaveToFolder, canShareFiles, copyImage, saveToFolder, shareFiles, type OutFile } from "@/lib/file-actions";
import { CopyIcon, DownloadIcon, FolderIcon, ShareIcon, TickIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

/** Browser capabilities are only known on the client, after the first render. */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Download, plus Copy and (on phones) Share where the browser supports them. */
export function FileActions({
  blob,
  name,
  url,
  className,
  downloadClassName,
}: {
  blob: Blob;
  name: string;
  url: string;
  className?: string;
  downloadClassName?: string;
}) {
  const mounted = useMounted();
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const file = { name, blob };
  const showCopy = mounted && blob.type.startsWith("image/") && canCopyImage();
  const showShare = mounted && canShareFiles([file]);

  const onCopy = async () => {
    try {
      await copyImage(blob);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
    window.setTimeout(() => setCopy("idle"), 1800);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button variant="secondary" className={downloadClassName} onClick={() => downloadUrl(url, name)}>
        <DownloadIcon size={18} />
        Download
      </Button>
      {showCopy && (
        <Button
          variant="secondary"
          size="icon"
          aria-label={copy === "copied" ? "Copied" : copy === "failed" ? "Could not copy" : "Copy image"}
          title="Copy image"
          onClick={onCopy}
        >
          {copy === "copied" ? <TickIcon size={18} className="text-proof" /> : <CopyIcon size={18} />}
        </Button>
      )}
      {showShare && (
        <Button variant="secondary" size="icon" aria-label="Share" title="Share" onClick={() => void shareFiles([file]).catch(() => undefined)}>
          <ShareIcon size={18} />
        </Button>
      )}
    </div>
  );
}

/** Desktop Chrome and Edge: write every finished file into a folder the user picks. */
export function SaveToFolderButton({ getFiles, count }: { getFiles: () => OutFile[]; count: number }) {
  const mounted = useMounted();
  const [state, setState] = useState<{ busy?: boolean; message?: string }>({});
  if (!mounted || !canSaveToFolder() || count < 2) return null;

  const onSave = async () => {
    setState({ busy: true });
    try {
      const res = await saveToFolder(getFiles());
      setState({ message: res ? `Saved ${res.saved} ${res.saved === 1 ? "file" : "files"} to ${res.folder}` : undefined });
    } catch {
      setState({ message: "Could not save to that folder" });
    }
    window.setTimeout(() => setState({}), 4000);
  };

  return (
    <>
      <Button variant="secondary" disabled={state.busy} loading={state.busy} onClick={onSave}>
        {!state.busy && <FolderIcon size={18} />}
        Save to folder
      </Button>
      {state.message && (
        <span className="text-[13px] text-ink-2" role="status">
          {state.message}
        </span>
      )}
    </>
  );
}

/** Phones: share every finished file through the system share sheet. */
export function ShareAllButton({ getFiles, count, className }: { getFiles: () => OutFile[]; count: number; className?: string }) {
  const mounted = useMounted();
  if (!mounted || !count) return null;
  const files = getFiles();
  if (!canShareFiles(files)) return null;
  return (
    <Button
      variant="secondary"
      size="icon"
      className={className}
      aria-label={count === 1 ? "Share the file" : `Share ${count} files`}
      onClick={() => void shareFiles(files).catch(() => undefined)}
    >
      <ShareIcon size={20} />
    </Button>
  );
}
