"use client";

import type { ImageWorkerApi } from "../workers/image.worker";
import { WorkerClient } from "./worker-client";

let image: WorkerClient<ImageWorkerApi> | null = null;

/** Image worker (decode, resize, encode). Kept apart from the metadata worker so metadata pages never bundle the codecs. */
export function imageWorker() {
  image ??= new WorkerClient<ImageWorkerApi>(() => new Worker(new URL("../workers/image.worker.ts", import.meta.url), { type: "module", name: "exifo-image" }));
  return image;
}
