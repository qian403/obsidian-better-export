<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type BetterExportPlugin from "../main";
  import type { ExportConfigType, ExportConfigModal, DocType, FileListType, DocV2Type } from "../modal";
  import { Notice, TFile, loadPdfJs } from "obsidian";
  import { fixDocV2, printToPdf, renderMarkdownV2 } from "../render";
  import * as electron from "electron";
  import { getHeadingTree, safeParseInt, px2mm, sleep } from "../utils";
  import { getConcurrency } from "../utils/export";
  import { errorMessage, formatMessage } from "../i18n";
  import pLimit from "p-limit";
  import { icon, mountCanvas, mountNode } from "../actions";
  const fs = require("fs").promises;
  import * as os from "os";
  import * as path from "path";
  import { editPDF, getOutputFile, getOutputPath, makePrintOptions, writePdfFile } from "../pdf";
  import PreviewToolbar from "./PreviewToolbar.svelte";
  import { Mutex, printMutex } from "../utils/mutex";
  import { initRenderStates, completeRenderState, type RenderState } from "../utils/renderStates";
  import { PageSizeCalculator } from "../utils/pageSize";

  let { modal, plugin, config = $bindable() }: {
    modal: ExportConfigModal;
    plugin: BetterExportPlugin;
    config: ExportConfigType;
  } = $props();

  const settings = $derived(plugin.settings);
  const i18n = $derived(modal.i18n);
  let isPDF = $state(false);
  let rendering = $state(false);
  let renderStates = $state<RenderState[]>([]);
  let scale = $state(0.75);
  let previewEl = $state<HTMLDivElement>();
  let docs = $state<DocType[]>([]);
  let previewSizes = $state<{ width: number; height: number }[]>([]);
  let canvasDocs = $state<HTMLCanvasElement[]>([]);
  let disposed = false;
  let lastPdfKey = "";
  let revision = $state(0);
  let initialRender: Promise<void> | undefined;
  const resources = new Set<DocV2Type>();
  const previewMutex = new Mutex();
  const pageSizeCalc = new PageSizeCalculator(config, () => calcPageSize());

  function reportError(error: unknown) {
    console.error(error);
    if (!disposed) new Notice(formatMessage(i18n.notices.renderFailed, { error: errorMessage(error, i18n) }));
  }

  export function calcPageSize() {
    if (previewEl) scale = pageSizeCalc.calc(previewEl);
  }
  export async function handleChangeSize() { calcPageSize(); }

  async function renderFiles(data: FileListType) {
    const limit = pLimit(getConcurrency(settings.concurrency));
    const results = await Promise.allSettled(data.map((param, i) => limit(async () => {
      if (disposed) return;
      const result = await renderMarkdownV2({ app: modal.app, file: param.file, config, i18n });
      if (disposed) { result.cleanup(); return; }
      resources.add(result);
      renderStates = completeRenderState(renderStates, i);
      return result;
    })));
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") {
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          resources.delete(result.value);
          result.value.cleanup();
        }
      });
      throw failure.reason;
    }
    let rendered = results.flatMap((result) =>
      result.status === "fulfilled" && result.value ? [result.value] : []);
    if (disposed) return [];
    if (!modal.multiplePdf && rendered.length > 1) {
      rendered.forEach((item) => resources.delete(item));
      rendered = modal.mergeDocV2(rendered);
      rendered.forEach((item) => resources.add(item));
    }
    return rendered.map(({ doc, ...rest }) => {
      fixDocV2(doc, rest.file.basename, modal.app);
      doc.style.display = "none";
      return { ...rest, doc };
    });
  }

  export async function renderPreview(render = true) {
    if (render) {
      const { data } = await modal.getAllFilesV2();
      renderStates = initRenderStates(data);
      docs = await renderFiles(data);
      revision += 1;
      lastPdfKey = "";
    }
    calcPageSize();
  }

  export function toggleTitle(value: boolean) {
    for (const { doc } of docs) {
      doc.querySelectorAll<HTMLElement>("h1.__title__").forEach((el) => {
        el.style.display = value ? "block" : "none";
      });
    }
    previewEl?.querySelectorAll<HTMLElement>("h1.__title__").forEach((el) => {
      el.style.display = value ? "block" : "none";
    });
  }

  function measurePreviewItem(el: HTMLElement, index: number) {
    const measure = () => { previewSizes[index] = { width: el.offsetWidth, height: el.offsetHeight }; };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return { destroy: () => observer.disconnect() };
  }

  onMount(() => {
    if (previewEl) pageSizeCalc.startObserver(previewEl);
    initialRender = renderPreview(true).catch(reportError);
  });

  onDestroy(() => {
    disposed = true;
    pageSizeCalc.stopObserver();
    // Wait for any active print operation before unloading Markdown components.
    void printMutex.run(async () => {
      resources.forEach((item) => item.cleanup());
      resources.clear();
      canvasDocs = [];
    });
  });

  async function printDocs(outfiles: string[], onlyPreview = false, cb?: (file: string) => Promise<void>) {
    const configSnapshot = $state.snapshot(config);
    return printMutex.run(async () => {
      if (disposed) return false;
      const currentTitle = document.title;
      try {
        for (const [i, outfile] of outfiles.entries()) {
          if (disposed) return false;
          const { doc, file, frontMatter } = docs[i];
          const el = doc as HTMLDivElement;
          el.style.display = "block";
          el.dataset.betterExportActive = "true";
          document.title = file.basename;
          try {
            await sleep(200);
            const printed = await printToPdf(el, makePrintOptions({ ...settings, ...configSnapshot }, frontMatter));
            if (!onlyPreview) {
              let data = printed;
              data = await editPDF(data, {
                headings: getHeadingTree(el), frontMatter,
                displayMetadata: settings.displayMetadata, maxLevel: safeParseInt(settings.maxLevel, 6),
              });
              if (!await writePdfFile(outfile, data, i18n)) return false;
              if (configSnapshot.open) {
                // @ts-ignore Obsidian exposes Electron remote on desktop.
                await electron.remote.shell.openPath(outfile);
              }
            }
            if (onlyPreview) await fs.writeFile(outfile, printed);
            await cb?.(outfile);
          } finally {
            el.style.display = "none";
            delete el.dataset.betterExportActive;
          }
        }
        return true;
      } finally {
        document.title = currentTitle;
      }
    });
  }

  export async function getDocuments(): Promise<DocType[]> {
    await initialRender;
    return disposed ? [] : docs;
  }

  export async function handlePrintToPDF() {
    await initialRender;
    if (disposed) return false;
    if (!docs.length) { new Notice(i18n.notices.noFiles); return false; }
    const title = (modal.file as TFile)?.basename ?? modal.file.name;
    if (modal.multiplePdf) {
      const outputPath = await getOutputPath(title, i18n);
      if (!outputPath) return false;
      // Preserve relative folders so equally named notes never overwrite each other.
      const outfiles = docs.map(({ file }) => path.join(outputPath,
        file.path.slice(modal.file.path ? modal.file.path.length + 1 : 0).replace(/\.md$/, ".pdf")));
      for (const file of outfiles) await fs.mkdir(path.dirname(file), { recursive: true });
      return printDocs(outfiles);
    }
    const outputFile = await getOutputFile(title, settings.isTimestamp, i18n);
    return outputFile ? printDocs([outputFile]) : false;
  }

  async function renderPdf() {
    return previewMutex.run(async () => {
      await initialRender;
      if (disposed || !docs.length || !isPDF || config.format !== "pdf") return;
      const key = JSON.stringify({ config: $state.snapshot(config), revision });
      if (key === lastPdfKey) return;
      rendering = true;
      let tempDir: string | undefined;
      const canvases: HTMLCanvasElement[] = [];
      try {
        const pdfjsLib = await loadPdfJs();
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "obsidian-better-export-"));
        const tempFiles = docs.map((_, i) => path.join(tempDir!, `${i}.pdf`));
        const success = await printDocs(tempFiles, true, async (file) => {
          if (disposed) return;
          const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(await fs.readFile(file)) });
          try {
            const pdf = await loadingTask.promise;
            for (let i = 1; i <= pdf.numPages && !disposed; i++) {
              const page = await pdf.getPage(i);
              const canvas = document.createElement("canvas");
              const viewport = page.getViewport({ scale: Math.min(2, window.devicePixelRatio || 1.5) });
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
              canvases.push(canvas);
              page.cleanup();
            }
          } finally {
            await loadingTask.destroy();
          }
        });
        if (success && !disposed) {
          canvasDocs = canvases;
          lastPdfKey = key;
        }
      } catch (error) {
        isPDF = false;
        reportError(error);
      } finally {
        if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(console.error);
        rendering = false;
      }
    });
  }

  export function handleOpenDevTools() {
    // @ts-ignore Obsidian's desktop window API.
    document.win.electron.remote.getCurrentWebContents().openDevTools();
  }

  $effect(() => {
    // Read config reactively, but keep canvas/rendering state out of dependencies.
    const key = JSON.stringify({ config, revision });
    if (config.format !== "pdf") { isPDF = false; return; }
    if (!isPDF) return;
    const timer = setTimeout(() => { void renderPdf(); }, 300);
    return () => clearTimeout(timer);
  });
