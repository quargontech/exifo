"use client";

import type { StripWorkerApi } from "../workers/strip.worker";
import { WorkerClient } from "./worker-client";

let strip: WorkerClient<StripWorkerApi> | null = null;

/** Metadata worker (scan, report, clean, verify). The image-codec worker lives in image-worker.ts. */
export function stripWorker() {
  strip ??= new WorkerClient<StripWorkerApi>(() => new Worker(new URL("../workers/strip.worker.ts", import.meta.url), { type: "module", name: "exifo-meta" }));
  return strip;
}
