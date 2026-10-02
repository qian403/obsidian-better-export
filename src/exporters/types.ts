import type { ExportConfigType } from "../modal";
import { PageSize } from "../constant";

export const exportFormats = {
  pdf: { extension: "pdf", label: "PDF (.pdf)", paged: true },
  docx: { extension: "docx", label: "Word (.docx)", paged: true },
  html: { extension: "html", label: "HTML (.html)", paged: true },
  md: { extension: "md", label: "Markdown (.md)", paged: false },
  txt: { extension: "txt", label: "Plain text (.txt)", paged: false },
  rtf: { extension: "rtf", label: "Rich text (.rtf)", paged: true },
} as const;
export type ExportFormat = keyof typeof exportFormats;
export type NonPdfFormat = Exclude<ExportFormat, "pdf">;

export function isExportFormat(value: unknown): value is ExportFormat {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(exportFormats, value);
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

export function getAnnotations(config: ExportConfigType) {
  return {
    left: config.footerLeftEnabled ? config.footerLeftText?.trim() ?? "" : "",
    right: config.footerRightEnabled ? config.footerRightText?.trim() ?? "" : "",
  };
}

/** Page geometry in millimeters, shared by DOCX, HTML and RTF. */
export function pageLayout(config: ExportConfigType) {
  let [width, height] = config.pageSize === "Custom"
    ? [Number(config.pageWidth), Number(config.pageHeight)]
    : PageSize[config.pageSize as string] ?? PageSize.A4;
  if (config.landscape) [width, height] = [height, width];
  const annotations = getAnnotations(config);
  const margins = config.marginType === "0" ? { top: 0, bottom: 0, left: 0, right: 0 }
    : config.marginType === "2" ? { top: 2.54, bottom: 2.54, left: 2.54, right: 2.54 }
    : config.marginType === "3" ? {
      top: Number(config.marginTop), bottom: Number(config.marginBottom),
      left: Number(config.marginLeft), right: Number(config.marginRight),
    } : { top: 10, bottom: 10, left: 10, right: 10 };
  // Reserve space so page footers cannot overlap the last line of content.
  if (annotations.left || annotations.right || config.displayFooter) margins.bottom = Math.max(margins.bottom, 12);
  if (config.displayHeader) margins.top = Math.max(margins.top, 12);
  return { width, height, margins };
}
export const mmToTwips = (mm: number) => Math.round(mm * 1440 / 25.4);
