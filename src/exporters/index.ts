import * as electron from "electron";
import { Notice, TFile, requestUrl } from "obsidian";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type BetterExportPlugin from "../main";
import type { DocType, ExportConfigModal, ExportConfigType } from "../modal";
import { markdownWithTitle } from "../utils/export";
import { formatMessage, locales, type Locale } from "../i18n";
import { blocksFromElement, cleanExportElement, plainText, type ExportContent } from "./content";
import { exportFormats, getAnnotations, type NonPdfFormat } from "./types";
import { exportDocx } from "./docx";
import { exportHtml } from "./html";
import pagedScript from "pagedjs-polyfill?raw";
import { exportRtf } from "./rtf";
import { decodeBrowserImage } from "./images";

function cloneContent(doc: Document | HTMLDivElement, showTitle: boolean): HTMLElement {
  const owner = doc.nodeType === 9 ? doc as Document : doc.ownerDocument!;
  const root = owner.createElement("div");
  const views = Array.from(doc.querySelectorAll<HTMLElement>(".markdown-preview-view"))
    .filter((view) => !view.parentElement?.closest(".markdown-preview-view"));
  for (const view of views) {
    const clone = cleanExportElement(view, showTitle);
    const sourceCanvases = view.querySelectorAll<HTMLCanvasElement>("canvas");
    clone.querySelectorAll("canvas").forEach((canvas, i) => {
      try {
        const image = owner.createElement("img");
        image.src = sourceCanvases[i].toDataURL("image/png");
        canvas.replaceWith(image);
      } catch { canvas.remove(); }
    });
    clone.querySelectorAll("svg").forEach((svg) => {
      const image = owner.createElement("img");
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
      image.alt = svg.getAttribute("aria-label") ?? svg.querySelector("title")?.textContent ?? "Diagram";
      svg.replaceWith(image);
    });
    root.appendChild(clone);
  }
  return root;
}

function annotationSuffix(config: ExportConfigType) {
  const { left, right } = getAnnotations(config);
  return [left, right].filter(Boolean).join("\n");
}

