import type { ExportConfigType } from "../src/modal";
import type { BetterExportPluginSettings } from "../src/main";
export const config: ExportConfigType = {
  format: "pdf", pageSize: "A4", marginType: "1", open: false, landscape: false,
  scale: 100, showTitle: true, displayHeader: false, displayFooter: false,
  marginTop: "10", marginBottom: "10", marginLeft: "10", marginRight: "10",
  footerLeftEnabled: true, footerLeftText: "內部文件 — confidential",
  footerRightEnabled: true, footerRightText: "測試 © 2026",
};
export const settings: BetterExportPluginSettings = {
  language: "zh-TW", includeLinkedNotes: false, showTitle: true, maxLevel: "6",
  displayHeader: false, displayFooter: false, headerTemplate: "<span class=title></span>",
  footerTemplate: '<div style="width:100vw"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  printBackground: false, generateTaggedPDF: false, displayMetadata: false,
  isTimestamp: false, debug: false, enabledCss: false, concurrency: "5", version: "2",
};
export const html = `<section class="markdown-preview-view" data-export-path="Note.md">
<h1 class="__title__" id="title">測試文件</h1>
<h2 id="details">Details</h2><p>Hello <strong>bold</strong>, <em>italic</em>, <del>removed</del> and <code>code</code>.
<a href="https://example.com">External</a> <a href="#details">Internal</a>.</p>
<ol start="3"><li>Third</li><li>Fourth<ul><li>Nested</li></ul></li></ol>
<ul><li><input type="checkbox" checked>Done</li></ul>
<blockquote><p>Quote</p></blockquote>
<table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody><tr><td>項目</td><td>123</td></tr></tbody></table>
<pre><code>const x = 1;\nconsole.log(x);</code></pre>
<img src="image.png" alt="Sample image">
<div class="break-page"></div><p>最後一頁 😀</p></section>`;
