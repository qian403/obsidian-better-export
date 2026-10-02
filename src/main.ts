import { App, MarkdownView, Menu, Plugin, type PluginManifest, TFile, TFolder } from "obsidian";
import { getTranslations, isLanguageSetting, type LanguageSetting, type Lang } from "./i18n";
import * as obsidian from "obsidian";
import { ExportConfigModal, type ExportConfigType } from "./modal";
import ConfigSettingTab from "./setting";
import { traverseFolder } from "./utils";

const isDev = process.env.NODE_ENV === "development";

export interface BetterExportPluginSettings {
  prevConfig?: ExportConfigType;
  language: LanguageSetting;
  includeLinkedNotes: boolean;

  showTitle: boolean;
  maxLevel: string;

  displayHeader: boolean;
  displayFooter: boolean;
  headerTemplate: string;
  footerTemplate: string;

  printBackground: boolean;
  generateTaggedPDF: boolean;

  displayMetadata: boolean;

  isTimestamp: boolean;
  debug: boolean;
  enabledCss: boolean;
  concurrency: string;
  version: string;
}

const DEFAULT_SETTINGS: BetterExportPluginSettings = {
  language: "auto",
  includeLinkedNotes: false,
  showTitle: true,
  maxLevel: "6",

  displayHeader: true,
  displayFooter: true,
  headerTemplate: `<div style="width: 100vw;font-size:10px;text-align:center;"><span class="title"></span></div>`,
  footerTemplate: `<div style="width: 100vw;font-size:10px;text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`,

  printBackground: false,
  generateTaggedPDF: false,

  displayMetadata: false,
  debug: false,
  isTimestamp: false,
  enabledCss: false,
  concurrency: "5",
  version: "2",
};

export default class BetterExportPlugin extends Plugin {
  settings: BetterExportPluginSettings = { ...DEFAULT_SETTINGS };
  get i18n(): Lang {
    // getLanguage was introduced in Obsidian 1.8.7; support older versions too.
    let appLanguage: string | null = "en";
    try {
      appLanguage = typeof obsidian.getLanguage === "function"
        ? obsidian.getLanguage()
        : window.localStorage.getItem("language");
    } catch {
      // Storage may be unavailable in a restricted window.
    }
    return getTranslations(this.settings?.language ?? "auto", appLanguage);
  }

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
  }

  async onload() {
    await this.loadSettings();

    this.registerCommand();
    this.registerSetting();
    this.registerEvents();
  }

  registerCommand() {
    this.addCommand({
      id: "export-current-file",
      name: this.i18n.exportCurrentFile,
      checkCallback: (checking: boolean) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        const file = view?.file;
        if (!file) {
          return false;
        }
        if (checking) {
          return true;
        }
        new ExportConfigModal(this, file).open();

        return true;
      },
    });

  }

  registerSetting() {
    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new ConfigSettingTab(this.app, this));
  }

  registerEvents() {
    // Register the Export As HTML button in the file menu
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFile) && !(file instanceof TFolder)) return;
        if (file instanceof TFile && file.extension !== "md") return;
        let title = file instanceof TFolder ? this.i18n.menu.exportFolder : this.i18n.menu.exportFile;
        if (isDev) {
          title = `${title} (dev)`;
        }

        menu.addItem((item) => {
          item
            .setTitle(title)
            .setIcon("download")
            .setSection("action")
            .onClick(async () => {
              new ExportConfigModal(this, file).open();
            });
        });
      }),
    );
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFile) && !(file instanceof TFolder)) return;
        if (file instanceof TFile && file.extension !== "md") return;
        if (file instanceof TFolder) {
          let title = this.i18n.menu.exportOptions;
          if (isDev) {
            title = `${title} (dev)`;
          }
          menu.addItem((item) => {
            item.setTitle(title).setIcon("lucide-folder-down").setSection("action");
            // @ts-ignore
            const subMenu: Menu = item.setSubmenu();
            subMenu.addItem((item) =>
              item
                .setTitle(this.i18n.menu.exportEachFile)
                .setIcon("lucide-file-stack")
                .onClick(async () => {
                  new ExportConfigModal(this, file, true).open();
                }),
            );
            subMenu.addItem((item) =>
              item
                .setTitle(this.i18n.menu.generateToc)
                .setIcon("lucide-file-text")
                .onClick(async () => {
                  await this.generateToc(file);
                }),
            );
          });
        }
      }),
    );
  }

  async generateToc(root: TFolder) {
    const tocPath = `${root.path ? root.path + "/" : ""}_TOC_.md`;
    const links = traverseFolder(root)
      .filter((file) => file.path !== tocPath)
      .map((file) => `[[${file.path}]]`);
    const content = `---\ntoc: true\ntitle: ${JSON.stringify(root.name)}\n---\n${links.join("\n")}\n`;
    const existing = this.app.vault.getAbstractFileByPath(tocPath);
    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, content);
    } else {
      await this.app.vault.create(tocPath, content);
    }
  }

  onunload() {}
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!isLanguageSetting(this.settings.language)) this.settings.language = "auto";
    if (!/^[1-9]\d*$/.test(this.settings.concurrency)) this.settings.concurrency = "5";
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

}
