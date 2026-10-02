import {
  AlignmentType, Bookmark, Document, ExternalHyperlink, Footer, Header,
  HeadingLevel, ImageRun, InternalHyperlink, LevelFormat, PageBreak, PageNumber,
  PageOrientation, Packer, Paragraph, TabStopType, Table, TableCell, TableRow,
  TextRun, WidthType, type ParagraphChild,
} from "docx";
import type { ExportConfigType } from "../modal";
import type { Block, Inline } from "./content";
import { getAnnotations, mmToTwips, pageLayout } from "./types";

export interface ImageAsset {
  data: Uint8Array;
  type: "png" | "jpg" | "gif" | "bmp";
  width: number;
  height: number;
}
export type ImageResolver = (src: string) => Promise<ImageAsset | undefined>;
const bookmarkName = (value: string) => value.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 40);

export async function exportDocx({ title, blocks, config, resolveImage, author }: {
  title: string; blocks: Block[]; config: ExportConfigType;
  resolveImage?: ImageResolver; author?: string;
}): Promise<Uint8Array> {
  const layout = pageLayout(config);
  const { left, right } = getAnnotations(config);
  const contentWidth = Math.max(10, layout.width - layout.margins.left - layout.margins.right);
  const maxImageWidth = contentWidth * 96 / 25.4;
  const maxImageHeight = Math.max(10, layout.height - layout.margins.top - layout.margins.bottom) * 96 / 25.4;
  const numbering = new Map<string, { level: number; start: number }>();
  const headingLevels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];

  async function runs(items: Inline[]): Promise<ParagraphChild[]> {
    const output: ParagraphChild[] = [];
    for (const item of items) {
      if (item.kind === "image") {
        const image = await resolveImage?.(item.src);
        if (image) {
          const ratio = Math.min(1, maxImageWidth / image.width, maxImageHeight / image.height);
          output.push(new ImageRun({ type: image.type, data: image.data,
            transformation: { width: Math.round(image.width * ratio), height: Math.round(image.height * ratio) },
            altText: { title: item.alt, description: item.alt, name: item.alt || "Image" } }));
        } else if (item.alt) output.push(new TextRun(`[${item.alt}]`));
        continue;
      }
      const pieces = item.text.split("\n");
      const children = pieces.map((text, i) => new TextRun({ text,
        break: i ? 1 : undefined, bold: item.bold, italics: item.italic,
        underline: item.underline ? {} : undefined, strike: item.strike,
        font: item.code ? "Courier New" : undefined,
        style: item.href ? "Hyperlink" : undefined }));
      if (item.href?.startsWith("#")) {
        output.push(new InternalHyperlink({ anchor: bookmarkName(item.href.slice(1)), children }));
      } else if (item.href && /^(https?:|mailto:|obsidian:)/i.test(item.href)) {
        output.push(new ExternalHyperlink({ link: item.href, children }));
      } else output.push(...children);
    }
    return output;
  }

  async function convert(items: Block[]): Promise<(Paragraph | Table)[]> {
    const output: (Paragraph | Table)[] = [];
    for (const block of items) {
      if (block.kind === "pageBreak") {
        output.push(new Paragraph({ children: [new PageBreak()] }));
      } else if (block.kind === "table") {
        if (!block.rows.length) continue;
        output.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE },
          rows: await Promise.all(block.rows.map(async (row, i) => new TableRow({
            tableHeader: i === 0,
            children: await Promise.all(row.map(async (cell) => {
              const children = await convert(cell);
              return new TableCell({ children: children.length ? children : [new Paragraph("")] });
            })),
          }))) }));
      } else {
        let children = await runs(block.children);
        if (block.id) children = [new Bookmark({ id: bookmarkName(block.id), children })];
        if (block.list?.ordered) numbering.set(block.list.id, { level: block.list.level, start: block.list.start });
        output.push(new Paragraph({ children,
          heading: block.heading ? headingLevels[block.heading - 1] : undefined,
          keepNext: !!block.heading, pageBreakBefore: block.breakBefore,
          bullet: block.list && !block.list.ordered ? { level: block.list.level } : undefined,
          numbering: block.list?.ordered ? { reference: block.list.id, level: block.list.level } : undefined,
          indent: block.quote ? { left: 360, right: 360 } : undefined,
          spacing: { after: block.heading ? 180 : 120 },
          run: block.code ? { font: "Courier New", size: 20 } : undefined,
        }));
      }
    }
    return output;
  }

  const children = await convert(blocks);
  const footer = left || right || config.displayFooter ? new Footer({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.CENTER, position: mmToTwips(contentWidth / 2) },
      { type: TabStopType.RIGHT, position: mmToTwips(contentWidth) }],
    children: [new TextRun({ text: left, size: 18 }), new TextRun("\t"),
      ...(config.displayFooter ? [new TextRun({ children: [PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES], size: 18 })] : []),
      new TextRun("\t"), new TextRun({ text: right, size: 18 })],
  })] }) : undefined;
  const doc = new Document({ title, creator: author ?? "Obsidian Better Export",
    styles: { default: { document: { run: { font: "Calibri", size: 22 }, paragraph: { spacing: { line: 276 } } } } },
    numbering: { config: Array.from(numbering, ([reference, { start }]) => ({ reference,
      levels: Array.from({ length: 9 }, (_, level) => ({ level, start, format: LevelFormat.DECIMAL,
        text: `%${level + 1}.`, alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } } })),
    })) },
    sections: [{ properties: { page: {
      // DOCX stores the unswapped size and a separate orientation flag.
      size: { width: mmToTwips(config.landscape ? layout.height : layout.width),
        height: mmToTwips(config.landscape ? layout.width : layout.height),
        orientation: config.landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
      margin: { top: mmToTwips(layout.margins.top), bottom: mmToTwips(layout.margins.bottom),
        left: mmToTwips(layout.margins.left), right: mmToTwips(layout.margins.right),
        header: mmToTwips(5), footer: mmToTwips(5) },
    } }, headers: config.displayHeader ? { default: new Header({ children: [new Paragraph({ text: title, alignment: AlignmentType.CENTER })] }) } : undefined,
    footers: footer ? { default: footer } : undefined,
    children: children.length ? children : [new Paragraph("")],
    }],
  });
  return new Uint8Array(await Packer.toArrayBuffer(doc));
}
