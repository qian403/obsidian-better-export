import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { parseHTML } from "linkedom";
import JSZip from "jszip";
import { exportDocuments } from "../src/exporters";
import { TFile, TFolder } from "./mocks/obsidian";
import { setDialogResult } from "./mocks/electron";
import { locales } from "../src/i18n";
import { config, html, settings } from "./fixtures";

const files = [new TFile("Folder/one/Note.md"), new TFile("Folder/two/Note.md")];
const texts = ["---\ntitle: First\n---\n# First\n\nText", "---\ntitle: Second\n---\n# Second\n\nOther"];
function setup(multiple = false) {
  const plugin = { settings, app: { vault: {
    getFiles: () => files, getResourcePath: (file) => `app://local/${file.path}`,
    cachedRead: (file) => Promise.resolve(texts[files.findIndex((candidate) => candidate.path === file.path)]),
  }, metadataCache: { getFirstLinkpathDest: () => null } } };
  const modal = { file: multiple ? new TFolder("Folder") : files[0], multiplePdf: multiple,
    i18n: locales["zh-TW"], getAllFilesV2: async () => ({ data: (multiple ? files : [files[0]]).map((file) => ({ file })) }) };
  const docs = (multiple ? files : [files[0]]).map((file) => ({ file, doc: parseHTML(`<html><body>${html}</body></html>`).document }));
  return { modal, plugin, getDocuments: async () => docs } as never;
}

test("canceling non-PDF export never starts conversion", async () => {
  setDialogResult({ canceled: true });
  let rendered = false;
  assert.equal(await exportDocuments({ ...setup(), config: { ...config, format: "docx" }, getDocuments: async () => { rendered = true; return []; } }), false);
  assert.equal(rendered, false);
});
for (const format of ["docx", "html", "md", "txt", "rtf"] as const) {
  test(`end-to-end ${format} file export writes a usable document`, async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "better-export-test-"));
    try {
      const filePath = path.join(dir, `Note.${format}`);
      setDialogResult({ canceled: false, filePath });
      assert.equal(await exportDocuments({ ...setup(), config: { ...config, format } }), true);
      const data = await fs.readFile(filePath);
      assert.ok(data.length > 10);
      if (format === "docx") assert.ok((await JSZip.loadAsync(data)).file("word/document.xml"));
      else if (format === "html") assert.ok(data.toString().startsWith("<!doctype html>"));
      else if (format === "rtf") assert.ok(data.toString().startsWith("{\\rtf1"));
      else assert.match(data.toString(), /內部文件/);
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
  });
}
test("batch export retains subfolders for duplicate basenames", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "better-export-batch-"));
  try {
    setDialogResult({ canceled: false, filePaths: [dir] });
    assert.equal(await exportDocuments({ ...setup(true), config: { ...config, format: "md" } }), true);
    assert.match(await fs.readFile(path.join(dir, "one/Note.md"), "utf8"), /First/);
    assert.match(await fs.readFile(path.join(dir, "two/Note.md"), "utf8"), /Second/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
