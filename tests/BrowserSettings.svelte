<script lang="ts">
  import ExportSettings from "../src/components/ExportSettings.svelte";
  import { locales } from "../src/i18n";
  import { config as initialConfig, settings } from "./fixtures";
  let config = $state({ ...initialConfig, footerLeftEnabled: false, footerRightEnabled: false });
  let exporting = $state(false);
  const plugin = { i18n: locales["zh-TW"], settings } as any;
  const modal = { cssSnippets: () => ({}) } as any;
  const preview = { toggleTitle: () => {}, handleChangeSize: async () => {} };
  async function handleExport() { exporting = true; await new Promise((resolve) => setTimeout(resolve, 120)); exporting = false; }
  $effect(() => { (window as any).exportConfig = $state.snapshot(config); });
</script>
<div id="better-export"><div class="print-preview"><h1>測試筆記</h1><p>預覽區域</p></div>
  <ExportSettings {modal} {plugin} bind:config pdfPreview={preview} {handleExport} refreshPreview={async () => {}} {exporting} />
</div>
