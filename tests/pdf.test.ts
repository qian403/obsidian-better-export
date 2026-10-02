import { test } from "node:test";
import assert from "node:assert/strict";
import { makePrintOptions, exportToPDF, getOutputFile, writePdfFile } from "../src/pdf";
import { config, settings } from "./fixtures";
import { locales } from "../src/i18n";
import { setDialogResult } from "./mocks/electron";
import { notices } from "./mocks/obsidian";

test("PDF annotation toggles work independently of page-number footer", () => {
  const options = makePrintOptions({ ...settings, ...config });
  assert.equal(options.displayHeaderFooter, true);
  assert.match(options.footerTemplate!, /內部文件/); assert.match(options.footerTemplate!, /text-align:right/);
  assert.doesNotMatch(options.footerTemplate!, /pageNumber/);
  assert.ok(options.margins!.bottom! >= 12 / 25.4);
});
test("PDF annotation text is escaped and custom template is preserved", () => {
  const options = makePrintOptions({ ...settings, ...config, displayFooter: true, footerLeftText: '<script>& "注記"' });
  assert.match(options.footerTemplate!, /&lt;script&gt;&amp; &quot;注記&quot;/);
  assert.match(options.footerTemplate!, /pageNumber/); assert.doesNotMatch(options.footerTemplate!, /100vw/);
});
test("PDF can disable every footer and retains custom sizes/margins", () => {
  const options = makePrintOptions({ ...settings, ...config, footerLeftEnabled: false, footerRightEnabled: false,
    pageSize: "Custom", pageWidth: "210", pageHeight: "297", marginType: "3", marginLeft: "25.4" });
  assert.equal(options.displayHeaderFooter, false); assert.equal(options.margins!.left, 1);
  assert.equal((options.pageSize as { width: number }).width, 210 / 25.4);
});
test("canceling PDF destination returns no output", async () => {
  setDialogResult({ canceled: true });
  assert.equal(await getOutputFile("Test", false, locales["zh-TW"]), undefined);
});
test("PDF write errors are localized and report failure", async () => {
  const success = await writePdfFile("/a-directory-that-does-not-exist/test.pdf", new Uint8Array([1]), locales["zh-TW"]);
  assert.equal(success, false); assert.ok(notices.at(-1)?.startsWith("儲存 PDF 失敗"));
});
test("PDF engine failures cannot be mistaken for successful export", async () => {
  const success = await exportToPDF("unused.pdf", { ...settings, ...config },
    { printToPDF: async () => { throw new Error("print failure"); } } as never, {} as never, locales["zh-TW"]);
  assert.equal(success, false); assert.ok(notices.at(-1)?.includes("print failure"));
});
