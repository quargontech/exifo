"use client";

/**
 * Signature validation with the official C2PA SDK (WASM, ~9 MB, loaded on demand).
 * Trust lists are not fetched: no network request is made, so "Valid" means the
 * signature and hashes check out, not that the signer is on a trust list.
 */

import type { C2pa } from "@contentauth/c2pa-web";

export type SignatureStatus = "valid" | "invalid" | "untrusted" | "none" | "error";

export interface C2paValidation {
  status: SignatureStatus;
  /** Human-readable reason for invalid / untrusted. */
  reason?: string;
  issuer?: string;
  commonName?: string;
  time?: string;
  claimGenerator?: string;
}

const REASONS: Record<string, string> = {
  "assertion.dataHash.mismatch": "The image changed after it was signed.",
  "assertion.bmffHash.mismatch": "The file changed after it was signed.",
  "assertion.boxesHash.mismatch": "The file changed after it was signed.",
  "assertion.hashedURI.mismatch": "An assertion changed after it was signed.",
  "claimSignature.mismatch": "The signature does not match the claim.",
  "claimSignature.missing": "The claim has no signature.",
  "signingCredential.untrusted": "The signer is not on a trust list.",
  "signingCredential.expired": "The signing certificate had expired when it was used.",
  "signingCredential.revoked": "The signing certificate was revoked.",
  "signingCredential.invalid": "The signing certificate is not valid.",
  "timeStamp.mismatch": "The time stamp does not match the signature.",
  "timeStamp.untrusted": "The time stamp authority is not trusted.",
  "manifest.inaccessible": "The manifest could not be read.",
  "claim.malformed": "The claim is malformed.",
};

let instance: Promise<C2pa> | null = null;

async function sdk() {
  const mod = await import("@contentauth/c2pa-web");
  instance ??= mod.createC2pa({ wasmSrc: "/wasm/c2pa_bg.wasm" });
  return { mod, c2pa: await instance };
}

export async function validateC2pa(blob: Blob, mime: string): Promise<C2paValidation> {
  try {
    const { mod, c2pa } = await sdk();
    const context = new mod.Context({ verify: { verifyTrust: false, verifyAfterReading: true } });
    const reader = await mod.Reader.fromBlob(c2pa, mime, blob, context);
    if (!reader) return { status: "none" };
    try {
      const store = await reader.manifestStore();
      const label = store.active_manifest ?? "";
      const manifest = label ? store.manifests?.[label] : undefined;
      const sig = manifest?.signature_info;
      const base = {
        issuer: sig?.issuer ?? undefined,
        commonName: sig?.common_name ?? undefined,
        time: sig?.time ?? undefined,
        claimGenerator: manifest?.claim_generator ?? manifest?.claim_generator_info?.[0]?.name ?? undefined,
      };
      const failures = (store.validation_status ?? []).filter((s) => s.success !== true);
      const failure = failures.find((f) => f.code !== "signingCredential.untrusted");
      if (store.validation_state === "Invalid" || failure) {
        const f = failure ?? failures[0];
        return { status: "invalid", reason: f ? (REASONS[f.code] ?? f.explanation ?? f.code) : undefined, ...base };
      }
      if (failures.some((f) => f.code === "signingCredential.untrusted"))
        return { status: "untrusted", reason: REASONS["signingCredential.untrusted"], ...base };
      return { status: "valid", ...base };
    } finally {
      await reader.free();
    }
  } catch (err) {
    console.warn("Exifo: C2PA validation failed", err);
    const msg = err instanceof Error ? err.message : "";
    const reason = /unsupported|decod|malformed|invalid/i.test(msg)
      ? "The C2PA SDK could not read this manifest. It may use an unsupported version or be damaged."
      : "The Content Credentials could not be checked in this browser.";
    return { status: "error", reason };
  }
}
