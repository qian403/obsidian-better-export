export interface InlineStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  href?: string;
}
export type Inline = ({ kind: "text"; text: string } & InlineStyle) |
  { kind: "image"; src: string; alt: string; width?: number; height?: number };
export type Block = {
  kind: "paragraph";
  children: Inline[];
  heading?: number;
  id?: string;
  code?: boolean;
  quote?: boolean;
  list?: { ordered: boolean; level: number; id: string; start: number };
  breakBefore?: boolean;
} | { kind: "table"; rows: Block[][][] } | { kind: "pageBreak" };
export interface ExportContent { title: string; html: string; blocks: Block[]; }

const ignored = new Set(["SCRIPT", "STYLE", "BUTTON", "NOSCRIPT"]);

/** Remove UI/print markers and turn PDF-only links into portable HTML anchors. */
export function cleanExportElement(source: HTMLElement, showTitle = true): HTMLElement {
  const root = source.cloneNode(true) as HTMLElement;
  root.style.removeProperty("display");
  // Select responsive candidates before decoding v1 embeds, which can add more img nodes.
  const originals = source.querySelectorAll<HTMLImageElement>("img");
  root.querySelectorAll<HTMLImageElement>("img").forEach((image, i) => {
    if (originals[i]?.currentSrc) image.src = originals[i].currentSrc;
  });
  // Engine v1 URL-encodes embedded Markdown before transporting it to a webview.
  while (root.querySelector('[data-export-encoded="true"]')) {
    const embed = root.querySelector<HTMLElement>('[data-export-encoded="true"]')!;
    try { embed.innerHTML = decodeURIComponent(embed.innerHTML); } catch { /* Retain malformed content. */ }
    delete embed.dataset.exportEncoded;
  }
  root.querySelectorAll<HTMLAnchorElement>("a.md-print-anchor").forEach((marker) => {
    const flag = marker.getAttribute("href")?.replace(/^af:\/\//, "");
    if (flag && marker.parentElement) marker.parentElement.id = `export-${flag}`;
    marker.remove();
  });
  root.querySelectorAll<HTMLAnchorElement>('a[href^="an://"]').forEach((link) => {
    link.setAttribute("href", `#export-${link.getAttribute("href")!.slice(5)}`);
  });
  root.querySelectorAll("script, style, button, .copy-code-button, .heading-collapse-indicator, .collapse-indicator, .metadata-container").forEach((el) => el.remove());
  root.querySelectorAll<HTMLElement>("h1.__title__").forEach((title) => {
    if (!showTitle) title.remove();
    else title.style.removeProperty("display");
  });
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.toLowerCase().startsWith("on")) el.removeAttribute(attr.name);
    }
    if (el.tagName === "A") {
      const href = el.getAttribute("href") ?? "";
      if (/^\s*(javascript|vbscript|data):/i.test(href)) el.removeAttribute("href");
    }
    if (el.tagName === "IFRAME" || el.tagName === "OBJECT" || el.tagName === "EMBED") el.remove();
  });
  return root;
}

function inlineNodes(node: Node, style: InlineStyle = {}): Inline[] {
  if (node.nodeType === 3) return [{ kind: "text", text: node.textContent ?? "", ...style }];
  if (node.nodeType !== 1) return [];
  const el = node as HTMLElement;
  if (ignored.has(el.tagName)) return [];
  if (el.tagName === "BR") return [{ kind: "text", text: "\n", ...style }];
  if (el.tagName === "INPUT") return el.getAttribute("type") === "checkbox"
    ? [{ kind: "text", text: el.hasAttribute("checked") ? "☑ " : "☐ ", ...style }] : [];
  if (el.tagName === "IMG") return [{ kind: "image", src: el.getAttribute("src") ?? "",
    alt: el.getAttribute("alt") ?? "", width: Number(el.getAttribute("width")) || undefined,
    height: Number(el.getAttribute("height")) || undefined }];
  const next = { ...style };
  if (["STRONG", "B"].includes(el.tagName)) next.bold = true;
  if (["EM", "I"].includes(el.tagName)) next.italic = true;
  if (el.tagName === "U") next.underline = true;
  if (["DEL", "S", "STRIKE"].includes(el.tagName)) next.strike = true;
  if (el.tagName === "CODE") next.code = true;
  if (el.tagName === "A") next.href = el.getAttribute("href") ?? undefined;
  return Array.from(el.childNodes).flatMap((child) => inlineNodes(child, next));
}

