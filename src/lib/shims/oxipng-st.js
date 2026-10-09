// Single-threaded OxiPNG in place of the multi-threaded build (see next.config.ts).
// Threads need a cross-origin isolated page, which this static site is not, so the
// threaded build could never run; this keeps its API so jSquash still works if it is picked.
export { default, optimise, optimise_raw } from "../../../node_modules/@jsquash/oxipng/codec/pkg/squoosh_oxipng.js";
export const initThreadPool = async () => {};
