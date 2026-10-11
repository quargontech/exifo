"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { validateC2pa, type C2paValidation } from "@/lib/c2pa-verify";
import { cn } from "@/lib/cn";
import { FORMAT_MIME } from "@/lib/detect";
import { formatDateTime } from "@/lib/format";
import { verdictFor, VERDICTS, type Verdict } from "@/lib/provenance";
import { Dropzone } from "@/components/Dropzone";
import { ExportMenu } from "@/components/ExportMenu";
import { FileBar } from "@/components/FileBar";
import { ErrorIcon, InfoIcon, InspectIcon, TickIcon, WarningIcon } from "@/components/icons";
import { Mark } from "@/components/Logo";
import { PageHeader } from "@/components/PageHeader";
import { QueueNotices } from "@/components/QueueNotices";
import { Button, buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { ReadingCard, Spinner } from "@/components/ui/progress";
import { activateAndAdd, useActiveFile } from "@/store/actions";
import { useFiles, type FileEntry } from "@/store/files";

function VerdictIcon({ v }: { v: Verdict }) {
  if (v === "ai-generated")
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-tag-tint">
        <Mark size={34} body="var(--tag-deep)" />
      </div>
    );
  if (v === "ai-edited")
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-[2.5px] border-tag bg-surface">
        <Mark size={30} body="var(--tag-deep)" />
      </div>
    );
  if (v === "credentials")
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-proof-tint text-proof">
        <TickIcon size={26} />
      </div>
    );
  return <div className="h-14 w-14 shrink-0 rounded-2xl border-2 border-dashed border-ink-3" aria-hidden="true" />;
}

function Swatch({ v }: { v: Verdict }) {
  if (v === "ai-generated") return <div className="h-4 w-4 rounded bg-tag" />;
  if (v === "ai-edited") return <div className="box-border h-4 w-4 rounded border-[2.5px] border-tag" />;
  if (v === "credentials") return <div className="h-4 w-4 rounded-full bg-proof" />;
  return <div className="box-border h-4 w-4 rounded-full border-2 border-dashed border-ink-3" />;
}

function SignatureValue({ state }: { state: C2paValidation | "loading" | null }) {
  if (state === "loading" || state === null)
    return (
      <span className="flex items-center gap-2 text-ink-2">
        <Spinner size={14} className="text-proof" />
        Checking…
      </span>
    );
  if (state.status === "valid")
    return (
      <span className="flex items-center gap-1.5 text-proof">
        <TickIcon size={16} />
        Valid
      </span>
    );
  if (state.status === "untrusted")
    return (
      <span className="flex items-center gap-1.5 text-tag-deep">
        <WarningIcon size={16} />
        Untrusted signer
      </span>
    );
  if (state.status === "invalid")
    return (
      <span className="flex items-center gap-1.5 text-danger">
        <ErrorIcon size={16} />
        Invalid
      </span>
    );
  if (state.status === "none") return <span className="text-ink-2">Not readable by the C2PA SDK</span>;
  return <span className="text-ink-2">Could not be checked</span>;
}

function useValidation(entry?: FileEntry) {
  const [state, setState] = useState<C2paValidation | "loading" | null>(null);
  const hasC2pa = !!entry?.analysis?.report.c2pa;
  useEffect(() => {
    if (!entry || !hasC2pa) {
      setState(null);
      return;
    }
    let live = true;
    setState("loading");
    validateC2pa(entry.file, FORMAT_MIME[entry.format]).then((r) => live && setState(r));
    return () => {
      live = false;
    };
  }, [entry, hasC2pa]);
  return state;
}