export function blocksFromElement(root: HTMLElement): Block[] {
  let listId = 0;
  function walk(container: HTMLElement, quote = false, listLevel = 0): Block[] {
    const result: Block[] = [];
    let pending: Inline[] = [];
    const flush = () => {
      if (pending.some((item) => item.kind === "image" || item.text.trim())) result.push({ kind: "paragraph", children: pending, quote });
      pending = [];
    };
    for (const node of Array.from(container.childNodes)) {
      if (node.nodeType === 3) { pending.push(...inlineNodes(node)); continue; }
      if (node.nodeType !== 1) continue;
      const el = node as HTMLElement;
      if (ignored.has(el.tagName)) continue;
      if (el.classList.contains("break-page")) { flush(); result.push({ kind: "pageBreak" }); continue; }
      if (/^H[1-6]$/.test(el.tagName) || ["P", "PRE"].includes(el.tagName)) {
        flush();
        result.push({ kind: "paragraph", children: inlineNodes(el), quote,
          heading: /^H[1-6]$/.test(el.tagName) ? Number(el.tagName[1]) : undefined,
          id: el.id || undefined, code: el.tagName === "PRE" });
      } else if (el.tagName === "UL" || el.tagName === "OL") {
        flush();
        const id = `list-${++listId}`;
        const start = Number(el.getAttribute("start")) || 1;
        for (const li of Array.from(el.children).filter((child) => child.tagName === "LI")) {
          const items = walk(li as HTMLElement, quote, listLevel + 1);
          const first = items.find((item) => item.kind === "paragraph");
          if (first?.kind === "paragraph") first.list = { ordered: el.tagName === "OL", level: Math.min(listLevel, 8), id, start };
          result.push(...items);
        }
      } else if (el.tagName === "TABLE") {
        flush();
        const rows = Array.from(el.querySelectorAll("tr")).filter((row) => row.closest("table") === el);
        result.push({ kind: "table", rows: rows.map((row) => Array.from(row.children)
          .filter((cell) => ["TH", "TD"].includes(cell.tagName))
          .map((cell) => walk(cell as HTMLElement, quote, listLevel))) });
      } else if (el.tagName === "HR") {
        flush(); result.push({ kind: "paragraph", children: [{ kind: "text", text: "──────────" }] });
      } else if (["DIV", "SECTION", "ARTICLE", "MAIN", "BLOCKQUOTE", "FIGURE", "FIGCAPTION", "BODY"].includes(el.tagName)) {
        flush(); result.push(...walk(el, quote || el.tagName === "BLOCKQUOTE", listLevel));
      } else { pending.push(...inlineNodes(el)); }
    }
    flush();
    return result;
  }
  return walk(root);
}

export function plainText(blocks: Block[]): string {
  const counters = new Map<string, number>();
  return blocks.map((block) => {
    if (block.kind === "pageBreak") return "\f";
    if (block.kind === "table") return block.rows.map((row) => row.map((cell) => plainText(cell)).join("\t")).join("\n");
    let text = block.children.map((item) => item.kind === "text" ? item.text : (item.alt ? `[${item.alt}]` : "")).join("");
    if (block.list) {
      const count = counters.get(block.list.id) ?? block.list.start;
      counters.set(block.list.id, count + 1);
      text = "  ".repeat(block.list.level) + (block.list.ordered ? `${count}. ` : "• ") + text.trim();
    }
    return text;
  }).join("\n\n").trim();
}
