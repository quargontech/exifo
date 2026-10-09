"use client";

import { Notice } from "@/components/ui/notice";

export function QueueNotices({
  notices,
  onDismiss,
}: {
  notices: { id: string; tone: "warning" | "error" | "info"; text: string }[];
  onDismiss: (id: string) => void;
}) {
  if (!notices.length) return null;
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      {notices.map((n) => (
        <Notice key={n.id} tone={n.tone} onDismiss={() => onDismiss(n.id)}>
          {n.text}
        </Notice>
      ))}
    </div>
  );
}
