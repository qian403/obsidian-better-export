import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { parseHTML } from "linkedom";
import { appendLinkedFiles, markdownWithTitle, getConcurrency, validateExportConfig } from "../src/utils/export";
import { blocksFromElement, cleanExportElement, plainText } from "../src/exporters/content";
import { exportDocx } from "../src/exporters/docx";
import { exportHtml } from "../src/exporters/html";
import { escapeRtf, exportRtf } from "../src/exporters/rtf";
import { getAnnotations, isExportFormat, pageLayout } from "../src/exporters/types";
import { rasterImage, parseDataImage } from "../src/exporters/images";
import { config, html } from "./fixtures";
const root = () => parseHTML(`<html><body>${html}</body></html>`).document.body;

 test("linked-note appendices are ordered, deduplicated, and only one hop", () => {
  const files = ["a", "b", "c", "d"].map((path) => ({ path }));
  const links = { a: ["a", "b", "missing", "c", "b"], b: ["d"], c: ["d"], d: [] };
  const result = appendLinkedFiles([files[0]], (file) => links[file.path], (link) => files.find((file) => file.path === link) ?? null);
  assert.deepEqual(result.map((file) => file.path), ["a", "b", "c"]);
});
test("invalid concurrency never reaches p-limit", () => {
  for (const value of ["", "0", "-2", "1.5", "abc", "Infinity", "9007199254740992"]) assert.equal(getConcurrency(value), 5);
  assert.equal(getConcurrency("3"), 3);
});
test("custom dimensions reject partial numbers, zero, NaN and infinity", () => {
  for (const value of ["", "0", "-1", "123abc", "Infinity", "NaN"]) assert.equal(validateExportConfig({ ...config, pageSize: "Custom", pageWidth: value, pageHeight: "297" }), "invalidPageSize");
  assert.equal(validateExportConfig({ ...config, pageSize: "Custom", pageWidth: "210.5", pageHeight: "297" }), undefined);
  assert.equal(validateExportConfig({ ...config, marginType: "3", marginTop: "-1" }), "invalidMargins");
  assert.equal(validateExportConfig({ ...config, marginType: "3", marginTop: "0" }), undefined);
  assert.equal(validateExportConfig({ ...config, marginType: "3", marginLeft: "210" }), "invalidMargins");
});
test("format registry rejects unknown formats and prototype keys", () => {
  for (const format of ["pdf", "docx", "html", "md", "txt", "rtf"]) assert.ok(isExportFormat(format));
  assert.equal(isExportFormat("doc"), false); assert.equal(isExportFormat("constructor"), false);
});
test("page geometry handles landscape, custom sizes and annotation space", () => {
  assert.equal(pageLayout({ ...config, landscape: true }).width, 297);
  assert.equal(pageLayout({ ...config, marginType: "0" }).margins.bottom, 12);
  assert.equal(pageLayout({ ...config, marginType: "0", footerLeftEnabled: false, footerRightEnabled: false }).margins.bottom, 0);
  assert.deepEqual(getAnnotations({ ...config, footerLeftEnabled: false }), { left: "", right: config.footerRightText });
});
test("DOM conversion preserves headings, nested numbering, emphasis, tables and page breaks", () => {
  const blocks = blocksFromElement(root());
  assert.equal(blocks[0].kind, "paragraph"); assert.equal(blocks[0].heading, 1);
  assert.ok(blocks.some((block) => block.kind === "table" && block.rows.length === 2));
  assert.ok(blocks.some((block) => block.kind === "pageBreak"));
  const text = plainText(blocks);
  assert.match(text, /3\. Third/); assert.match(text, /4\. Fourth/); assert.match(text, /• Nested/);
  assert.match(text, /☑ Done/); assert.match(text, /項目\t123/); assert.match(text, /最後一頁 😀/);
});
test("clean HTML removes scripts, event handlers, hidden titles and PDF-only markers", () => {
  const source = parseHTML(`<div><h1 class="__title__">Title</h1><h2>Details<a class="md-print-anchor" href="af://h2-1"></a></h2><a href="an://h2-1">Jump</a><img onerror="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">Bad</a></div>`).document.firstElementChild;
  const clean = cleanExportElement(source, false);
  assert.doesNotMatch(clean.outerHTML, /<script|onerror|javascript:|md-print-anchor|__title__/);
  assert.match(clean.outerHTML, /id="export-h2-1"/); assert.match(clean.outerHTML, /href="#export-h2-1"/);
});
test("DOCX is an OOXML ZIP with native footer alignment, page fields, rich content and images", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2foAAAAASUVORK5CYII=", "base64");
  const output = await exportDocx({ title: "測試文件", blocks: blocksFromElement(root()), config: { ...config, displayFooter: true }, resolveImage: async () => ({ data: png, type: "png", width: 1, height: 1 }) });
  const zip = await JSZip.loadAsync(output);
  const document = await zip.file("word/document.xml")!.async("string");
  const footer = await zip.file("word/footer1.xml")!.async("string");
  assert.match(document, /Heading1/); assert.match(document, /<w:tbl>/); assert.match(document, /<w:numPr>/);
  assert.match(document, /<w:bookmarkStart/); assert.match(document, /w:anchor="details"/);
  assert.match(document, /<w:b\/>/); assert.match(document, /<w:i\/>/); assert.match(document, /測試文件/);
  assert.match(footer, /內部文件/); assert.match(footer, /測試 © 2026/); assert.match(footer, /w:val="right"/);
  assert.match(footer, /PAGE/); assert.match(footer, /NUMPAGES/);
  assert.ok(Object.keys(zip.files).some((name) => name.startsWith("word/media/") && name.endsWith(".png")));
  assert.match(await zip.file("word/_rels/document.xml.rels")!.async("string"), /https:\/\/example.com/);
});
test("DOCX omits disabled annotations and page footer", async () => {
  const output = await exportDocx({ title: "Test", blocks: [], config: { ...config, footerLeftEnabled: false, footerRightEnabled: false } });
  const zip = await JSZip.loadAsync(output);
  assert.equal(zip.file("word/footer1.xml"), null);
});
test("HTML is standalone, escaped and has printable bottom-corner annotations", () => {
  const output = exportHtml({ title: '<title & "test">', html: html, config, language: "zh-TW" });
  assert.match(output, /<!doctype html>/); assert.match(output, /lang="zh-TW"/);
  assert.match(output, /&lt;title &amp; &quot;test&quot;&gt;/);
  assert.match(output, /position: fixed/); assert.match(output, /內部文件/); assert.match(output, /測試 © 2026/);
  assert.doesNotMatch(output, /<script/);
});
test("Paged.js export embeds only its own bundled script and margin annotations", () => {
  const output = exportHtml({ title: "Test", html, config: { ...config, pagedHtml: true, displayFooter: true }, pagedScript: 'window.test="</script>";' });
  assert.match(output, /@bottom-left/); assert.match(output, /counter\(pages\)/);
  assert.match(output, /<script>window.test="<\\\/script>";/);
  assert.doesNotMatch(output, /<footer/);
});
test("RTF preserves Unicode and repeatable footer fields", () => {
  const output = exportRtf({ title: "測試", blocks: blocksFromElement(root()), config: { ...config, displayFooter: true } });
  assert.ok(output.startsWith("{\\rtf1")); assert.match(output, /\\footer/); assert.match(output, /\\tqr/);
  assert.match(output, /NUMPAGES/); assert.match(output, /\\u-10179\?\\u-8704\?/); assert.match(output, /\\trowd/);
  assert.equal(escapeRtf("{\\}"), "\\{\\\\\\}");
});
test("image signatures and data URLs retain raster dimensions", () => {
  const src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2foAAAAASUVORK5CYII=";
  const parsed = parseDataImage(src)!;
  assert.equal(rasterImage(parsed.data)?.width, 1); assert.equal(rasterImage(parsed.data)?.height, 1);
  assert.equal(rasterImage(new Uint8Array([1, 2, 3])), undefined);
});

