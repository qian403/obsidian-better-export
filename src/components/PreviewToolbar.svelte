<script lang="ts">
  import type { Lang } from "../i18n";

  let { i18n, pdfAvailable = false, isPDF = false, rendering = false, onModeChange }: {
    i18n: Lang;
    pdfAvailable?: boolean;
    isPDF?: boolean;
    rendering?: boolean;
    onModeChange?: (isPDF: boolean) => void;
  } = $props();
</script>

<section class="preview-toolbar" aria-label={i18n.exportDialog.previewMode}>
  {#if pdfAvailable}
    <div class="preview-modes" role="group" aria-label={i18n.exportDialog.previewMode}>
      <button type="button" aria-pressed={!isPDF} class:active={!isPDF} onclick={() => onModeChange?.(false)}>
        {i18n.exportDialog.contentPreview}
      </button>
      <button type="button" aria-pressed={isPDF} class:active={isPDF} onclick={() => onModeChange?.(true)}>
        {i18n.exportDialog.pdfPreview}
      </button>
    </div>
  {:else}
    <strong>{i18n.exportDialog.contentPreview}</strong>
  {/if}
  <p>{pdfAvailable ? (isPDF ? i18n.exportDialog.pdfPreviewDesc : i18n.exportDialog.contentPreviewDesc) : i18n.exportDialog.documentPreviewDesc}</p>
  <p>{i18n.exportDialog.previewFormatHint}</p>
  {#if rendering && isPDF}
    <p role="status" class="preview-status">{i18n.exportDialog.generatingPdfPreview}</p>
  {/if}
</section>

<style>
  .preview-toolbar {
    flex: none;
    padding: 0 0 12px;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--background-modifier-border);
    font-size: var(--font-ui-small, 13px);
  }
  .preview-modes { display: flex; flex-wrap: wrap; gap: 6px; }
  button { height: auto; min-height: 32px; padding: 6px 10px; white-space: normal; }
  button.active {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
  }
  button:focus-visible { outline: 2px solid var(--interactive-accent); outline-offset: 2px; }
  p { color: var(--text-muted); line-height: 1.5; margin: 8px 0 0; }
  .preview-status { color: var(--text-normal); }
</style>
