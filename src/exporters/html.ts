import type { ExportConfigType } from "../modal";
import { escapeHtml, getAnnotations, pageLayout } from "./types";

export function exportHtml({ title, html, config, language = "en", pagedScript }: {
  title: string; html: string; config: ExportConfigType; language?: string; pagedScript?: string;
}): string {
  const { width, height, margins } = pageLayout(config);
  const { left, right } = getAnnotations(config);
  const paginated = config.pagedHtml && !!pagedScript;
  const cssString = (value: string) => JSON.stringify(value).replace(/</g, "\\3c ");
  const marginBoxes = paginated ? `
    @bottom-left { content: ${cssString(left)}; font-size: 9pt; }
    @bottom-right { content: ${cssString(right)}; font-size: 9pt; }
    ${config.displayFooter ? '@bottom-center { content: counter(page) " / " counter(pages); font-size: 9pt; }' : ""}
    ${config.displayHeader ? `@top-center { content: ${cssString(title)}; font-size: 9pt; }` : ""}
  ` : "";
  const footer = !paginated && (left || right) ? `<footer class="export-page-footer"><span>${escapeHtml(left)}</span><span>${escapeHtml(right)}</span></footer>` : "";
  return `<!doctype html>
<html lang="${escapeHtml(language)}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; font-family: system-ui, sans-serif; color: #222; background: white; line-height: 1.65; }
  main { max-width: 800px; margin: auto; overflow-wrap: anywhere; }
  h1, h2, h3, h4, h5, h6 { line-height: 1.3; break-after: avoid; page-break-after: avoid; }
  p { orphans: 3; widows: 3; }
  img, svg { max-width: 100%; height: auto; }
  table { width: 100%; border-collapse: collapse; margin: 1em 0; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: start; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  pre { padding: 12px; background: #f5f5f5; white-space: pre-wrap; overflow-wrap: anywhere; }
  code { font-family: monospace; }
  blockquote { border-left: 3px solid #ccc; padding-left: 16px; margin-left: 0; color: #555; }
  a { color: #215eab; }
  .break-page { break-before: page; }
  .export-page-footer { display: flex; justify-content: space-between; gap: 16px; max-width: 800px; margin: 32px auto 0; font-size: 10px; }
  .export-page-footer span { max-width: 48%; overflow-wrap: anywhere; white-space: pre-wrap; }
  .export-page-footer span:last-child { text-align: right; }
  @page { size: ${width}mm ${height}mm; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; ${marginBoxes} }
  ${paginated ? `.pagedjs_page { margin: 16px auto; box-shadow: 0 0 0 1px #ddd; background: white; }
    .pagedjs_page_content main { max-width: none; }` : ""}
  @media print {
    body { padding: 0; }
    main { max-width: none; }
    .pagedjs_page { margin: 0; box-shadow: none; }
    .export-page-footer { position: fixed; bottom: -8mm; left: 0; right: 0; margin: 0; max-width: none; }
  }
</style></head>
<body><main>${html}</main>${footer}${paginated ? `<script>${pagedScript!.replace(/<\/script/gi, "<\\/script")}</script>` : ""}</body></html>\n`;
}
