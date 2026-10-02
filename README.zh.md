# Obsidian Better Export

[English](./README.md) | 简体中文 | [繁體中文](./README.zh-TW.md)

Better Export 是一个 Obsidian 多格式导出插件，支持 PDF、DOCX、HTML、Markdown、TXT 和 RTF，提供导出预览、合并与批量导出、多语言以及页脚标注。

## 功能

与官方导出 PDF 功能相比：

- 🚀 支持导出预览
- 🎉 支持导出 PDF 带大纲书签
- 🛩️ 支持自定义页边距
- ✨ 支持自定义页眉/页脚（例如：添加页码）
- 💥 支持将文档属性添加到 PDF 元数据中
- 🎇 支持导出的 PDF 时，保留文档内链接跳转
- 🎈 多个笔记文件（整个目录或者指定文件）合并打印到一个 PDF 文件中
- 🌸 整个目录中的笔记文件批量导出到单独的 PDF 文件中
- 🍬 支持导出任意尺寸 PDF，可以将所有内容导出为一页
- ... ...

## 安装

请使用本地构建或下方的手动安装方法。新版外掛 ID 为 `better-export`，此分支尚不假定已上架社群商店。

### 手动安装

1. 在 [Release](https://github.com/qian403/obsidian-better-export/releases) 页面，下载 zip 包
2. 解压到: `{VaultFolder}/.obsidian/plugins/`
3. 重启 Obdisian，并再插件管理器中启用插件。

或者用 [BRAT Plugin](https://obsidian.md/plugins?id=obsidian42-brat)。

## 使用

1. 选择导出目标：
   - 在当前 Markdown 视图的右上角，点击更多选项，选择 `Better Export`；
   - 打开命令面板，选择 `Better Export: Export current file`；
   - 在文件树中，右键文件夹选择`Export folder to PDF`。
2. 在弹出对话框中，修改相关配置。
3. 点击`Export`，选择导出路径，如果不用修改配置，可以直接按 `Enter` 键，触发导出操作。

### 设置页眉/页脚

可以通过设置 `Header Template` and `Footer Template` 配置来设置页码, 例如:

```html
<div style="width: 100vw;font-size:10px;text-align:center;">
  <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>
```

可以实现类似 `3 / 5` 页码效果。详见[`<webview>.printToPDF(options)`](https://www.electronjs.org/docs/latest/api/webview-tag#webviewprinttopdfoptions)。

可以是任何合法的 HTML 片段，例如添加`base64`格式的图片：

```html
<div style="width: 100vw;font-size:10px;text-align:center;">
  <img height="10px" width="10px" src="data:image/svg+xml;base64,xxx..." />
  <span class="title"></span>
</div>
```

可以在`frontMatter`中配置文档级别的页眉/页脚模板：

- `headerTemplate`
- `footerTemplate`

### 自定义导出样式

如果想进一步定制 PDF 导出样式，可以在`外观>CSS代码片段`中添加自定义的 CSS，例如自定义字体和字号(注意使用 `@media print {}` 包裹，避免影响非打印场景样式)：

```css
@media print {
  body {
    --font-interface-override: "霞鹜文楷" !important;
    --font-text-override: "霞鹜文楷" !important;
    --font-print-override: "霞鹜文楷" !important;
    --font-monospace-override: "霞鹜文楷等宽" !important;
    --font-text-size: 20px !important;
    font-family: "思源宋体" !important;
  }
}
```


#### 分页
如果想自定控制分页，在 Markdown 中添加

```html
<div class="break-page"></div>
```

然后定义 css代码片段样式

```css
@media print {
  .break-page {
    /* 在此元素之前强制分页 */
    break-before: page;
    
    /* 或者如果你想在元素之后分页，可以使用： */
    /* break-after: page; */
    
    /* 防止元素内部被分页打断（可选） */
    break-inside: avoid;
  }
}
```

如果想实现1-3级标题自动分页，可以这样设置：

```css
@media print {
  h1, h2, h3 {
    break-before: page;
  }
}
```

详细 CSS相关配置参见：[Printing - CSS | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing)，也可以将想要实现的分页效果询问大模型，让大模型给你可行的 CSS 片段。

### 选择未启用的 CSS 片段

首先，在插件配置中启用 `Select CSS snippets` 选项。这时候在导出 PDF 的弹窗中可以看到 `CSS snippets` 选项，然后你可以选择在 `外观 > CSS 片段` 中没有全局启用的 CSS。

### 导出背景

默认情况下，导出的 PDF 会删除主题所得带背景色，如果你需要这个背景色，可以`插件设置 > Print background` 配置中打开它。

### 添加 PDF 元数据

可以通过配置文档的 `frontMatter` 给 PDF 添加元数据，支持的字段项有：

- `title`
- `author`
- `keywords`
- `created_at`
- `updated_at`
- `creator`
- `producer`

### 多文件导出

#### 快速导出

侧边栏选择文件夹，右键选择菜单 `Export folder to PDF`，即可将整个文件夹内容导出到一个 PDF 文件中，按照文件的相对路径排序导出；

#### 自定义导出

新建一个目录笔记，添加如下类似内容，需要添加 `toc: true` 文档属性：

```markdown
---
toc: true
---

## 目录

[[笔记1|标题1]]
[[笔记2]]
[[笔记3]]
```

这样插件会按照 `当前目录页`、`笔记1`、`笔记2`.. 的顺序导出笔记。导出的 PDF，目录页锚点支持点击跳转。

### 文件夹批量导出

侧边栏选择文件夹，右键选择菜单 `Export each file to PDF`，即可将整个文件夹每一个文件批量导出为 PDF 文件

### 导出为一页

导出对话框， **Page Size** 选择 `Custom`，**Margin** 设置为 `None`，根据文档情况自行设置页面尺寸。

---

**注意:** 你可以通过`插件设置 > 限制并发数` 调整多文件导出时渲染阶段的并发数量，以此来减少资源消耗，或者提高速度，默认为 `5`。

## 多格式导出与页脚标注

支持 PDF、DOCX、HTML、Markdown、TXT 与 RTF。在导出窗口选择格式，再打开左下角／右下角标注开关并填写文字。

PDF、DOCX、RTF 的标注在每页重复；HTML 打印时重复，也可开启离线 Paged.js 分页预览。Markdown 与 TXT 没有固定页面，标注放在文档末尾。DOCX 保留标题、清单、表格、超链接与可读取的图片；RTF 以图片描述代替图片。DOCX 不套用主题 CSS 或 PDF 专用 HTML 页眉／页脚模板。

设置中可选择 English、简体中文、繁體中文或跟随 Obsidian。开启「附加链接笔记」后，会按链接顺序附加直接链接的 Markdown 笔记，去重且不递归追踪附录里的链接，仅适用于合并导出。批量导出保留子文件夹，避免同名笔记互相覆盖。

参见 [测试与安装说明](./TESTING.md)。旧版 ID `better-export-pdf` 已更名为 `better-export`；如需旧设置，请复制旧外掛文件夹的 `data.json`。

## 开发

```sh
ELECTRON_SKIP_BINARY_DOWNLOAD=1 pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm test:browser
pnpm package
```

安装包位于 `dist/obsidian-better-export.zip`，另有独立测试 Vault。Vite 构建输出到 `dist/vite`。

## 效果

### 导出预览

![Export preview](./assets/preview0.png)

### 导出效果

![Export preview](./assets/preview1.png)

## TODO

- [x] 可选的直接链接笔记附录（单层、去重）；
- [x] HTML 导出支持离线 Paged.js 分页；
- [x] 支持打印预览；
- [x] 多个 Markdown 合并打印到一个 PDF 文件中；
- [x] 完善默认 `@media print` css 样式；
- [x] 支持将文档属性添加到 PDF 元数据中；
- [x] 保留文档内链接跳转；

## 赞助

如果这个插件帮到了您，请点击 Star 或者我喝一杯奶茶吧！

<div align="center">
<img src="./assets/sponsor-chat.png" width="300px"/>
<img src="./assets/sponsor-alipay.png" width="300px"/>
</div>
