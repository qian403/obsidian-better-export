# Obsidian Better Export

[English](./README.md) | 繁體中文 | [简体中文](./README.zh.md)

將 Obsidian 筆記匯出成 PDF、Word、HTML、Markdown、純文字與 RTF，支援預覽、合併與批次匯出，以及自訂頁尾標註。

本專案改作自 [l1xnan 的 Better Export PDF](https://github.com/l1xnan/obsidian-better-export-pdf)，由 [qian403](https://github.com/qian403) 維護與擴充。完整出處請見[專案來源與授權](#專案來源與授權)。

## 功能

- 六種匯出格式：PDF、DOCX、HTML、Markdown、TXT、RTF。
- 「內容預覽」快速檢查筆記，「PDF 分頁預覽」檢查頁面排版。
- 可分別開啟每頁左下角、右下角的自訂文字標註。
- 資料夾合併匯出、逐檔批次匯出，或使用目錄筆記指定順序。
- 可附加直接連結的筆記，每篇只加入一次，不遞迴展開。
- 繁體中文、簡體中文、English，或跟隨 Obsidian 語言。
- PDF 大綱書籤、中繼資料、文件內連結、自訂紙張、邊界與頁首頁尾範本。

## 安裝

此外掛僅支援桌面版 Obsidian。本分支的外掛 ID 為 `better-export`。

可依[開發](#開發)的指令自行產生安裝包；若本分支的 [Releases 頁面](https://github.com/qian403/obsidian-better-export/releases)有提供打包檔，也可直接下載。

1. 解壓縮自行打包的 `dist/obsidian-better-export.zip`，或下載的外掛安裝包。
2. 將 `better-export` 資料夾放入 `你的 Vault/.obsidian/plugins/`。
3. 確認資料夾內有 `main.js`、`manifest.json`、`styles.css`。
4. 重新載入 Obsidian，在社群外掛中啟用 **Better Export**。

如需沿用原版設定，將 `.obsidian/plugins/better-export-pdf/data.json` 複製到 `.obsidian/plugins/better-export/`。停用原版外掛，避免出現重複的匯出選單。

獨立測試 Vault 與手動檢查步驟請看 [TESTING.md](./TESTING.md)。

## 快速開始

1. 右鍵筆記選擇「匯出檔案…」，或從命令面板執行 **Better Export: 匯出目前檔案**。
2. 在右側選擇「匯出格式」。
3. 調整適用的頁面設定，依需要開啟頁尾標註並填入文字。
4. 檢查預覽，按「匯出」並選擇儲存位置。

取消儲存時，匯出視窗會保留。

### 預覽怎麼看？

| 預覽方式 | 用途 |
| --- | --- |
| 內容預覽 | 快速檢查文字與圖片，不顯示最終分頁、頁首與頁尾。 |
| PDF 分頁預覽 | 檢查 PDF 的分頁、邊界、頁首與頁尾；修改設定後會自動更新。 |

**切換預覽不會改變匯出格式。** 要輸出什麼檔案，請在右側選擇。「PDF 分頁預覽」適用於預設的 **v2 引擎**，且僅在選擇 PDF 格式時出現。其他格式與 v1 引擎提供內容預覽，實際排版請在匯出後開啟檔案確認。

### 格式與頁尾標註

| 格式 | 內容 | 標註位置 |
| --- | --- | --- |
| PDF | 列印版面、大綱書籤、中繼資料、文件內連結 | 每頁頁尾 |
| DOCX | 可編輯的標題、清單、表格、連結與圖片 | Word 原生頁尾 |
| HTML | 獨立網頁，內嵌本機圖片 | 列印頁尾；可選離線分頁 |
| Markdown | 原始語法，可加入筆記名稱標題 | 文件末尾 |
| TXT | UTF-8 純文字，保留易讀的清單與表格 | 文件末尾 |
| RTF | 標題、文字強調、表格與連結；圖片以描述表示 | 每頁頁尾 |

在匯出視窗中，分別開啟左下角、右下角的標註開關並填入文字。這些標註與 PDF 頁碼頁尾可獨立設定。

DOCX 的版面由 Word／LibreOffice 決定，不套用 Obsidian 主題 CSS 或 PDF 專用 HTML 頁首頁尾範本。DOCX 與 RTF 不內嵌音訊或影片。

HTML 格式的「HTML 分頁（Paged.js）」會讓匯出的 HTML 檔案呈現分頁，可離線使用，但瀏覽器需要啟用 JavaScript。此選項與匯出視窗中的預覽切換是不同功能。

## 多篇筆記

- **合併資料夾**：右鍵資料夾選擇「匯出資料夾…」，按筆記的相對路徑排序。
- **分別匯出**：右鍵資料夾，選擇「匯出文件… → 分別匯出每個檔案…」。輸出會保留子資料夾，避免同名筆記互相覆蓋。
- **附加連結筆記**：在外掛設定中開啟「附加連結筆記」。合併匯出時依連結順序加入直接連結的 Markdown 筆記，每篇只加入一次，不繼續追蹤附錄內的連結。

如需自訂順序，建立並匯出一篇目錄筆記：

```markdown
---
toc: true
---

# 目錄

[[筆記一|前言]]
[[筆記二]]
[[筆記三]]
```

請匯出這篇筆記，而非整個資料夾。輸出順序為目錄筆記、筆記一、筆記二、筆記三。PDF、DOCX、HTML 會保留可對應的文件內跳轉連結。

## PDF 進階設定

在外掛設定中調整「頁首範本」與「頁尾範本」。例如以下頁尾會顯示目前頁碼與總頁數：

```html
<div style="width:100%;font-size:10px;text-align:center;">
  <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>
```

範本也支援 `date`、`title`、`url` 類別。可在筆記屬性中設定 `headerTemplate` 與 `footerTemplate`，覆寫該篇筆記的範本。

開啟「PDF 中繼資料」後，可使用筆記屬性中的 `title`、`author`、`keywords`、`subject`、`creator`、`created_at`、`updated_at`。

可透過 Obsidian CSS 片段中的 `@media print` 自訂列印樣式。啟用外掛設定中的「啟用 CSS 片段選擇」後，也能選用未全域啟用的片段。需要手動換頁時，在筆記中加入：

```html
<div class="break-page"></div>
```

外掛已內建此類別的列印分頁樣式。如需自訂紙張，在「紙張尺寸」選擇「自訂」，再輸入寬度與高度。

## 開發

```sh
ELECTRON_SKIP_BINARY_DOWNLOAD=1 pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm test:browser
pnpm package
```

瀏覽器測試使用已安裝的 Chrome，也可透過 `BETTER_EXPORT_BROWSER_PATH` 指定 Chromium。測試包含模擬 Obsidian API；完整的 Obsidian 操作請依 [TESTING.md](./TESTING.md) 實測。

`pnpm package` 會產生：

- `dist/obsidian-better-export.zip`：外掛安裝包。
- `dist/obsidian-better-export-test-vault.zip`：已安裝外掛並附範例筆記的獨立測試 Vault。

`pnpm build` 使用 esbuild；`pnpm build:vite` 提供另一條建置路徑，輸出到 `dist/vite`。

## 專案來源與授權

本專案修改自 **[l1xnan/obsidian-better-export-pdf](https://github.com/l1xnan/obsidian-better-export-pdf)**。原作者 **l1xnan** 與上游貢獻者建立了本專案沿用的 PDF 匯出基礎。

目前分支 **[qian403/obsidian-better-export](https://github.com/qian403/obsidian-better-export)** 在此基礎上擴充多格式文件匯出、語言選擇、左右頁尾標註、連結筆記附錄與更清楚的預覽操作。此分支的外掛 ID 為 `better-export`，原專案則為 `better-export-pdf`。

本專案採用 [MIT License](./LICENSE)，保留原作者的著作權與授權聲明。

## 回報問題

請至[此分支的 GitHub Issues](https://github.com/qian403/obsidian-better-export/issues) 回報問題或提出建議，並附上匯出格式、外掛版本、Obsidian 版本及重現步驟。
