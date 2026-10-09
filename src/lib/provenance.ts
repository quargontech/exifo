/** Verdict logic for the Check tool: what does the file say about its own origin? */

import { looksLikeAiTool } from "./ai-signals";
import { isAiEditedType, isAiGeneratedType, shortSourceType } from "./c2pa-lite";
import { formatDateTime } from "./format";
import type { Report } from "./report";

export type Verdict = "ai-generated" | "ai-edited" | "credentials" | "none";

export interface VerdictDetail {
  key: string;
  value: string;
  mono?: boolean;
}

export interface VerdictInfo {
  verdict: Verdict;
  title: string;
  explanation: string;
  details: VerdictDetail[];
}

export const VERDICTS: { id: Verdict; title: string; blurb: string }[] = [
  { id: "ai-generated", title: "Marked as AI-generated", blurb: "The file says a generative model made it." },
  { id: "ai-edited", title: "Marked as AI-edited", blurb: "A generative tool changed part of the image." },
  { id: "credentials", title: "Has Content Credentials, no AI marker", blurb: "A manifest is present and names no generative tool." },
  { id: "none", title: "No provenance data found", blurb: "Nothing in the file describes where it came from." },
];

interface Source {
  text: string;
  plural: boolean;
}

function sentence(sources: Source[], claim: string): string {
  if (!sources.length) return "";
  const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  if (sources.length === 1) return `${sources[0].text} ${sources[0].plural ? "say" : "says"} ${claim}`;
  if (sources.length === 2) return `${sources[0].text} and ${lower(sources[1].text)} both say ${claim}`;
  const head = sources
    .slice(0, -1)
    .map((s, i) => (i ? lower(s.text) : s.text))
    .join(", ");
  return `${head} and ${lower(sources[sources.length - 1].text)} all say ${claim}`;
}

export function verdictFor(report: Report): VerdictInfo {
  const c2pa = report.c2pa;
  const dst = report.digitalSourceType;
  const genSources: Source[] = [];
  const editSources: Source[] = [];
  if (c2pa?.aiGenerated) genSources.push({ text: "The Content Credentials", plural: true });
  else if (c2pa?.aiEdited) editSources.push({ text: "The Content Credentials", plural: true });
  if (dst && isAiGeneratedType(dst)) genSources.push({ text: "The IPTC source type", plural: false });
  else if (dst && isAiEditedType(dst)) editSources.push({ text: "The IPTC source type", plural: false });
  const pngPrompt = report.prompts.find((p) => p.source.startsWith("PNG"));
  const exifPrompt = report.prompts.find((p) => p.source.startsWith("EXIF"));
  if (pngPrompt) genSources.push({ text: "The generator settings in the PNG text", plural: true });
  if (exifPrompt) genSources.push({ text: "The generator settings in the EXIF comment", plural: true });
  if (!genSources.length && !editSources.length && looksLikeAiTool(report.tool)) {
    genSources.push({ text: `The software name (“${report.tool}”)`, plural: false });
  }

  let verdict: Verdict = "none";
  let explanation = "Nothing in the file describes where it came from.";
  if (genSources.length) {
    verdict = "ai-generated";
    explanation = sentence(genSources, "this image was made by a generative model.");
  } else if (editSources.length) {
    verdict = "ai-edited";
    explanation = sentence(editSources, "a generative tool changed part of this image.");
  } else if (c2pa) {
    verdict = "credentials";
    explanation = "The file carries a Content Credentials manifest that names no generative tool.";
  }

  const details: VerdictDetail[] = [];
  const generator = c2pa?.claimGenerator ?? report.tool;
  if (generator) details.push({ key: verdict === "credentials" || verdict === "none" ? "Created with" : "Generating tool", value: generator });
  if (c2pa) {
    details.push({ key: "Signed by", value: c2pa.signer ?? "Unknown signer" });
    if (c2pa.signedAt) details.push({ key: "Signed on", value: formatDateTime(c2pa.signedAt) });
  }
  const sourceType = c2pa?.digitalSourceTypes.find((t) => isAiGeneratedType(t) || isAiEditedType(t)) ?? c2pa?.digitalSourceTypes[0] ?? dst;
  if (sourceType) details.push({ key: "Source type", value: shortSourceType(sourceType), mono: true });
  if (c2pa?.actions.length) details.push({ key: "Recorded actions", value: [...new Set(c2pa.actions.map((a) => a.label))].join(", ") });

  return { verdict, title: VERDICTS.find((v) => v.id === verdict)!.title, explanation, details };
}
