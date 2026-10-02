# Obsidian Better Export

English | [繁體中文](./README.zh-TW.md) | [简体中文](./README.zh.md)

Export Obsidian notes to PDF, Word, HTML, Markdown, plain text, and RTF, with previews, combined or batch exports, and custom footer annotations.

This project is a fork of [Better Export PDF by l1xnan](https://github.com/l1xnan/obsidian-better-export-pdf), maintained and extended by [qian403](https://github.com/qian403). See [Origin and license](#origin-and-license) for attribution.

## Features

- Six export formats: PDF, DOCX, HTML, Markdown, TXT, and RTF.
- Content preview for checking notes and PDF page preview for checking pagination.
- Optional text in the bottom-left and bottom-right corners of each page in paged formats.
- Combined folder exports, separate files in batch exports, and a TOC note for custom ordering.
- Optional appendices containing directly linked notes, without recursive expansion.
- English, Traditional Chinese, and Simplified Chinese, or follow Obsidian's language.
- PDF bookmarks, metadata, internal links, custom page sizes, margins, and header/footer templates.

## Installation

This is a desktop-only plugin. The plugin ID for this fork is `better-export`.

Build an installation package using the [development commands](#development), or use a packaged ZIP if one is available on this fork's [Releases page](https://github.com/qian403/obsidian-better-export/releases).

1. Extract `dist/obsidian-better-export.zip` from a local build, or the downloaded plugin package.
2. Place the `better-export` folder in `Your Vault/.obsidian/plugins/`.
3. Check that it contains `main.js`, `manifest.json`, and `styles.css`.
4. Reload Obsidian and enable **Better Export** in Community plugins.

To migrate settings from the original plugin, copy `.obsidian/plugins/better-export-pdf/data.json` into `.obsidian/plugins/better-export/`. Disable the original plugin to avoid duplicate export menus.

For a separate test vault and a manual checklist, see [TESTING.md](./TESTING.md).

## Quick start

1. Right-click a note and select **Export file…**, or run **Better Export: Export current file** from the command palette.
2. Choose the **Export format** on the right.
3. Adjust the available page settings and optional footer annotations.
4. Check the preview, then click **Export** and choose a destination.

Cancelling the save dialog keeps the export window open.

### Understanding the preview

| Preview | What it shows |
| --- | --- |
| Content preview | A quick view of note text and images. It does not show final page breaks, headers, or footers. |
| PDF page preview | PDF pagination, margins, headers, and footers. It regenerates when settings change. |

**Preview mode does not change the export format.** Choose the file format in the settings on the right. PDF page preview is available when exporting PDF with the default **v2** engine. Other formats and the v1 engine show content preview; open the exported file to check its final formatting.

### Formats and footer annotations

| Format | Content | Annotation placement |
| --- | --- | --- |
| PDF | Print layout, bookmarks, metadata, and internal links | Every page |
| DOCX | Editable headings, lists, tables, links, and images | Word page footer |
| HTML | Standalone page with embedded local images | On printed pages; optional offline pagination |
| Markdown | Original Markdown, with optional file-name titles | End of the document |
| TXT | UTF-8 text with readable lists and tables | End of the document |
| RTF | Headings, emphasis, tables, and links; image descriptions | Page footer |

Enable either or both corner annotations and enter the text in the export dialog. These annotations are independent of the PDF page-number footer.

DOCX layout depends on Word or LibreOffice and does not use Obsidian theme CSS or PDF HTML header/footer templates. Audio and video are not embedded in DOCX or RTF.

For HTML exports, **Paginated HTML (Paged.js)** adds pagination to the exported HTML file. It works offline and requires JavaScript in the browser. This option is separate from the preview mode in the export dialog.

## Multiple notes

- **Combine a folder:** right-click a folder and choose **Export folder…**. Notes are ordered by relative path.
- **Export separate files:** right-click a folder, then choose **Export documents… → Export each file…**. Relative subfolders are preserved so identically named notes stay separate.
- **Append linked notes:** enable **Append linked notes** in plugin settings. Combined exports append directly linked Markdown notes once, in link order, without recursively following links in the appended notes.

To choose a custom order, create and export a TOC note:

```markdown
---
toc: true
---

# Contents

[[Note 1|Introduction]]
[[Note 2]]
[[Note 3]]
```

Export this note rather than its containing folder. The TOC note comes first, followed by the linked notes. PDF, DOCX, and HTML preserve supported document-internal links.

## PDF customization

In plugin settings, configure **Header template** and **Footer template**. For example, this footer displays the current page and total page count:

```html
<div style="width:100%;font-size:10px;text-align:center;">
  <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>
```

The templates also support the `date`, `title`, and `url` classes. A note's properties can override `headerTemplate` and `footerTemplate`.

Enable **PDF metadata** to include note properties such as `title`, `author`, `keywords`, `subject`, `creator`, `created_at`, and `updated_at`.

Use Obsidian CSS snippets with `@media print` to customize print styles. Enable **Enable CSS snippet selection** in plugin settings to choose a snippet that is not globally enabled. For an explicit page break, add this to a note:

```html
<div class="break-page"></div>
```

The plugin includes a print rule for this class. For custom sheet dimensions, choose **Custom** under **Page size** and enter the width and height.

## Development

```sh
ELECTRON_SKIP_BINARY_DOWNLOAD=1 pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm test:browser
pnpm package
```

Browser tests use installed Chrome, or a Chromium executable specified by `BETTER_EXPORT_BROWSER_PATH`. They include mocked Obsidian APIs; use the manual checklist in [TESTING.md](./TESTING.md) to verify the full Obsidian workflow.

`pnpm package` produces:

- `dist/obsidian-better-export.zip` — installable plugin.
- `dist/obsidian-better-export-test-vault.zip` — a separate vault with sample notes and the plugin installed.

`pnpm build` uses esbuild. `pnpm build:vite` writes an alternative build to `dist/vite`.

## Origin and license

This project is modified from **[l1xnan/obsidian-better-export-pdf](https://github.com/l1xnan/obsidian-better-export-pdf)**. The original author, **l1xnan**, and upstream contributors built the PDF export foundation used here.

This fork, **[qian403/obsidian-better-export](https://github.com/qian403/obsidian-better-export)**, extends that foundation with multiple document formats, language selection, corner annotations, linked-note appendices, and clearer preview controls. Its plugin ID is `better-export`; the original project's ID is `better-export-pdf`.

The project uses the [MIT License](./LICENSE), retaining the original copyright and license notice.

## Feedback

Report problems or suggest features through [this fork's GitHub Issues](https://github.com/qian403/obsidian-better-export/issues). Include the export format, plugin version, Obsidian version, and steps to reproduce the issue.
