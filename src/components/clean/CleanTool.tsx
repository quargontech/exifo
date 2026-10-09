"use client";

import { useCallback } from "react";
import { Dropzone } from "@/components/Dropzone";
import { LockIcon, ImageIcon, TickIcon } from "@/components/icons";
import { LegalNote, PageHeader } from "@/components/PageHeader";
import { QueueNotices } from "@/components/QueueNotices";
import { useFiles } from "@/store/files";
import { ActionBar } from "./ActionBar";
import { FileCard } from "./FileCard";
import { OptionsBar } from "./OptionsBar";

const FEATURES = [
  { icon: <ImageIcon size={18} strokeWidth={1.8} />, title: "Lossless", text: "Image data is copied byte for byte. Nothing is decoded or re-encoded." },
  { icon: <LockIcon size={18} />, title: "Private", text: "Everything runs in your browser. Nothing is uploaded." },
  {
    icon: <TickIcon size={18} strokeWidth={2.2} className="text-proof" />,
    title: "Verified",
    text: "Every cleaned file is hash-checked against the original before you download it.",
  },
];

export function CleanTool() {
  const files = useFiles((s) => s.files);
  const notices = useFiles((s) => s.notices);
  const add = useFiles((s) => s.add);
  const dismiss = useFiles((s) => s.dismissNotice);
  const onFiles = useCallback((f: File[]) => void add(f), [add]);

  return (
    <>
      <PageHeader tool="clean" />
      {files.length === 0 ? (
        <>
          <Dropzone key="hero" onFiles={onFiles} />
          <QueueNotices notices={notices} onDismiss={dismiss} />
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-5 py-[18px]">
                <div className="flex items-center gap-2">
                  {f.icon}
                  <h3 className="m-0 text-[15px] font-semibold">{f.title}</h3>
                </div>
                <p className="m-0 text-sm leading-[1.5] text-ink-2">{f.text}</p>
              </div>
            ))}
          </div>
          <LegalNote full />
        </>
      ) : (
        <>
          <Dropzone key="compact" onFiles={onFiles} variant="compact" />
          <QueueNotices notices={notices} onDismiss={dismiss} />
          <OptionsBar />
          {files.map((f) => (
            <FileCard key={f.id} entry={f} />
          ))}
          <ActionBar />
          <LegalNote />
        </>
      )}
    </>
  );
}
