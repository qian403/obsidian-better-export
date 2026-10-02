<script lang="ts">
  import ExportSettings from "../src/components/ExportSettings.svelte";
  import PreviewToolbar from "../src/components/PreviewToolbar.svelte";
  import { locales } from "../src/i18n";
  import { config as initialConfig, settings } from "./fixtures";
  let config = $state({ ...initialConfig, footerLeftEnabled: false, footerRightEnabled: false });
  let exporting = $state(false);
  let isPDF = $state(false);
  const plugin = { i18n: locales["zh-TW"], settings } as any;
  const modal = { cssSnippets: () => ({}) } as any;
  const preview = { toggleTitle: () => {}, handleChangeSize: async () => {} };
  async function handleExport() { exporting = true; await new Promise((resolve) => setTimeout(resolve, 120)); exporting = false; }
  $effect(() => { (window as any).exportConfig = $state.snapshot(config); });
  $effect(() => { if (config.format !== "pdf") isPDF = false; });
</script>
<div id="better-export"><div class="print-preview">
  <PreviewToolbar i18n={plugin.i18n} pdfAvailable={config.format === "pdf"} {isPDF}
    onModeChange={(value) => { isPDF = value; }} />
  <div><h1>測試筆記</h1><p>預覽區域</p></div></div>
  <ExportSettings {modal} {plugin} bind:config pdfPreview={preview} {handleExport} refreshPreview={async () => {}} {exporting} />
</div>
