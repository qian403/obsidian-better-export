import type { ExportConfigType } from "../modal";
import type { Block, Inline } from "./content";
import { getAnnotations, mmToTwips, pageLayout } from "./types";

/** RTF uses signed UTF-16 code units; this preserves CJK and emoji. */
export function escapeRtf(value: string): string {
  let output = "";
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    const char = value[i];
    if (char === "\\" || char === "{" || char === "}") output += `\\${char}`;
    else if (char === "\n") output += "\\line ";
    else if (char === "\r") continue;
    else if (char === "\t") output += "\\tab ";
    else if (code > 127) output += `\\u${code > 32767 ? code - 65536 : code}?`;
    else output += char;
  }
  return output;
}

export function exportRtf({ title, blocks, config }: {
  title: string; blocks: Block[]; config: ExportConfigType;
}): string {
  const layout = pageLayout(config);
  const { left, right } = getAnnotations(config);
  const contentWidth = mmToTwips(layout.width - layout.margins.left - layout.margins.right);
  const inline = (item: Inline) => {
    if (item.kind === "image") return escapeRtf(item.alt ? `[${item.alt}]` : "");
    const text = `{${item.bold ? "\\b " : ""}${item.italic ? "\\i " : ""}${item.underline ? "\\ul " : ""}${item.strike ? "\\strike " : ""}${item.code ? "\\f1 " : ""}${escapeRtf(item.text)}}`;
    return item.href && /^(https?:|mailto:)/i.test(item.href)
      ? `{\\field{\\*\\fldinst HYPERLINK "${escapeRtf(item.href.replace(/"/g, "%22"))}"}{\\fldrslt ${text}}}` : text;
  };
  const counters = new Map<string, number>();
  const convert = (items: Block[], insideCell = false): string => items.map((block) => {
    if (block.kind === "pageBreak") return "\\page\n";
    if (block.kind === "table") return block.rows.map((row) => {
      const cellWidth = Math.floor(contentWidth / Math.max(1, row.length));
      return "\\trowd" + row.map((_, i) => `\\cellx${cellWidth * (i + 1)}`).join("") + "\n" +
        row.map((cell) => `\\intbl ${convert(cell, true)}\\cell `).join("") + "\\row\n";
    }).join("");
    let prefix = "";
    if (block.list) {
      const count = counters.get(block.list.id) ?? block.list.start;
      counters.set(block.list.id, count + 1);
      prefix = escapeRtf(block.list.ordered ? `${count}. ` : "• ");
    }
    const heading = block.heading ? `\\b\\fs${Math.max(24, 40 - block.heading * 3)} ` : "\\fs22 ";
    return `{\\pard${insideCell ? "\\intbl" : ""}\\sa120${block.heading ? "\\keepn" : ""}${block.quote ? "\\li360" : ""}${block.list ? `\\li${360 * (block.list.level + 1)}` : ""}${block.code ? "\\f1" : "\\f0"} ${heading}${prefix}${block.children.map(inline).join("")}\\par}\n`;
  }).join("");
  const footer = left || right || config.displayFooter ? `{\\footer\\pard\\fs18\\tqc\\tx${Math.round(contentWidth / 2)}\\tqr\\tx${contentWidth} ${escapeRtf(left)}\\tab ${config.displayFooter ? '{\\field{\\*\\fldinst PAGE}{\\fldrslt 1}} / {\\field{\\*\\fldinst NUMPAGES}{\\fldrslt 1}}' : ""}\\tab ${escapeRtf(right)}\\par}` : "";
  return `{\\rtf1\\ansi\\deff0\\uc1{\\fonttbl{\\f0 Calibri;}{\\f1 Courier New;}}{\\info{\\title ${escapeRtf(title)}}}
\\paperw${mmToTwips(layout.width)}\\paperh${mmToTwips(layout.height)}${config.landscape ? "\\landscape" : ""}
\\margt${mmToTwips(layout.margins.top)}\\margb${mmToTwips(layout.margins.bottom)}\\margl${mmToTwips(layout.margins.left)}\\margr${mmToTwips(layout.margins.right)}\\footery${mmToTwips(5)}
${config.displayHeader ? `{\\header\\pard\\qc ${escapeRtf(title)}\\par}` : ""}${footer}
${convert(blocks)}}\n`;
}
