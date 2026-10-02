<script lang="ts">
  import type BetterExportPlugin from "../main";
  import type { ExportConfigType, ExportConfigModal } from "../modal";
  import { validateExportConfig } from "../utils/export";
  import { Notice } from "obsidian";
  import { exportDocuments } from "../exporters";
  import { errorMessage, formatMessage } from "../i18n";
  import ExportSettings from "./ExportSettings.svelte";
  import { untrack } from "svelte";
  import PdfPreview1 from "./PdfPreview.svelte";
  import PdfPreview2 from "./PdfPreviewV2.svelte";

  let {
    modal,
    plugin,
  }: {
    modal: ExportConfigModal;
    plugin: BetterExportPlugin;
  } = $props();

  let config = $state<ExportConfigType>(untrack(() => $state.snapshot(modal.defaultConfig)));

  let pdfPreview = $state<PdfPreview1 | PdfPreview2 | null>(null);

  export async function onCssSnippetChange() {
    await pdfPreview?.renderPreview(false);
  }

  export async function refreshPreview() {
    try { await pdfPreview?.renderPreview(true); } catch (error) {
      new Notice(formatMessage(plugin.i18n.notices.renderFailed, { error: errorMessage(error, plugin.i18n) }));
    }
  }

  export async function handleOpenDevTools() {
    await pdfPreview?.handleOpenDevTools();
  }

  let exporting = $state(false);

  export async function handleExport() {
    if (exporting) return;
    const invalid = ["pdf", "docx", "html", "rtf"].includes(config.format) ? validateExportConfig(config) : undefined;
    if (invalid) {
      new Notice(plugin.i18n.notices[invalid]);
      return;
    }
    exporting = true;
    try {
      const success = config.format === "pdf"
        ? await pdfPreview?.handlePrintToPDF()
        : await exportDocuments({ modal, plugin, config: $state.snapshot(config), getDocuments: () => pdfPreview?.getDocuments() ?? Promise.resolve([]) });
      if (success) {
        plugin.settings.prevConfig = $state.snapshot(config);
        await plugin.saveSettings();
        modal.close();
      }
    } catch (error) {
      console.error(error);
      new Notice(formatMessage(plugin.i18n.notices.exportFailed, { error: errorMessage(error, plugin.i18n) }));
    } finally {
      exporting = false;
    }
  }

</script>

<div id="better-export">
  <!-- PDF Preview Area -->
  {#if plugin.settings?.version == "1"}
    <PdfPreview1 {modal} {plugin} {config} bind:this={pdfPreview} />
  {:else}
    <PdfPreview2 {modal} {plugin} {config} bind:this={pdfPreview} />
  {/if}

  <!-- Settings Sidebar -->
  <ExportSettings {modal} {plugin} bind:config {pdfPreview} {handleExport} {refreshPreview} {exporting} />
</div>
