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
