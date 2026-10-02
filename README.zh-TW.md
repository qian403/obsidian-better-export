# Obsidian Better Export

[English](./README.md) | [简体中文](./README.zh.md) | 繁體中文

將 Obsidian 筆記匯出成 PDF、DOCX、HTML、Markdown、TXT 與 RTF，支援預覽、合併與批次匯出，以及每頁左右下角的自訂文字。

## 安裝與測試

執行 `pnpm package` 後，解壓縮 `dist/obsidian-better-export.zip`，將 `better-export` 放到 Vault 的 `.obsidian/plugins/`，重新載入並啟用 **Better Export**。

也可以直接解壓縮 `dist/obsidian-better-export-test-vault.zip`，在 Obsidian 開啟其中的測試 Vault。完整步驟與測試項目請看 [TESTING.md](./TESTING.md)。

新版外掛 ID 為 `better-export`。如需保留原本 `better-export-pdf` 的設定，將舊資料夾的 `data.json` 複製到新資料夾，然後停用舊外掛。

## 使用

1. 右鍵筆記選擇「匯出檔案…」，或從命令面板執行 **Better Export: 匯出目前檔案**。
2. 選擇匯出格式，調整適用的頁面與頁尾選項。
3. 開啟左下角、右下角文字開關並填入標註；也可以全部關閉。
4. 按「匯出」並選擇目的地。取消或失敗會保留匯出視窗。

| 格式 | 內容 | 標註位置 |
| --- | --- | --- |
| PDF | 列印版面、大綱書籤、中繼資料 | 每頁頁尾 |
| DOCX | 可編輯的標題、清單、表格、連結與圖片 | Word 原生頁尾 |
| HTML | 獨立網頁，內嵌本機圖片 | 列印頁尾；可選離線分頁 |
| Markdown | 原始語法，可加入筆記名稱標題 | 文件末尾 |
| TXT | UTF-8 純文字，保留易讀的清單與表格 | 文件末尾 |
| RTF | 標題、文字強調、表格與連結；圖片以描述表示 | 每頁頁尾 |

DOCX 的版面由 Word／LibreOffice 決定，不套用 Obsidian 主題 CSS 或 PDF 專用 HTML 頁首／頁尾範本。HTML 的「HTML 分頁（Paged.js）」模式內建程式碼，可離線使用，需要瀏覽器啟用 JavaScript。

## 多語言與多檔案

設定 → Better Export → 語言：可選繁體中文、簡體中文、English 或跟隨 Obsidian。選單、設定、匯出視窗與提示都已翻譯。

- 右鍵資料夾可合併匯出，或透過「匯出文件…」分別匯出每個檔案。
- 批次匯出會保留子資料夾，讓不同資料夾的同名筆記都能保留。
- 開啟「附加連結筆記」可依連結順序加入直接連結的 Markdown 筆記；每篇只加入一次，不繼續追蹤附錄內的連結。
- 要自行決定順序，可使用帶有 `toc: true` 的目錄筆記；PDF／DOCX／HTML 保留可對應的文件內跳轉連結。

## 開發

```sh
ELECTRON_SKIP_BINARY_DOWNLOAD=1 pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm test:browser
pnpm package
```

瀏覽器測試預設使用已安裝的 Chrome，也可透過 `BETTER_EXPORT_BROWSER_PATH` 指定 Chromium。`pnpm build` 使用 esbuild；`pnpm build:vite` 輸出到 `dist/vite`。

本專案延伸自 [l1xnan 的 Better Export PDF](https://github.com/l1xnan/obsidian-better-export-pdf)，保留原作者授權與贊助資訊。
