import * as electron from "electron";
const fs = require("fs").promises;
import { type FrontMatterCache, Modal, TFile, TFolder } from "obsidian";
import path from "path";
import { mount, unmount } from "svelte";
import type { Lang } from "./i18n";
import { isExportFormat, type ExportFormat } from "./exporters/types";
import { appendLinkedFiles } from "./utils/export";
import type BetterExportPlugin from "./main";
import { renderMarkdown, type ParamType } from "./render";
import { traverseFolder, getDerivedLightVars, injectLightVarsPatch, removeLightVarsPatch } from "./utils";
import ModalUI from "./components/ModalUI.svelte";

export type PageSizeType = electron.PrintToPDFOptions["pageSize"];

export interface ExportConfigType {
  format: ExportFormat;
  pagedHtml?: boolean;
  footerLeftEnabled?: boolean;
  footerRightEnabled?: boolean;
  footerLeftText?: string;
  footerRightText?: string;
  pageSize: PageSizeType | "Custom";
  pageWidth?: string;
  pageHeight?: string;

  marginType: string;
  open: boolean;
  landscape: boolean;
  scale: number;
  showTitle: boolean;
  displayHeader: boolean;
  displayFooter: boolean;

  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;

  cssSnippet?: string;

  multiple?: boolean;
}

export type DocType = { doc: Document | HTMLDivElement; frontMatter?: FrontMatterCache; file: TFile; printSize?: string; cleanup?: () => void };
export type DocV2Type = {
  doc: HTMLDivElement;
  frontMatter: FrontMatterCache;
  file: TFile;
  cleanup: () => void;
};

export type FileListType = {
  file: TFile;
  toc?: boolean;
}[];

export class ExportConfigModal extends Modal {
  defaultConfig: ExportConfigType;
  plugin: BetterExportPlugin;
  file: TFile | TFolder;
  multiplePdf?: boolean;

  i18n: Lang;

  // Svelte component instance
  private component?: ReturnType<typeof mount>;

  constructor(plugin: BetterExportPlugin, file: TFile | TFolder, multiplePdf?: boolean) {
    super(plugin.app);
    this.plugin = plugin;
    this.file = file;
    this.i18n = plugin.i18n;
    this.multiplePdf = multiplePdf;

    this.defaultConfig = {
      format: "pdf",
      pagedHtml: false,
      footerLeftEnabled: false,
      footerRightEnabled: false,
      footerLeftText: "",
      footerRightText: "",
      pageSize: "A4",
      marginType: "1",
      showTitle: plugin.settings.showTitle ?? true,
      open: true,
      scale: 100,
      landscape: false,
      marginTop: "10",
      marginBottom: "10",
      marginLeft: "10",
      marginRight: "10",
      displayHeader: plugin.settings.displayHeader ?? true,
      displayFooter: plugin.settings.displayFooter ?? true,
      cssSnippet: "0",
      ...(plugin.settings.prevConfig ?? {}),
    } as ExportConfigType;
    if (!isExportFormat(this.defaultConfig.format)) this.defaultConfig.format = "pdf";
  }

  // ── Lifecycle ───────────────────────────────────────────

  onOpen() {
    this.contentEl.empty();
    this.containerEl.style.setProperty("--dialog-width", "60vw");
    this.titleEl.setText(this.i18n.exportDialog.title);
    const missingVars = getDerivedLightVars();
    console.debug("检测到以下衍生变量在亮色主题下未重置，即将进行注入：", missingVars);
    // 步骤 2：注入补丁样式
    injectLightVarsPatch(missingVars);
    this.component = mount(ModalUI, {
      target: this.contentEl,
      props: {
        modal: this,
        plugin: this.plugin,
      },
    });
  }

  onClose() {
    if (this.component) {
      unmount(this.component);
      this.component = undefined;
    }
    this.contentEl.empty();
    removeLightVarsPatch();
  }

  // ── File rendering ──────────────────────────────────────
  getFileCache(file: TFile) {
    return this.app.metadataCache.getFileCache(file);
  }

  async getAllFiles() {
    const app = this.plugin.app;
    const data: ParamType[] = [];
    const docs: DocType[] = [];
    if (this.file instanceof TFolder) {
      const files = traverseFolder(this.file);
      for (const file of files) {
        data.push({ app, file, i18n: this.i18n });
      }
    } else {
      const { doc, frontMatter, file } = await renderMarkdown({ app, file: this.file, config: this.defaultConfig, i18n: this.i18n });
      docs.push({ doc, frontMatter, file });
      if (frontMatter.toc) {
        const files = this.parseToc(doc);
        for (const item of files) {
          data.push({ app, file: item.file, extra: item, i18n: this.i18n });
        }
      }
    }
    if (this.plugin.settings.includeLinkedNotes && !this.multiplePdf) {
      const sources = [...docs.map((item) => item.file), ...data.map((item) => item.file)];
      const appended = this.appendLinkedNotes(sources).slice(sources.length);
      data.push(...appended.map((file) => ({ app, file })));
    }
    return { data, docs };
  }

