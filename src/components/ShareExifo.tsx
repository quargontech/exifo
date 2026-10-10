"use client";

import { useEffect, useState } from "react";
import { SITE_URL } from "@/lib/site";
import { CloseIcon, CopyIcon, TickIcon } from "@/components/icons";

const DISMISS_KEY = "exifo-share-dismissed";
const MESSAGE = "Exifo: clean image metadata in your browser. Nothing is uploaded.";
const shareUrl = (medium: string) => `${SITE_URL}/?utm_source=share&utm_medium=${medium}&utm_campaign=in-app`;

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347Zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884Zm8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

const btn =
  "inline-flex h-10 items-center gap-2 rounded-[10px] border border-line-strong bg-surface px-3.5 text-sm font-semibold text-ink no-underline transition-colors hover:bg-surface-2";

/** A small, dismissible card inviting the user to share Exifo. Shown once some files are done. */
export function ShareExifo() {
  const [hidden, setHidden] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl("copy"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(MESSAGE)}&url=${encodeURIComponent(shareUrl("x"))}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${MESSAGE} ${shareUrl("whatsapp")}`)}`;

  return (
    <section
      aria-label="Share Exifo"
      className="exifo-enter relative flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-5"
    >
      <div className="flex flex-col gap-0.5 pr-8 sm:pr-0">
        <h2 className="m-0 text-[15px] font-semibold">Exifo is free and runs in your browser.</h2>
        <p className="m-0 text-[13px] leading-[1.5] text-ink-2">If it helped, sharing it with someone is the best way to support it.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={copy} className={btn}>
          {copied ? <TickIcon size={16} className="text-proof" /> : <CopyIcon size={16} />}
          {copied ? "Copied" : "Copy link"}
        </button>
        <a href={x} target="_blank" rel="noopener noreferrer" className={btn} aria-label="Share on X">
          <XIcon />
          <span className="hidden sm:inline">Post on X</span>
        </a>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={btn} aria-label="Share on WhatsApp">
          <WhatsAppIcon />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 sm:static sm:h-9 sm:w-9"
      >
        <CloseIcon size={16} />
      </button>
    </section>
  );
}
