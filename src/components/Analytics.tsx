"use client";

import Link from "next/link";
import Script from "next/script";
import { closeConsent, GA_ID, gtagBootstrap, reopenConsent, savedConsent, setConsent, useConsent } from "@/lib/analytics";
import { CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

/** Loads Google Analytics after consent and asks for it once. Renders nothing without NEXT_PUBLIC_GA_ID. */
export function Analytics() {
  const consent = useConsent();
  if (!GA_ID || consent === null) return null;
  const loaded = consent === "granted" || (consent === "asking" && savedConsent() === "granted");
  return (
    <>
      {loaded && (
        <>
          <Script id="ga-bootstrap" strategy="afterInteractive">
            {gtagBootstrap(GA_ID)}
          </Script>
          <Script id="ga-gtag" src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        </>
      )}
      {(consent === "unset" || consent === "asking") && <ConsentBanner reopened={consent === "asking"} />}
    </>
  );
}

function ConsentBanner({ reopened }: { reopened: boolean }) {
  const saved = savedConsent();
  return (
    <section
      aria-label="Analytics consent"
      className="exifo-enter fixed inset-x-3 bottom-3 z-50 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-xl sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-[400px]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="m-0 text-[15px] font-semibold">Help improve Exifo?</h2>
        {reopened && (
          <button
            type="button"
            aria-label="Close"
            onClick={closeConsent}
            className="-m-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2"
          >
            <CloseIcon size={16} />
          </button>
        )}
      </div>
      <p className="m-0 text-[13px] leading-[1.5] text-ink-2">
        With your permission, Exifo uses Google Analytics to count visits and see which tools are used. It sets cookies. Your images and their metadata are
        never sent. <Link href="/privacy/#analytics">Privacy</Link>
        {reopened && saved !== "unset" && <span className="text-ink-3"> · Currently {saved === "granted" ? "allowed" : "declined"}.</span>}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConsent("denied")}>
          Decline
        </Button>
        <Button variant="primary" size="sm" className="flex-1" onClick={() => setConsent("granted")}>
          Allow
        </Button>
      </div>
    </section>
  );
}

/** Footer link that reopens the banner. Hidden when analytics is not configured. */
export function AnalyticsSettingsLink({ className }: { className?: string }) {
  if (!GA_ID) return null;
  return (
    <button type="button" onClick={reopenConsent} className={className}>
      Analytics settings
    </button>
  );
}