export async function exportDocuments({ modal, plugin, config, getDocuments }: {
  modal: ExportConfigModal;
  plugin: BetterExportPlugin;
  config: ExportConfigType;
  getDocuments: () => Promise<DocType[]>;
}): Promise<boolean> {
  const format = config.format as NonPdfFormat;
  const i18n = modal.i18n;
  const title = modal.file instanceof TFile ? modal.file.basename : modal.file.name;
  const { data: sources } = await modal.getAllFilesV2();
  if (!sources.length) { new Notice(i18n.notices.noFiles); return false; }
  const locale = (Object.entries(locales).find(([, value]) => value === i18n)?.[0] ?? "en") as Locale;

  // Ask for the destination first so cancellation does no conversion or file writes.
  let destinations: string[];
  if (modal.multiplePdf) {
    // @ts-ignore Obsidian desktop exposes Electron remote.
    const result = await electron.remote.dialog.showOpenDialog({ title: i18n.exportDialog.title, properties: ["openDirectory"] });
    if (result.canceled || !result.filePaths[0]) return false;
    destinations = sources.map(({ file }) => path.join(result.filePaths[0],
      file.path.slice(modal.file.path ? modal.file.path.length + 1 : 0).replace(/\.md$/, `.${exportFormats[format].extension}`)));
  } else {
    // @ts-ignore Obsidian desktop exposes Electron remote.
    const result = await electron.remote.dialog.showSaveDialog({ title: i18n.exportDialog.title,
      defaultPath: `${title}${plugin.settings.isTimestamp ? "-" + Date.now() : ""}.${exportFormats[format].extension}`,
      filters: [{ name: exportFormats[format].label, extensions: [exportFormats[format].extension] }],
      properties: ["showOverwriteConfirmation", "createDirectory"] });
    if (result.canceled || !result.filePath) return false;
    destinations = [result.filePath];
  }

  let skippedImages = false;
  const assetPromises = new Map<string, Promise<string | undefined>>();
  const resourcePaths = new Map(plugin.app.vault.getFiles().map((file) => [plugin.app.vault.getResourcePath(file).split("?")[0], file]));
  async function embedImage(src: string, sourcePath: string): Promise<string | undefined> {
    if (src.startsWith("data:")) return src;
    const key = `${sourcePath}:${src}`;
    if (assetPromises.has(key)) return assetPromises.get(key);
    const promise = (async () => {
      try {
        let data: Uint8Array;
        let mime: string;
        if (/^https?:\/\//i.test(src)) {
          let timer: ReturnType<typeof setTimeout> | undefined;
          const response = await Promise.race([
            requestUrl(src),
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => reject(new Error("Image download timed out")), 5000);
            }),
          ]).finally(() => { if (timer) clearTimeout(timer); });
          const header = response.headers["content-type"]?.split(";")[0];
          if (!header?.startsWith("image/")) return;
          mime = header; data = new Uint8Array(response.arrayBuffer);
        } else {
          let decoded = src;
          try { decoded = decodeURIComponent(src); } catch { /* Use literal path. */ }
          const file = resourcePaths.get(src.split("?")[0]) ?? resourcePaths.get(decoded.split("?")[0]) ??
            plugin.app.metadataCache.getFirstLinkpathDest(decoded, sourcePath);
          if (!(file instanceof TFile)) return;
          const mimes: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
            gif: "image/gif", svg: "image/svg+xml", webp: "image/webp", bmp: "image/bmp" };
          mime = mimes[file.extension.toLowerCase()];
          if (!mime) return;
          data = new Uint8Array(await plugin.app.vault.readBinary(file));
        }
        return `data:${mime};base64,${Buffer.from(data).toString("base64")}`;
      } catch (error) { console.warn("Could not embed image", error); return; }
    })();
    assetPromises.set(key, promise);
    return promise;
  }

  const makeContent = async (doc: DocType): Promise<ExportContent> => {
    const root = cloneContent(doc.doc, config.showTitle);
    if (format === "html" || format === "docx") {
      for (const image of Array.from(root.querySelectorAll<HTMLImageElement>("img"))) {
        const src = image.getAttribute("src") ?? "";
        image.removeAttribute("srcset");
        image.removeAttribute("sizes");
        image.closest("picture")?.querySelectorAll("source").forEach((source) => source.remove());
        const sourcePath = image.closest<HTMLElement>("[data-export-path]")?.dataset.exportPath ?? doc.file.path;
        const embedded = await embedImage(src, sourcePath);
        if (embedded) image.src = embedded;
        else {
          skippedImages = true;
          if (format === "docx") image.removeAttribute("src");
        }
      }
    }
    return { title: doc.file.basename, html: root.innerHTML, blocks: blocksFromElement(root) };
  };

  try {
    if (format === "md") {
      const markdown = await Promise.all(sources.map(async ({ file }, index) => {
        let content = await plugin.app.vault.cachedRead(file);
        if (!modal.multiplePdf && index > 0) content = content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "");
        return markdownWithTitle(content, file.basename, config.showTitle);
      }));
      const suffix = annotationSuffix(config);
      const outputs = modal.multiplePdf ? markdown : [markdown.join("\n\n---\n\n")];
      for (const [i, output] of outputs.entries()) {
        await fs.mkdir(path.dirname(destinations[i]), { recursive: true });
        await fs.writeFile(destinations[i], output + (suffix ? `\n\n---\n\n${suffix}\n` : ""), "utf8");
      }
    } else {
      const docs = await getDocuments();
      if (!docs.length) { new Notice(i18n.notices.noFiles); return false; }
      for (const [i, doc] of docs.entries()) {
        const content = await makeContent(doc);
        const outputTitle = modal.multiplePdf ? content.title : title;
        let output: string | Uint8Array;
        if (format === "html") output = exportHtml({ ...content, title: outputTitle, config, language: locale, pagedScript });
        else if (format === "docx") output = await exportDocx({ ...content, title: outputTitle, config,
          author: doc.frontMatter?.author?.toString(), resolveImage: async (src) => {
            const asset = await decodeBrowserImage(src);
            if (!asset) skippedImages = true;
            return asset;
          } });
        else if (format === "rtf") output = exportRtf({ ...content, title: outputTitle, config });
        else output = plainText(content.blocks) + (annotationSuffix(config) ? `\n\n${annotationSuffix(config)}` : "") + "\n";
        await fs.mkdir(path.dirname(destinations[i]), { recursive: true });
        await fs.writeFile(destinations[i], output);
      }
    }
    if (skippedImages) new Notice(i18n.notices.imagesSkipped);
    if (config.open) {
      for (const file of destinations) {
        // @ts-ignore Obsidian desktop exposes Electron remote.
        await electron.remote.shell.openPath(file);
      }
    }
    return true;
  } catch (error) {
    console.error(error);
    new Notice(formatMessage(i18n.notices.documentExportFailed, { error: (error as Error)?.message ?? String(error) }));
    return false;
  }
}
