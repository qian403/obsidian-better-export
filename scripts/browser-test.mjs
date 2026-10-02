import { build } from "esbuild";
import esbuildSvelte from "esbuild-svelte";
import { sveltePreprocess } from "svelte-preprocess";
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { pagedScriptPath } from "./raw-plugin.mjs";
import { PDFDocument } from "pdf-lib";
const require = createRequire(import.meta.url);
const dir = resolve("artifacts/browser-qa");
await mkdir(dir, { recursive: true });
const modules = await build({ entryPoints: ["src/exporters/html.ts"], bundle: true, platform: "node", format: "cjs", write: false });
const htmlModule = resolve(".test-html.cjs");
await writeFile(htmlModule, modules.outputFiles[0].text);
const { exportHtml } = require(htmlModule);
await rm(htmlModule);
const ui = await build({ entryPoints: ["tests/browser-entry.ts"], bundle: true, platform: "browser", format: "iife", write: false,
  plugins: [esbuildSvelte({ compilerOptions: { css: "injected" }, preprocess: sveltePreprocess(), typescript: true })],
  alias: { obsidian: resolve("tests/mocks/obsidian.ts") }, define: { "process.env.NODE_ENV": '"production"' },
});
const browser = await chromium.launch(process.env.BETTER_EXPORT_BROWSER_PATH ? {
  executablePath: process.env.BETTER_EXPORT_BROWSER_PATH, headless: true,
} : { channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 960 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const css = await readFile("styles.css", "utf8");
  await page.setContent(`<html><head><style>${css}
    body { background:#202020;color:#ddd;font:14px system-ui;margin:24px;--text-muted:#aaa;--background-modifier-border:#444;--font-ui-small:13px;--font-ui-smaller:12px; }
    .setting-item { display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid #444; }
    .setting-item-info { flex:1; } .setting-item-control { display:flex;gap:8px; } .setting-item-description { color:#aaa;font-size:12px; }
    button,select,input { font:inherit; } .print-preview { padding:24px; }
    </style></head><body></body></html>`);
  await page.addScriptTag({ content: ui.outputFiles[0].text });
  const format = page.locator('select').first();
  await format.selectOption("docx");
  await page.getByText("在左下角顯示文字", { exact: true }).locator("..").locator("..").locator('input[type="checkbox"]').check();
  const left = page.locator('input[placeholder="輸入標註文字"]').first();
  await left.fill("公司內部使用");
  await page.getByText("在右下角顯示文字", { exact: true }).locator("..").locator("..").locator('input[type="checkbox"]').check();
  await page.locator('input[placeholder="輸入標註文字"]').last().fill("版本 2026");
  await page.waitForFunction(() => window.exportConfig?.footerRightText === "版本 2026");
  assert.equal(await page.evaluate(() => window.exportConfig.footerLeftText), "公司內部使用");
  assert.equal(await page.locator('input[type="range"]').count(), 0, "DOCX hides PDF-only scale");
  await page.screenshot({ path: resolve(dir, "settings-docx.png"), fullPage: true });
  await format.selectOption("txt");
  assert.equal(await page.getByText("紙張尺寸", { exact: true }).count(), 0);
  assert.equal(await page.getByText("此格式沒有固定頁面，啟用的標註會加入文件末尾。", { exact: true }).count(), 1);
  await format.selectOption("pdf");
  assert.equal(await page.locator('input[type="range"]').count(), 1);
  await page.getByRole("button", { name: "匯出", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "正在匯出…" }).isDisabled(), true);
  await page.getByRole("button", { name: "匯出", exact: true }).waitFor();
  await format.selectOption("html");
  assert.equal(await page.getByText("HTML 分頁（Paged.js）", { exact: true }).count(), 1);
  assert.deepEqual(errors, []);
  console.log("Svelte settings: format switching, annotations, export lock, and conditional controls passed.");

  const config = { format: "html", pageSize: "A4", marginType: "1", landscape: false, displayHeader: true, displayFooter: true,
    footerLeftEnabled: true, footerLeftText: '公司內部使用 <測試> "A"', footerRightEnabled: true, footerRightText: "版本 2026", pagedHtml: true };
  const content = '<h1>測試文件</h1>' + Array.from({ length: 70 }, (_, i) => `<h2>章節 ${i + 1}</h2><p>這是一段中文與 English 混合的內容，用來檢查頁面排版。每一頁的左下與右下都應該有標註。內容包含可讀文字，並且保留頁碼。</p>`).join("");
  const paged = exportHtml({ title: "測試文件", html: content, config, language: "zh-TW", pagedScript: await readFile(pagedScriptPath, "utf8") });
  const htmlPath = resolve(dir, "paged.html"); await writeFile(htmlPath, paged);
  await page.goto(pathToFileURL(htmlPath).href);
  await page.waitForFunction(() => document.querySelectorAll(".pagedjs_page").length > 1 && !!document.querySelector(".pagedjs_pages"), { timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll(".pagedjs_page .pagedjs_page_content h2").length === 70, { timeout: 30000 });
  const count = await page.locator(".pagedjs_page").count();
  assert.ok(count >= 5, `Expected several pages, got ${count}`);
  const orphanHeadings = await page.locator(".pagedjs_page_content main").evaluateAll((elements) =>
    elements.slice(0, -1).filter((el) => /^H[1-6]$/.test(el.lastElementChild?.tagName ?? "")).length);
  assert.equal(orphanHeadings, 0, "Headings stay with the following paragraph when paginated");
  const footers = await page.locator(".pagedjs_margin-bottom-left .pagedjs_margin-content").evaluateAll((elements) =>
    elements.map((el) => getComputedStyle(el, "::after").content));
  assert.equal(footers.length, count);
  assert.ok(footers.every((value) => value.includes("公司內部使用")), JSON.stringify(footers));
  await page.locator(".pagedjs_page").first().screenshot({ path: resolve(dir, "paged-preview.png") });
  const pdfPath = resolve(dir, "paged.pdf"); await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
  const pdf = await PDFDocument.load(await readFile(pdfPath));
  assert.equal(pdf.getPageCount(), count);
  assert.ok(Math.abs(pdf.getPage(0).getWidth() - 595.28) < 2);
  assert.deepEqual(errors, []);
  // Native footer templates have their own DOM and style context in Chromium.
  const nativeLeft = "公司內部使用", nativeRight = "版本 2026";
  await page.setContent(`<html><body>${content}</body></html>`);
  const nativePdf = await page.pdf({ format: "A4", displayHeaderFooter: true,
    headerTemplate: "<span></span>", footerTemplate: `<div style="width:100%;padding:0 10mm;font-size:9px;display:flex;"><span style="width:50%;text-align:left;">${nativeLeft}</span><span style="width:50%;text-align:right;">${nativeRight}</span></div>`,
    margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" } });
  await writeFile(resolve(dir, "native-footer.pdf"), nativePdf);
  assert.ok((await PDFDocument.load(nativePdf)).getPageCount() >= 5);
  console.log(`Offline Paged.js HTML: ${count} pages, repeated corner annotations, and A4 PDF printing passed.`);
} finally { await browser.close(); }
