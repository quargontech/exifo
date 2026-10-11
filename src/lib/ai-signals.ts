/** Heuristics that decide when a metadata value points at generative AI. */

/** Known generators and common AI disclosure phrases. */
const AI_TOOL_RE =
  /(stable[\s_-]?diffusion|\bsdxl\b|midjourney|dall[\s·•_-]?e|firefly|imagen|gemini|openai|chatgpt|gpt-?4o|gpt[\s-]?image|novelai|comfyui|automatic1111|\ba1111\b|invokeai|fooocus|leonardo(\.ai| ai)|ideogram|\bflux(\.1)?\b|runway(ml)?|bing image creator|copilot designer|designer \(microsoft\)|playground ?ai|nightcafe|craiyon|dreamstudio|kandinsky|recraft|krea\b|grok|aurora \(xai\)|imagine with meta|meta ai|generated (with|by) (an )?ai|ai[- ]generated|made with (google )?ai|synthid|nano[\s-]?banana)/i;

/** Stable Diffusion WebUI style generation parameters. */
const SD_PARAMS_RE = /(Steps:\s*\d+.*(Sampler|CFG scale|Seed):)|("prompt"\s*:.*"(steps|sampler|seed|cfg)")/is;

export const looksLikeAiTool = (v: string | undefined) => !!v && AI_TOOL_RE.test(v);
export const looksLikeGenerationParams = (v: string | undefined) => !!v && SD_PARAMS_RE.test(v);

/** PNG text keywords that only image generators write. */
export const AI_PNG_KEYWORDS = new Set(["parameters", "prompt", "workflow", "invokeai_metadata", "sd-metadata", "dream", "generation_data"]);
/** PNG text keywords that are flagged when their value looks generated. */
export const MAYBE_AI_PNG_KEYWORDS = new Set(["Software", "Comment", "Description", "Source", "Title"]);

/**
 * Quick scan of a file's first bytes for an AI label (IPTC digital source type, generator
 * parameters in a PNG text chunk) or Content Credentials. Used by the re-encoding tools,
 * which drop all of these, to show the same disclosure note as Clean.
 */
export function hasAiOrProvenanceMarker(head: Uint8Array): boolean {
  const s = new TextDecoder("latin1").decode(head);
  return (
    /(?:trained|compositeWithTrained)AlgorithmicMedia/.test(s) ||
    /(?:tEXt|iTXt|zTXt)(?:parameters|prompt|workflow|invokeai_metadata|sd-metadata|generation_data)\0/.test(s) ||
    (s.includes("jumd") && s.includes("c2pa"))
  );
}
