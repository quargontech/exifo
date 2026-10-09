/**
 * Comlink wrapper that restarts a crashed worker. If the worker dies mid-call,
 * the pending call rejects and the next call gets a fresh worker.
 */

import * as Comlink from "comlink";

export class WorkerCrashError extends Error {
  constructor() {
    super("The processing worker stopped unexpectedly. The file was skipped; the rest of the queue continues.");
    this.name = "WorkerCrashError";
  }
}

export class WorkerClient<T> {
  private worker: Worker | null = null;
  private proxy: Comlink.Remote<T> | null = null;
  private crashed: Promise<never> | null = null;

  constructor(private factory: () => Worker) {}

  private ensure() {
    if (this.worker && this.proxy && this.crashed) return { proxy: this.proxy, crashed: this.crashed };
    const worker = this.factory();
    let reject!: (e: Error) => void;
    const crashed = new Promise<never>((_, r) => (reject = r));
    crashed.catch(() => undefined);
    const onCrash = (ev: Event) => {
      console.error("Exifo worker crashed", ev);
      if (this.worker === worker) this.reset();
      reject(new WorkerCrashError());
    };
    worker.addEventListener("error", onCrash);
    worker.addEventListener("messageerror", onCrash);
    this.worker = worker;
    this.proxy = Comlink.wrap<T>(worker);
    this.crashed = crashed;
    return { proxy: this.proxy, crashed };
  }

  async call<R>(fn: (api: Comlink.Remote<T>) => Promise<R>): Promise<R> {
    const { proxy, crashed } = this.ensure();
    return Promise.race([fn(proxy), crashed]);
  }

  reset() {
    this.proxy?.[Comlink.releaseProxy]?.();
    this.worker?.terminate();
    this.worker = null;
    this.proxy = null;
    this.crashed = null;
  }
}
