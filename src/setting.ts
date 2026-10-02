import { App, PluginSettingTab, Setting, TextAreaComponent } from "obsidian";
import { languageNames, type Lang, type LanguageSetting } from "./i18n";
import BetterExportPlugin from "./main";

function setAttributes(element: HTMLTextAreaElement, attributes: { [x: string]: string }) {
  for (const key in attributes) {
    element.setAttribute(key, attributes[key]);
  }
}

export default class ConfigSettingTab extends PluginSettingTab {
  plugin: BetterExportPlugin;
  i18n: Lang;

  constructor(app: App, plugin: BetterExportPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.i18n = plugin.i18n;
  }

  display(): void {
    const { containerEl } = this;

    this.i18n = this.plugin.i18n;
    containerEl.empty();

    new Setting(containerEl)
      .setName(this.i18n.settings.language)
      .setDesc(this.i18n.settings.languageDesc)
      .addDropdown((dropdown) => dropdown
        .addOptions({ auto: this.i18n.settings.languageAuto, ...languageNames })
        .setValue(this.plugin.settings.language)
        .onChange(async (value) => {
          this.plugin.settings.language = value as LanguageSetting;
          await this.plugin.saveSettings();
          this.plugin.registerCommand();
          this.display();
        }));

    const supportDesc = new DocumentFragment();
    supportDesc.createDiv({
      text: this.i18n.settings.support,
    });
    new Setting(containerEl).setDesc(supportDesc);
    containerEl.createEl("a", {
      href: "https://github.com/qian403/obsidian-better-export",
      text: this.i18n.settings.community,
    });
    new Setting(containerEl).setName(this.i18n.settings.version).addDropdown((dropdown) => {
      dropdown
        .addOptions(Object.fromEntries(["1", "2"].map((v) => [v, `v${v}`])))
        .setValue(this.plugin.settings.version)
        .onChange(async (value: string) => {
          this.plugin.settings.version = value;
          await this.plugin.saveSettings();
          updateVersionVisibility(value);
        });
    });
    new Setting(containerEl).setName(this.i18n.settings.showTitle).addToggle((toggle) =>
      toggle
        .setTooltip(this.i18n.settings.showTitle)
        .setValue(this.plugin.settings.showTitle)
        .onChange(async (value) => {
          this.plugin.settings.showTitle = value;
          await this.plugin.saveSettings();
        }),
    );
    new Setting(containerEl).setName(this.i18n.settings.displayHeader).addToggle((toggle) =>
      toggle
        .setTooltip(this.i18n.settings.displayHeader)
        .setValue(this.plugin.settings.displayHeader)
        .onChange(async (value) => {
          this.plugin.settings.displayHeader = value;
          await this.plugin.saveSettings();
        }),
    );
    new Setting(containerEl).setName(this.i18n.settings.displayFooter).addToggle((toggle) =>
      toggle
        .setTooltip(this.i18n.settings.displayFooter)
        .setValue(this.plugin.settings.displayFooter)
        .onChange(async (value) => {
          this.plugin.settings.displayFooter = value;
          await this.plugin.saveSettings();
        }),
    );

    new Setting(containerEl)
      .setName(this.i18n.settings.printBackground)
      .setDesc(this.i18n.settings.printBackgroundDesc)
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.printBackground).onChange(async (value) => {
          this.plugin.settings.printBackground = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(this.i18n.settings.generateTaggedPDF)
      .setDesc(
        this.i18n.settings.generateTaggedPDFDesc,
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.generateTaggedPDF).onChange(async (value) => {
          this.plugin.settings.generateTaggedPDF = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl).setName(this.i18n.settings.maxLevel).addDropdown((dropdown) => {
      dropdown
        .addOptions(Object.fromEntries(["1", "2", "3", "4", "5", "6"].map((level) => [level, `h${level}`])))
        .setValue(this.plugin.settings.maxLevel)
        .onChange(async (value: string) => {
          this.plugin.settings.maxLevel = value;
          await this.plugin.saveSettings();
        });
    });

    new Setting(containerEl)
      .setName(this.i18n.settings.displayMetadata)
      .setDesc(this.i18n.settings.displayMetadataDesc)
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.displayMetadata).onChange(async (value) => {
          this.plugin.settings.displayMetadata = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(this.i18n.settings.includeLinkedNotes)
      .setDesc(this.i18n.settings.includeLinkedNotesDesc)
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.includeLinkedNotes)
        .onChange(async (value) => {
          this.plugin.settings.includeLinkedNotes = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl).setName(this.i18n.settings.advanced).setHeading();

    const headerContentAreaSetting = new Setting(containerEl);
    headerContentAreaSetting.settingEl.setAttribute("style", "display: grid; grid-template-columns: 1fr;");
    headerContentAreaSetting
      .setName(this.i18n.settings.headerTemplate)
      .setDesc(
        this.i18n.settings.headerTemplateDesc,
      );
    const hederContentArea = new TextAreaComponent(headerContentAreaSetting.controlEl);

    setAttributes(hederContentArea.inputEl, {
      style: "margin-top: 12px; width: 100%; height: 6vh;",
    });
    hederContentArea.setValue(this.plugin.settings.headerTemplate).onChange(async (value) => {
      this.plugin.settings.headerTemplate = value;
      await this.plugin.saveSettings();
    });

    const footerContentAreaSetting = new Setting(containerEl);
    footerContentAreaSetting.settingEl.setAttribute("style", "display: grid; grid-template-columns: 1fr;");
    footerContentAreaSetting
      .setName(this.i18n.settings.footerTemplate)
      .setDesc(this.i18n.settings.footerTemplateDesc);
    const footerContentArea = new TextAreaComponent(footerContentAreaSetting.controlEl);

    setAttributes(footerContentArea.inputEl, {
      style: "margin-top: 12px; width: 100%; height: 6vh;",
    });
    footerContentArea.setValue(this.plugin.settings.footerTemplate).onChange(async (value) => {
      this.plugin.settings.footerTemplate = value;
      await this.plugin.saveSettings();
    });

    new Setting(containerEl)
      .setName(this.i18n.settings.isTimestamp)
      .setDesc(this.i18n.settings.isTimestampDesc)
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.isTimestamp).onChange(async (value) => {
          this.plugin.settings.isTimestamp = value;
          await this.plugin.saveSettings();
        });
      });
    const enabledCssSetting = new Setting(containerEl)
      .setName(this.i18n.settings.enabledCss)
      .setDesc(this.i18n.settings.enabledCssDesc)
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.enabledCss).onChange(async (value) => {
          this.plugin.settings.enabledCss = value;
          await this.plugin.saveSettings();
        });
      });

    const updateVersionVisibility = (version: string) => {
      enabledCssSetting.settingEl.hidden = version !== "1";
    };
    updateVersionVisibility(this.plugin.settings.version);
    new Setting(containerEl)
      .setName(this.i18n.settings.concurrency)
      .setDesc(this.i18n.settings.concurrencyDesc)
      .addText((cb) => {
        const concurrency = this.plugin.settings?.concurrency;
        cb.setValue(concurrency?.length > 0 ? concurrency : "5").onChange(async (value) => {
          if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) return;
          this.plugin.settings.concurrency = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl).setName(this.i18n.settings.debug).setHeading();
    new Setting(containerEl)
      .setName(this.i18n.settings.debugMode)
      .setDesc(this.i18n.settings.debugModeDesc)
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.debug).onChange(async (value) => {
          this.plugin.settings.debug = value;
          await this.plugin.saveSettings();
        });
      });
  }
}
