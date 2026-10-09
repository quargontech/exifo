/**
 * Tiny XML parser for XMP packets. Runs in Web Workers, which have no DOMParser.
 * Handles elements, attributes, text, CDATA, comments and processing instructions.
 */

export interface XNode {
  name: string;
  attrs: Record<string, string>;
  children: XNode[];
  text: string;
  /** Namespace declarations in scope (prefix -> URI), inherited from ancestors. */
  ns: Record<string, string>;
}

const ENTITIES: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

export function decodeEntities(s: string): string {
  if (s.indexOf("&") < 0) return s;
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

const ATTR_RE = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/g;

export function parseXml(src: string, maxNodes = 50000): XNode {
  const root: XNode = { name: "#root", attrs: {}, children: [], text: "", ns: {} };
  const stack: XNode[] = [root];
  let i = 0;
  let count = 0;
  const n = src.length;
  while (i < n) {
    const lt = src.indexOf("<", i);
    const top = stack[stack.length - 1];
    if (lt < 0) {
      top.text += decodeEntities(src.slice(i));
      break;
    }
    if (lt > i) top.text += decodeEntities(src.slice(i, lt));
    if (src.startsWith("<?", lt)) {
      const e = src.indexOf("?>", lt);
      i = e < 0 ? n : e + 2;
      continue;
    }
    if (src.startsWith("<!--", lt)) {
      const e = src.indexOf("-->", lt);
      i = e < 0 ? n : e + 3;
      continue;
    }
    if (src.startsWith("<![CDATA[", lt)) {
      const e = src.indexOf("]]>", lt);
      top.text += src.slice(lt + 9, e < 0 ? n : e);
      i = e < 0 ? n : e + 3;
      continue;
    }
    if (src.startsWith("<!", lt)) {
      const e = src.indexOf(">", lt);
      i = e < 0 ? n : e + 1;
      continue;
    }
    // Find the end of the tag, skipping '>' inside quoted attribute values.
    let j = lt + 1;
    let quote = "";
    for (; j < n; j++) {
      const c = src[j];
      if (quote) {
        if (c === quote) quote = "";
      } else if (c === '"' || c === "'") quote = c;
      else if (c === ">") break;
    }
    if (j >= n) break;
    const inner = src.slice(lt + 1, j);
    i = j + 1;
    if (inner[0] === "/") {
      const name = inner.slice(1).trim();
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k].name === name) {
          stack.length = k;
          break;
        }
      }
      continue;
    }
    const selfClosing = inner.endsWith("/");
    const body = selfClosing ? inner.slice(0, -1) : inner;
    const sp = body.search(/\s/);
    const name = sp < 0 ? body : body.slice(0, sp);
    const attrs: Record<string, string> = {};
    const ns: Record<string, string> = { ...top.ns };
    if (sp >= 0) {
      ATTR_RE.lastIndex = 0;
      const rest = body.slice(sp);
      let m: RegExpExecArray | null;
      while ((m = ATTR_RE.exec(rest))) {
        const key = m[1];
        const value = decodeEntities(m[3] ?? m[4] ?? "");
        if (key.startsWith("xmlns:")) ns[key.slice(6)] = value;
        else if (key === "xmlns") ns[""] = value;
        else attrs[key] = value;
      }
    }
    const node: XNode = { name, attrs, children: [], text: "", ns };
    top.children.push(node);
    if (++count > maxNodes) break;
    if (!selfClosing) stack.push(node);
  }
  return root;
}

export function findAll(node: XNode, name: string, out: XNode[] = []): XNode[] {
  for (const c of node.children) {
    if (c.name === name) out.push(c);
    findAll(c, name, out);
  }
  return out;
}