export function CheckTool() {
  const entry = useActiveFile();
  const notices = useFiles((s) => s.notices);
  const dismiss = useFiles((s) => s.dismissNotice);
  const onFiles = useCallback((f: File[]) => void activateAndAdd(f), []);
  const pick = useRef<HTMLInputElement>(null);
  const a = entry?.analysis;
  const info = useMemo(() => (a ? verdictFor(a.report) : null), [a]);
  const validation = useValidation(entry);

  if (!entry) {
    return (
      <>
        <PageHeader tool="check" />
        <Dropzone key="hero" onFiles={onFiles} title="Drop an image to check" multiple={false} hint="JPEG · PNG · WebP · up to 50 MB · nothing is uploaded" />
        <QueueNotices notices={notices} onDismiss={dismiss} />
        <Disclaimer />
        <VerdictLegend />
      </>
    );
  }

  const signedOn = typeof validation === "object" && validation?.time ? formatDateTime(validation.time) : undefined;
  const signer = typeof validation === "object" ? validation?.issuer : undefined;

  return (
    <>
      <PageHeader tool="check" />
      <FileBar entry={entry} label="File being checked">
        <input
          ref={pick}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.length && onFiles(Array.from(e.target.files))}
        />
        <Button variant="secondary" onClick={() => pick.current?.click()}>
          Check another file
        </Button>
      </FileBar>
      <QueueNotices notices={notices} onDismiss={dismiss} />
      {entry.status === "error" && <Notice tone="error">{entry.error}</Notice>}
      {(entry.status === "queued" || entry.status === "scanning") && <ReadingCard />}

      {a && info && (
        <section aria-label="Verdict" className="exifo-enter flex flex-col gap-6 rounded-[20px] border border-line bg-surface p-5 sm:p-7">
          <div className="flex flex-wrap items-start gap-[18px]">
            <VerdictIcon v={info.verdict} />
            <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-1.5">
              <div
                className={cn(
                  "font-mono text-xs tracking-[0.08em]",
                  info.verdict.startsWith("ai") ? "text-tag-deep" : info.verdict === "credentials" ? "text-proof" : "text-ink-3",
                )}
              >
                VERDICT
              </div>
              <h2 className="font-display m-0 text-[28px] font-bold leading-[34px] sm:text-[32px] sm:leading-[38px]">{info.title}</h2>
              <p className="m-0 max-w-[640px] text-ink-2">{info.explanation}</p>
            </div>
          </div>

          {(info.details.length > 0 || a.report.c2pa) && (
            <dl className="m-0 grid gap-x-8 border-t border-line [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">
              {info.details.map((d) => {
                const value = d.key === "Signed by" && signer ? signer : d.key === "Signed on" && signedOn ? signedOn : d.value;
                return (
                  <div key={d.key} className="flex flex-col gap-0.5 border-b border-line py-3.5">
                    <dt className="text-[13px] text-ink-3">{d.key}</dt>
                    <dd className={cn("m-0 font-semibold [overflow-wrap:anywhere]", d.mono && "font-mono text-sm font-medium")}>{value}</dd>
                  </div>
                );
              })}
              {a.report.c2pa && (
                <div className="flex flex-col gap-0.5 border-b border-line py-3.5">
                  <dt className="text-[13px] text-ink-3">Signature</dt>
                  <dd className="m-0 font-semibold">
                    <SignatureValue state={validation} />
                    {typeof validation === "object" && validation?.reason && validation.status !== "valid" && (
                      <span className="block text-[13px] font-normal text-ink-2">{validation.reason}</span>
                    )}
                    {typeof validation === "object" && validation?.status === "valid" && (
                      <span className="block text-[13px] font-normal text-ink-3">Signer not checked against a trust list</span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {a.report.prompts.map((p, i) => (
            <div key={i} className="flex flex-col gap-2">
              <h3 className="m-0 text-sm font-semibold">Generator prompt found in {p.source}</h3>
              <div className="max-h-[280px] overflow-auto rounded-[10px] bg-ground p-3.5 font-mono text-[13px] leading-[1.6] [overflow-wrap:anywhere] dark:bg-surface-2">
                {p.text.length > 6000 ? `${p.text.slice(0, 6000)} …` : p.text}
              </div>
            </div>
          ))}

          {a.report.aiSignals.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="m-0 text-sm font-semibold">Signals found</h3>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {a.report.aiSignals.map((s) => (
                  <li key={s} className="rounded-[7px] border border-tag-line bg-tag-tint px-2.5 py-1 font-mono text-xs font-medium text-tag-deep">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Link href="/inspect/" className={buttonVariants({ variant: "secondary" })}>
              <InspectIcon size={18} />
              Open in Inspect
            </Link>
            <ExportMenu entry={entry} />
          </div>
        </section>
      )}

      <Disclaimer />
      <VerdictLegend current={info?.verdict} />
    </>
  );
}

function Disclaimer() {
  return (
    <div className="flex gap-2.5 rounded-xl bg-proof-tint px-4 py-3.5">
      <InfoIcon size={18} className="mt-0.5 shrink-0 text-proof" />
      <p className="m-0 text-sm leading-[1.5]">
        No provenance data does not mean the image is not AI-generated. Metadata can be missing, removed or, when unsigned, edited. A valid signed manifest is
        the only strong evidence.
      </p>
    </div>
  );
}

function VerdictLegend({ current }: { current?: Verdict }) {
  return (
    <section aria-label="All verdicts" className="flex flex-col gap-3 pt-2">
      <h2 className="m-0 text-[15px] font-semibold">The four verdicts</h2>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))]">
        {VERDICTS.map((v) => (
          <div
            key={v.id}
            aria-current={current === v.id ? "true" : undefined}
            className={cn("flex flex-col gap-2 rounded-[14px] bg-surface px-4 py-3.5", current === v.id ? "border-[1.5px] border-ink" : "border border-line")}
          >
            <Swatch v={v.id} />
            <div className="text-sm font-semibold leading-[1.35]">{v.title}</div>
            <div className="text-[13px] leading-[1.45] text-ink-2">{v.blurb}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
