# Obsidian Better Export

[English](./README.md) | [繁體中文](./README.zh-TW.md) | 简体中文

将 Obsidian 笔记导出为 PDF、Word、HTML、Markdown、纯文本与 RTF，支持预览、合并与批量导出，以及自定义页脚标注。

本项目修改自 [l1xnan 的 Better Export PDF](https://github.com/l1xnan/obsidian-better-export-pdf)，由 [qian403](https://github.com/qian403) 维护与扩展。完整出处请见[项目来源与许可](#项目来源与许可)。

## 功能

- 六种导出格式：PDF、DOCX、HTML、Markdown、TXT、RTF。
- 「内容预览」快速检查笔记，「PDF 分页预览」检查页面排版。
- 可分别开启每页左下角、右下角的自定义文字标注。
- 文件夹合并导出、逐文件批量导出，或使用目录笔记指定顺序。
- 可附加直接链接的笔记，每篇只加入一次，不递归展开。
- 简体中文、繁体中文、English，或跟随 Obsidian 语言。
- PDF 大纲书签、元数据、文档内链接、自定义纸张、边距与页眉页脚模板。

## 安装

此插件仅支持桌面版 Obsidian。本分支的插件 ID 为 `better-export`。

可依照[开发](#开发)中的命令自行生成安装包；若本分支的 [Releases 页面](https://github.com/qian403/obsidian-better-export/releases)提供了打包文件，也可直接下载。

1. 解压自行打包的 `dist/obsidian-better-export.zip`，或下载的插件安装包。
2. 将 `better-export` 文件夹放入 `你的 Vault/.obsidian/plugins/`。
3. 确认文件夹中包含 `main.js`、`manifest.json`、`styles.css`。
4. 重新加载 Obsidian，在社区插件中启用 **Better Export**。

如需沿用原版设置，将 `.obsidian/plugins/better-export-pdf/data.json` 复制到 `.obsidian/plugins/better-export/`。停用原版插件，避免出现重复的导出菜单。

独立测试 Vault 与手动检查步骤请看 [TESTING.md](./TESTING.md)。

## 快速开始

1. 右键笔记选择「导出文件…」，或从命令面板执行 **Better Export: 导出当前文件**。
2. 在右侧选择「导出格式」。
3. 调整适用的页面设置，按需开启页脚标注并填写文字。
4. 检查预览，点击「导出」并选择保存位置。

取消保存时，导出窗口会保留。

### 如何使用预览？

| 预览方式 | 用途 |
| --- | --- |
| 内容预览 | 快速检查文字与图片，不显示最终分页、页眉与页脚。 |
| PDF 分页预览 | 检查 PDF 的分页、边距、页眉与页脚；修改设置后会自动更新。 |

**切换预览不会改变导出格式。** 要输出什么文件，请在右侧选择。「PDF 分页预览」适用于默认的 **v2 引擎**，且仅在选择 PDF 格式时出现。其他格式与 v1 引擎提供内容预览，实际排版请在导出后打开文件确认。

### 格式与页脚标注

| 格式 | 内容 | 标注位置 |
| --- | --- | --- |
| PDF | 打印版面、大纲书签、元数据、文档内链接 | 每页页脚 |
| DOCX | 可编辑的标题、列表、表格、链接与图片 | Word 原生页脚 |
| HTML | 独立网页，内嵌本地图片 | 打印页脚；可选离线分页 |
| Markdown | 原始语法，可加入笔记名称标题 | 文档末尾 |
| TXT | UTF-8 纯文本，保留易读的列表与表格 | 文档末尾 |
| RTF | 标题、文字强调、表格与链接；图片以描述表示 | 每页页脚 |

在导出窗口中，分别开启左下角、右下角的标注开关并填写文字。这些标注与 PDF 页码页脚可独立设置。

DOCX 的版面由 Word／LibreOffice 决定，不套用 Obsidian 主题 CSS 或 PDF 专用 HTML 页眉页脚模板。DOCX 与 RTF 不内嵌音频或视频。

HTML 格式的「HTML 分页（Paged.js）」会让导出的 HTML 文件呈现分页，可离线使用，但浏览器需要启用 JavaScript。此选项与导出窗口中的预览切换是不同功能。

## 多篇笔记

- **合并文件夹**：右键文件夹选择「导出文件夹…」，按笔记的相对路径排序。
- **分别导出**：右键文件夹，选择「导出文档… → 分别导出每个文件…」。输出会保留子文件夹，避免同名笔记互相覆盖。
- **附加链接笔记**：在插件设置中开启「附加链接笔记」。合并导出时按链接顺序加入直接链接的 Markdown 笔记，每篇只加入一次，不继续追踪附录中的链接。

如需自定义顺序，创建并导出一篇目录笔记：

```markdown
---
toc: true
---

# 目录

[[笔记一|前言]]
[[笔记二]]
[[笔记三]]
```

请导出这篇笔记，而非整个文件夹。输出顺序为目录笔记、笔记一、笔记二、笔记三。PDF、DOCX、HTML 会保留可对应的文档内跳转链接。

## PDF 高级设置

在插件设置中调整「页眉模板」与「页脚模板」。例如以下页脚会显示当前页码与总页数：

```html
<div style="width:100%;font-size:10px;text-align:center;">
  <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>
```

模板也支持 `date`、`title`、`url` 类别。可在笔记属性中设置 `headerTemplate` 与 `footerTemplate`，覆盖该篇笔记的模板。

开启「PDF 元数据」后，可使用笔记属性中的 `title`、`author`、`keywords`、`subject`、`creator`、`created_at`、`updated_at`。

可通过 Obsidian CSS 片段中的 `@media print` 自定义打印样式。启用插件设置中的「启用 CSS 片段选择」后，也能选用未全局启用的片段。需要手动分页时，在笔记中加入：

```html
<div class="break-page"></div>
```

插件已内置此类的打印分页样式。如需自定义纸张，在「纸张尺寸」选择「自定义」，再输入宽度与高度。

## 开发

```sh
ELECTRON_SKIP_BINARY_DOWNLOAD=1 pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm test:browser
pnpm package
```

浏览器测试使用已安装的 Chrome，也可通过 `BETTER_EXPORT_BROWSER_PATH` 指定 Chromium。测试包含模拟 Obsidian API；完整的 Obsidian 操作请依照 [TESTING.md](./TESTING.md) 实测。

`pnpm package` 会生成：

- `dist/obsidian-better-export.zip`：插件安装包。
- `dist/obsidian-better-export-test-vault.zip`：已安装插件并附示例笔记的独立测试 Vault。

`pnpm build` 使用 esbuild；`pnpm build:vite` 提供另一条构建路径，输出到 `dist/vite`。

## 项目来源与许可

本项目修改自 **[l1xnan/obsidian-better-export-pdf](https://github.com/l1xnan/obsidian-better-export-pdf)**。原作者 **l1xnan** 与上游贡献者建立了本项目沿用的 PDF 导出基础。

当前分支 **[qian403/obsidian-better-export](https://github.com/qian403/obsidian-better-export)** 在此基础上扩展多格式文档导出、语言选择、左右页脚标注、链接笔记附录与更清楚的预览操作。此分支的插件 ID 为 `better-export`，原项目则为 `better-export-pdf`。

本项目采用 [MIT License](./LICENSE)，保留原作者的版权与许可声明。

## 反馈问题

请前往[此分支的 GitHub Issues](https://github.com/qian403/obsidian-better-export/issues) 反馈问题或提出建议，并附上导出格式、插件版本、Obsidian 版本及复现步骤。