  async getAllFilesV2() {
    const data: FileListType = [];
    if (this.file instanceof TFolder) {
      const files = traverseFolder(this.file);
      for (const file of files) {
        data.push({ file });
      }
    } else {
      const { frontmatter, links } = this.getFileCache(this.file) ?? {};
      data.push({ file: this.file, toc: frontmatter?.toc });
      if (frontmatter?.toc && links) {
        for (const link of links) {
          const file = this.app.metadataCache.getFirstLinkpathDest(link.link.split("#")[0], this.file.path) as TFile;
          if (file instanceof TFile && file.extension === "md") {
            data.push({ file });
          }
        }
      }
    }
    if (this.plugin.settings.includeLinkedNotes && !this.multiplePdf) {
      const sources = data.map((item) => item.file);
      data.push(...this.appendLinkedNotes(sources).slice(sources.length).map((file) => ({ file })));
    }
    return { data, multiplePdf: this.multiplePdf };
  }

  private appendLinkedNotes(files: TFile[]) {
    return appendLinkedFiles(files,
      (file) => (this.getFileCache(file)?.links ?? []).map((link) => link.link),
      (link, source) => {
        const file = this.app.metadataCache.getFirstLinkpathDest(link.split("#")[0], source.path);
        return file instanceof TFile && file.extension === "md" ? file : null;
      });
  }

  parseToc(doc: Document) {
    const cache = this.getFileCache(this.file as TFile);
    const files =
      cache?.links
        ?.map(({ link, displayText }) => {
          const id = crypto.randomUUID();
          const elem = Array.from(doc.querySelectorAll<HTMLAnchorElement>("a[data-href]")).find((el) => el.dataset.href === link);
          if (elem) {
            elem.href = `#${id}`;
          }
          return {
            title: displayText,
            file: this.app.metadataCache.getFirstLinkpathDest(link.split("#")[0], this.file.path) as TFile,
            id,
          };
        })
        .filter((item) => item.file instanceof TFile && item.file.extension === "md") ?? [];
    return files;
  }

  mergeDoc(docs: DocType[]) {
    const { doc: doc0, frontMatter, file } = docs[0];
    const sections = [];
    for (const { doc } of docs) {
      const element = doc.querySelector(".markdown-preview-view");
      if (element) {
        const owner = doc0 instanceof Document ? doc0 : doc0.ownerDocument;
        const section = owner.createElement("section");
        section.className = element.className;
        section.dataset.exportPath = docs.find((item) => item.doc === doc)?.file.path;
        Array.from(element.children).forEach((child) => {
          section.appendChild(owner.importNode(child, true));
        });
        sections.push(section);
      }
    }
    const root = doc0.querySelector(".markdown-preview-view");
    if (root) {
      root.innerHTML = "";
    }
    sections.forEach((section) => {
      root?.appendChild(section);
    });
    return [{ doc: doc0, frontMatter, file, node: root }];
  }

  mergeDocV2(docs: DocV2Type[]): DocV2Type[] {
    const printEl = document.body.createDiv({ cls: "print theme-light", attr: { "data-better-export-root": "true" } });

    for (const { doc } of docs) {
      const viewEl = doc.querySelector(".markdown-preview-view");
      if (viewEl) {
        printEl.appendChild(viewEl);
      }
      document.body.removeChild(doc);
    }
    return [{ ...docs[0], doc: printEl, cleanup: () => {
      docs.forEach((item) => item.cleanup());
      printEl.remove();
    } }];
  }

  // ── CSS Snippets helper ─────────────────────────────────
  cssSnippets(): Record<string, string> {
    // @ts-ignore
    const { snippets, enabledSnippets } = this.app?.customCss ?? {};
    // @ts-ignore
    const basePath = this.app.vault.adapter.basePath;
    return Object.fromEntries(
      (snippets ?? [])
        ?.filter((item: string) => !enabledSnippets?.has(item))
        .map((name: string) => {
          const file = path.join(basePath, `${this.app.vault.configDir}/snippets`, name + ".css");
          return [file, name];
        }),
    );
  }
}