test("v1 embedded Markdown is decoded before portable document conversion", () => {
  const source = parseHTML(`<div><span class="markdown-embed" data-export-encoded="true">${encodeURIComponent('<p>嵌入 <strong>筆記</strong></p>')}</span></div>`).document.firstElementChild;
  const clean = cleanExportElement(source);
  assert.match(clean.outerHTML, /<strong>筆記<\/strong>/);
  assert.doesNotMatch(clean.outerHTML, /%3C|export-encoded/);
});

test("responsive image selection cannot replace an image inside an encoded embed", () => {
  const source = parseHTML(`<div><span data-export-encoded="true">${encodeURIComponent('<img src="embedded.png">')}</span><img src="normal.png"></div>`).document.firstElementChild;
  Object.defineProperty(source.querySelector("img"), "currentSrc", { value: "selected-normal.png" });
  const images = cleanExportElement(source).querySelectorAll("img");
  assert.equal(images[0].getAttribute("src"), "embedded.png");
  assert.equal(images[1].getAttribute("src"), "selected-normal.png");
});

test("Markdown titles are optional and keep YAML frontmatter at the top", () => {
  const source = "---\ntitle: Test\n---\nContent";
  assert.equal(markdownWithTitle(source, "File", false), source);
  assert.equal(markdownWithTitle(source, "File", true), "---\ntitle: Test\n---\n\n# File\n\nContent");
  assert.equal(markdownWithTitle("Content", "A [test]", true), "# A \\[test\\]\n\nContent");
});
