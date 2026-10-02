# 明天測試方式

## 直接使用測試 Vault

1. 解壓縮 `dist/obsidian-better-export-test-vault.zip`。
2. 在 Obsidian 選擇「開啟資料夾作為 Vault」，開啟 `Better Export Test Vault`。
3. 若 Obsidian 顯示受限模式，允許這個測試 Vault 使用社群外掛，確認 **Better Export** 已啟用。
4. 開啟 `開始測試.md`，右鍵選擇「匯出檔案…」。

這份 Vault 已附上外掛、範例筆記、圖片與左右標註設定，不會改動你的個人 Vault。

## 安裝到自己的 Vault

將 `dist/obsidian-better-export.zip` 中的 `better-export` 資料夾放到：

```text
你的 Vault/.obsidian/plugins/better-export/
```

資料夾內應有 `main.js`、`manifest.json`、`styles.css`。重新載入 Obsidian，再啟用 **Better Export**。

原版 ID 是 `better-export-pdf`，新版 ID 是 `better-export`。如需沿用設定，將舊資料夾的 `data.json` 複製到新資料夾；舊設定會自動補齊語言、格式與標註的預設值。停用舊外掛，避免出現兩套匯出選單。

## 建議測試項目

- **語言**：設定 → Better Export → 語言，切換繁體中文、簡體中文、English、跟隨 Obsidian；檢查選單與新的匯出視窗。
- **格式**：逐一匯出 PDF、DOCX、HTML、Markdown、TXT、RTF，確認副檔名正確且可以開啟。
- **頁尾**：分別測試左、右、兩側、全部關閉。PDF／Word／RTF 的標註應每頁重複；HTML 請用列印預覽檢查。
- **Word**：用 Microsoft Word 或 LibreOffice 檢查中文、清單、表格、圖片、超連結、分頁及頁尾。Word 的版面會依字型與排版引擎調整。
- **HTML 分頁**：選 HTML，打開「HTML 分頁（Paged.js）」，匯出後離線用瀏覽器開啟，檢查頁碼與左右標註。
- **取消**：在目的地對話框按取消，匯出視窗應保留；失敗時也應保留視窗與錯誤提示。
- **附錄**：測試 Vault 已啟用「附加連結筆記」；附錄筆記應只附加一次，不會遞迴追蹤更多連結。
- **批次**：右鍵 `批次測試` → 匯出文件… → 分別匯出每個檔案…，確認 `A/同名筆記` 與 `B/同名筆記` 都保留。
- **PDF 預覽**：切換 HTML／PDF 預覽，再改紙張、邊界、標註與縮放，確認預覽會更新。

Markdown 與 TXT 沒有固定頁面，因此標註會放在文件末尾。RTF 的圖片會保留描述文字；DOCX 不會套用 Obsidian 主題 CSS 或 PDF 專用 HTML 頁首／頁尾範本。音訊與影片不會內嵌到 Word/RTF。

## 已執行的驗證

- TypeScript 與 Svelte 檢查。
- 語言、內容轉換、DOCX 結構、原生 PDF 回覆／逾時處理、批次路徑、取消與錯誤回傳的自動測試。
- 真實 Chrome 中的 Svelte 選項操作、離線 Paged.js 分頁、頁尾標註與 A4 PDF 列印。
- esbuild 與 Vite 兩條正式建置路徑。

上述測試包含模擬 Obsidian API。完整 Obsidian 匯出及 Word 的最終版面仍請依上面步驟實測。
