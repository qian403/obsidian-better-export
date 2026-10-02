import { readFile, writeFile, mkdir, cp, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import JSZip from "jszip";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
if (manifest.id !== pkg.obsidian.id || manifest.version !== pkg.version) throw new Error("Manifest and package metadata do not match.");
const output = resolve("dist");
const pluginDir = join(output, manifest.id);
await mkdir(pluginDir, { recursive: true });
const zip = new JSZip();
for (const name of ["main.js", "manifest.json", "styles.css"]) {
  const bytes = await readFile(name);
  await writeFile(join(pluginDir, name), bytes);
  zip.file(`${manifest.id}/${name}`, bytes);
}
const zipOptions = { type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } };
await writeFile(join(output, `${pkg.name}.zip`), await zip.generateAsync(zipOptions));

// A separate scratch vault lets users test without touching their personal notes.
const vault = join(output, "Better Export Test Vault");
await rm(vault, { recursive: true, force: true });
await mkdir(join(vault, ".obsidian/plugins"), { recursive: true });
await cp(pluginDir, join(vault, ".obsidian/plugins", manifest.id), { recursive: true });
await writeFile(join(vault, ".obsidian/community-plugins.json"), JSON.stringify([manifest.id]));
await writeFile(join(vault, ".obsidian/plugins", manifest.id, "data.json"), JSON.stringify({
  language: "zh-TW", includeLinkedNotes: true, version: "2", concurrency: "5",
  prevConfig: { format: "pdf", pageSize: "A4", marginType: "1", scale: 100,
    open: false, showTitle: true, landscape: false, displayHeader: true, displayFooter: true,
    footerLeftEnabled: true, footerLeftText: "內部測試文件", footerRightEnabled: true, footerRightText: "Better Export" },
}, null, 2));
await writeFile(join(vault, "開始測試.md"), `---
title: Better Export 測試文件
author: Test User
keywords: [export, 中文, test]
---

# 匯出測試

右鍵這份筆記 → **匯出檔案…**，依次選擇 PDF、Word、HTML、Markdown、純文字及 RTF。

## 文字與連結

**粗體**、*斜體*、~~刪除線~~、\`inline code\`，中文與 English，表情符號 😀。

[外部連結](https://obsidian.md) · [[附錄筆記]] · [[#表格]]

## 清單

1. 第一項
2. 第二項
   - 巢狀項目

- [x] 已完成
- [ ] 尚未完成

## 表格

| 格式 | 用途 |
| --- | --- |
| PDF | 列印、分享 |
| DOCX | 編輯文件 |
| HTML | 瀏覽器、離線分頁 |

## 圖片

![[測試圖片.svg]]

## 程式碼

\`\`\`js
const message = "Hello，世界";
console.log(message);
\`\`\`

> 這是引用區塊，用來檢查 Word 和 RTF 的段落格式。

<div class="break-page"></div>

## 下一頁

PDF、DOCX、RTF 與 HTML 列印版的每頁下方應有「內部測試文件」和「Better Export」。
Markdown 與純文字的標註應出現在文件末尾。
`);
await writeFile(join(vault, "附錄筆記.md"), "# 附錄內容\n\n這份筆記只應附加一次。\n\n[[開始測試]]\n");
await mkdir(join(vault, "批次測試/A"), { recursive: true });
await mkdir(join(vault, "批次測試/B"), { recursive: true });
await writeFile(join(vault, "批次測試/A/同名筆記.md"), "# A 的筆記\n\n輸出應保留在 A 子資料夾。\n");
await writeFile(join(vault, "批次測試/B/同名筆記.md"), "# B 的筆記\n\n輸出應保留在 B 子資料夾。\n");
await writeFile(join(vault, "測試圖片.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="180" viewBox="0 0 480 180"><rect width="480" height="180" fill="#f1f5f9"/><rect x="40" y="90" width="80" height="60" fill="#4169b1"/><rect x="160" y="55" width="80" height="95" fill="#4169b1"/><rect x="280" y="25" width="80" height="125" fill="#4169b1"/><path d="M25 150H440" stroke="#334155"/><text x="40" y="25" font-family="sans-serif" font-size="18" fill="#334155">Export image test</text></svg>`);
const vaultZip = new JSZip();
async function addFolder(folder, prefix) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name), name = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) await addFolder(path, name);
    else vaultZip.file(name, await readFile(path));
  }
}
await addFolder(vault, "Better Export Test Vault");
await writeFile(join(output, `${pkg.name}-test-vault.zip`), await vaultZip.generateAsync(zipOptions));
console.log(`Plugin: dist/${pkg.name}.zip\nScratch vault: dist/${pkg.name}-test-vault.zip`);