</script>

<div class="print-preview">
  <div class="progress">
    {#if renderStates.length > 0 && !renderStates.every((item) => item.status)}
      <div>{i18n.exportDialog.rendering}</div>
      {#each renderStates as item}
        <div>
          {#if item.status}
            <span use:icon={"check"}></span>
          {:else}
            <span use:icon={"loader"}></span>
          {/if}
          {item.filename}
        </div>
      {/each}
    {/if}
  </div>
  <PreviewToolbar {i18n} pdfAvailable={config.format === "pdf"} {isPDF} {rendering}
    onModeChange={(value) => { isPDF = value; }} />
  <div bind:this={previewEl}>
    <div class="preview-wrapper">
      <div class="print-preview-container" style="--modal-scale: {scale};" style:display={isPDF ? "none" : "block"}>
        {#each docs as item, i}
        <div class="print-size" style:visibility={config.pageSize === "Custom" ? "visible" : "hidden"}>
          {previewSizes[i] ? `${previewSizes[i].width}×${previewSizes[i].height}px\n${px2mm(previewSizes[i].width)}×${px2mm(previewSizes[i].height)}mm` : ""}
        </div>
          {#if modal.multiplePdf}
            <div class="filename">{item.file.name}</div>
          {/if}
          <div class="print-preview-item" use:mountNode={item.doc} use:measurePreviewItem={i}></div>
        {/each}
      </div>
      <div aria-busy={rendering} style:display={isPDF ? "block" : "none"} style:opacity={rendering ? 0.4 : 1}>
        {#each canvasDocs as canvas (canvas)}
          <div class="pdf-canvas-page" use:mountCanvas={canvas}></div>
        {/each}
      </div>
    </div>
  </div>
</div>
