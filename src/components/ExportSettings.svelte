<script lang="ts">
  import type BetterExportPlugin from "../main";
  import type { ExportConfigType, ExportConfigModal } from "../modal";
  import { settingToggle, settingDropdown, settingSlider, settingButton, settingDoubleText, settingText } from "../actions";

  import { exportFormats, type ExportFormat } from "../exporters/types";

  let {
    modal,
    plugin,
    config = $bindable(),
    pdfPreview,
    handleExport,
    refreshPreview,
    exporting = false,
  }: {
    modal: ExportConfigModal;
    plugin: BetterExportPlugin;
    config: ExportConfigType;
    pdfPreview: any;
    exporting?: boolean;
    handleExport: () => void;
    refreshPreview: () => Promise<void>;
  } = $props();

  const i18n = $derived(plugin.i18n);
  const settings = $derived(plugin.settings);
  const formatOptions = $derived(Object.fromEntries(Object.entries(exportFormats).map(([key, value]) => [key,
    key === "txt" ? `${i18n.exportDialog.plainText} (.txt)` : key === "rtf" ? `${i18n.exportDialog.richText} (.rtf)` : value.label])));
  const paged = $derived(exportFormats[config.format].paged);
  const formatDescription = $derived(i18n.exportDialog[`${config.format}Desc`]);

  // ── Derived visibility states ──────────────────────────
  let showCustomSize = $derived(config.pageSize === "Custom");
  let showCustomMargin = $derived(config.marginType === "3");

  // ── Page sizes ─────────────────────────────────────────
  const pageSizes = ["A0", "A1", "A2", "A3", "A4", "A5", "A6", "Legal", "Letter", "Tabloid", "Ledger", "Custom"];
  const pageSizeOptions = $derived(Object.fromEntries(pageSizes.map((s) => [s, s === "Custom" ? i18n.exportDialog.custom : s])));

  const marginOptions: Record<string, string> = $derived({
    "0": i18n.exportDialog.none,
    "1": i18n.exportDialog.default,
    "2": i18n.exportDialog.small,
    "3": i18n.exportDialog.custom,
  });

  // ── CSS Snippets ───────────────────────────────────────
  const snippets = $derived(modal.cssSnippets());
  const hasSnippets = $derived(Object.keys(snippets).length > 0 && settings.enabledCss);
  const snippetOptions = $derived({ "0": i18n.exportDialog.noSnippet, ...snippets });

  function handleKeyup(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.isComposing && !event.repeat && !exporting && !(event.target instanceof HTMLButtonElement)) {
      handleExport();
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="setting-wrapper" onkeyup={handleKeyup}>
  <div use:settingDropdown={{ name: i18n.exportDialog.format, options: formatOptions, value: config.format,
    onChange: (value) => { config.format = value as ExportFormat; } }}></div>
  <p class="export-format-description">{formatDescription}</p>
  {#if config.format === "html"}
    <div use:settingToggle={{ name: i18n.exportDialog.pagedHtml, desc: i18n.exportDialog.pagedHtmlDesc,
      value: config.pagedHtml ?? false, onChange: (value) => { config.pagedHtml = value; } }}></div>
  {/if}
  <!-- Filename as Title -->
  <div
    use:settingToggle={{
      name: i18n.exportDialog.filenameAsTitle,
      tooltip: i18n.exportDialog.filenameAsTitle,
      value: config.showTitle,
      onChange: (value) => {
        config.showTitle = value;
        pdfPreview?.toggleTitle(value);
      },
    }}
  ></div>

  {#if paged}
  <h3 class="export-section-title">{i18n.exportDialog.pageSetup}</h3>
  <!-- Page Size -->
  <div
    use:settingDropdown={{
      name: i18n.exportDialog.pageSize,
      options: pageSizeOptions,
      value: config.pageSize as string,
      onChange: async (value) => {
        config.pageSize = value as ExportConfigType["pageSize"];
        await pdfPreview?.handleChangeSize?.();
      },
    }}
  ></div>

  <!-- Custom Width / Height -->
  {#if showCustomSize}
    <div
      use:settingDoubleText={{
        name: i18n.exportDialog.widthHeight,
        input1: {
          placeholder: i18n.exportDialog.width,
          value: config.pageWidth ?? "",
          isDebounce: true,
          onChange: async (value) => {
            config.pageWidth = value;
            await pdfPreview?.handleChangeSize?.();
          },
        },
        input2: {
          placeholder: i18n.exportDialog.height,
          value: config.pageHeight ?? "",
          isDebounce: true,
          onChange: async (value) => {
            config.pageHeight = value;
            await pdfPreview?.handleChangeSize?.();
          },
        },
      }}
    ></div>
  {/if}

  <!-- Margin -->
  <div
    use:settingDropdown={{
      name: i18n.exportDialog.margin,
      desc: i18n.exportDialog.millimeters,
      options: marginOptions,
      value: config.marginType,
      onChange: (value) => {
        config.marginType = value;
      },
    }}
  ></div>

  <!-- Custom Margin Top/Bottom -->
  {#if showCustomMargin}
    <div
      use:settingDoubleText={{
        name: i18n.exportDialog.topBottom,
        input1: {
          placeholder: i18n.exportDialog.marginTop,
          value: config.marginTop ?? "",
          onChange: (value) => {
            config.marginTop = value;
          },
        },
        input2: {
          placeholder: i18n.exportDialog.marginBottom,
          value: config.marginBottom ?? "",
          onChange: (value) => {
            config.marginBottom = value;
          },
        },
      }}
    ></div>

    <!-- Custom Margin Left/Right -->
    <div
      use:settingDoubleText={{
        name: i18n.exportDialog.leftRight,
        input1: {
          placeholder: i18n.exportDialog.marginLeft,
          value: config.marginLeft ?? "",
          onChange: (value) => {
            config.marginLeft = value;
          },
        },
        input2: {
          placeholder: i18n.exportDialog.marginRight,
          value: config.marginRight ?? "",
          onChange: (value) => {
            config.marginRight = value;
          },
        },
      }}
    ></div>
  {/if}

  {#if config.format === "pdf"}
  <!-- Scale -->
  <div
    use:settingSlider={{
      name: i18n.exportDialog.downscalePercent,
      limits: [10, 200, 1],
      value: config.scale,
      onChange: (value) => {
        config.scale = value;
      },
    }}
  ></div>

  {/if}
  <!-- Landscape -->
  <div
    use:settingToggle={{
      name: i18n.exportDialog.landscape,
      tooltip: i18n.exportDialog.landscape,
      value: config.landscape,
      onChange: (value) => {
        config.landscape = value;
      },
    }}
  ></div>

  {#if config.format !== "html" || config.pagedHtml}
  <!-- Display Header -->
  <div
    use:settingToggle={{
      name: i18n.exportDialog.displayHeader,
      tooltip: i18n.exportDialog.displayHeader,
      value: config.displayHeader,
      onChange: (value) => {
        config.displayHeader = value;
      },
    }}
  ></div>

  <!-- Display Footer -->
  <div
    use:settingToggle={{
      name: i18n.exportDialog.displayFooter,
      tooltip: i18n.exportDialog.displayFooter,
      value: config.displayFooter,
      onChange: (value) => {
        config.displayFooter = value;
      },
    }}
  ></div>

  {/if}
  {/if}

  <!-- Open after export -->
  <div
    use:settingToggle={{
      name: i18n.exportDialog.openAfterExport,
      tooltip: i18n.exportDialog.openAfterExportDesc,
      value: config.open,
      onChange: (value) => {
        config.open = value;
      },
    }}
  ></div>

  <h3 class="export-section-title">{i18n.exportDialog.annotations}</h3>
  <p class="export-format-description">{paged ? i18n.exportDialog.annotationDesc : i18n.exportDialog.annotationUnpagedDesc}</p>
  <div use:settingToggle={{ name: i18n.exportDialog.footerLeftEnabled, value: config.footerLeftEnabled ?? false,
    onChange: (value) => { config.footerLeftEnabled = value; } }}></div>
  {#if config.footerLeftEnabled}
    <div class="annotation-text" use:settingText={{ name: i18n.exportDialog.footerLeftText,
      value: config.footerLeftText ?? "", placeholder: i18n.exportDialog.annotationPlaceholder,
      onChange: (value) => { config.footerLeftText = value; } }}></div>
  {/if}
  <div use:settingToggle={{ name: i18n.exportDialog.footerRightEnabled, value: config.footerRightEnabled ?? false,
    onChange: (value) => { config.footerRightEnabled = value; } }}></div>
  {#if config.footerRightEnabled}
    <div class="annotation-text" use:settingText={{ name: i18n.exportDialog.footerRightText,
      value: config.footerRightText ?? "", placeholder: i18n.exportDialog.annotationPlaceholder,
      onChange: (value) => { config.footerRightText = value; } }}></div>
  {/if}

  <!-- CSS Snippets -->
  {#if config.format === "pdf" && hasSnippets && settings.version == "1"}
    <div
      use:settingDropdown={{
        name: i18n.exportDialog.cssSnippets,
        options: snippetOptions,
        value: config.cssSnippet ?? "0",
        onChange: async (value) => {
          config.cssSnippet = value;
          await pdfPreview?.renderPreview(false);
        },
      }}
    ></div>
  {/if}

  <!-- Export Button -->
  <div
    use:settingButton={{
      text: exporting ? i18n.exportDialog.exporting : i18n.exportDialog.export,
      disabled: exporting,
      cta: true,
      onClick: () => handleExport(),
    }}
  ></div>

  <!-- Refresh Button -->
  {#if settings.version == "1"}
    <div
      use:settingButton={{
        text: i18n.exportDialog.refresh,
        onClick: () => refreshPreview(),
      }}
    ></div>
  {/if}

  <!-- Debug Button -->
  <div
    use:settingButton={{
      text: i18n.exportDialog.debug,
      hidden: !settings?.debug,
      onClick: () => pdfPreview?.handleOpenDevTools(),
    }}
  ></div>
</div>
