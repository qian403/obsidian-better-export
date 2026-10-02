<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type BetterExportPlugin from "../main";
  import type { ExportConfigType, ExportConfigModal, DocType } from "../modal";
  import { TFile, Notice } from "obsidian";
  import { getConcurrency } from "../utils/export";
  import { formatMessage } from "../i18n";
  import * as path from "path";
  import { getAllStyles, getPatchStyle, makeWebviewJs, renderMarkdown, type ParamType } from "../render";
  import * as electron from "electron";
  import { px2mm, sleep } from "../utils";
  import { fixDoc } from "../render";
  import { exportToPDF, getOutputFile, getOutputPath } from "../pdf";
  import { icon } from "../actions";
  import { initRenderStates, completeRenderState, type RenderState } from "../utils/renderStates";
  import { PageSizeCalculator } from "../utils/pageSize";
  import { Mutex } from "../utils/mutex";
  import pLimit from "p-limit";
  import PreviewToolbar from "./PreviewToolbar.svelte";
  const fs = require("fs").promises;

  let {
    modal,
    plugin,
    config = $bindable(),
  }: {
    modal: ExportConfigModal;
    plugin: BetterExportPlugin;
    config: ExportConfigType;
  } = $props();

  const settings = $derived(plugin.settings);
  const i18n = $derived(modal.i18n);
  let initialRender: Promise<void> | undefined;
  const renderMutex = new Mutex();
  let renderId = $state(0);
  let disposed = false;

  // State
  let completed = $state(false);
  let docs = $state<DocType[]>([]);
  let webviews = $state<electron.WebviewTag[]>([]);
  let scale = $state(0.75);
  let previewEl = $state<HTMLDivElement>();

  let renderStates = $state<RenderState[]>([]);
  const pageSizeCalc = new PageSizeCalculator(config, () => calcPageSize());

  export function calcPageSize() {
    if (!previewEl) return;
    scale = pageSizeCalc.calc(previewEl);
  }

  export async function calcWebviewSize() {
    await sleep(500);

    await Promise.all(webviews.map(async (e, i) => {
      const [width, height] = await e.executeJavaScript("[document.body.offsetWidth, document.body.offsetHeight]");
      docs[i] = { ...docs[i], printSize: `${width}×${height}px²\n${px2mm(width)}×${px2mm(height)}mm²` };
    }));
  }

  export async function handleChangeSize() {
    await calcPageSize();
    await calcWebviewSize();
  }

  async function renderFiles(data: ParamType[], allDocs?: any[], cb?: (i: number) => void) {
    const concurrency = getConcurrency(settings.concurrency);
    const limit = pLimit(concurrency);

    const currentConfig = $state.snapshot(config);

    console.debug("file list data:", data, currentConfig);

    const inputs = data.map((param, i) =>
      limit(async () => {
        if (disposed) return;
        const option = { ...param, config: currentConfig, i18n };
        const res = await renderMarkdown(option);
        cb?.(i);
        return res;
      }),
    );
    let _docs = [...(allDocs ?? []), ...(await Promise.all(inputs)).filter(Boolean)];
    if (disposed) return [];

    if (modal.file instanceof TFile) {
      const leaf = modal.app.workspace.getLeaf();
      await leaf.openFile(modal.file);
    }

    if (!modal.multiplePdf && _docs.length > 0) {
      _docs = modal.mergeDoc(_docs);
    }
    return _docs.map(({ doc, ...rest }) => {
      return { ...rest, doc: fixDoc(doc, doc.title, modal.app) };
    });
  }

  async function updatePreview(render = true) {
    if (disposed) return;
    if (render) {
      const { data, docs: allDocs } = await modal.getAllFiles();
      if (disposed) return;
      renderStates = initRenderStates(data);
      const rendered = await renderFiles(data, allDocs, (i) => { if (!disposed) renderStates = completeRenderState(renderStates, i); });
      if (disposed) return;
      docs = rendered;
    }

    if (!render) docs = docs.map((item) => ({ ...item }));
    webviews = [];

    const promises = docs.map((docItem) => {
      return new Promise<void>((resolve, reject) => {
        // @ts-ignore
        docItem.resolve = resolve;
        // @ts-ignore runtime webview readiness hook
        docItem.reject = reject;
      });
    });

    renderId += 1;
    await Promise.all(promises);
    calcPageSize();
    await calcWebviewSize();
  }

  export function renderPreview(render = true) {
    initialRender = renderMutex.run(() => updatePreview(render)).catch((error) => {
      docs = [];
      webviews = [];
      console.error(error);
      if (!disposed) new Notice(formatMessage(i18n.notices.renderFailed, { error: String(error) }));
    });
    return initialRender;
  }

  export function toggleTitle(value: boolean) {
    webviews.forEach((wv, i) => {
      wv.executeJavaScript(`
        var _title = document.querySelector("h1.__title__");
        if (_title) {
          _title.style.display = "${value ? "block" : "none"}";
        }
      `);
      const _title = docs[i]?.doc?.querySelector("h1.__title__") as HTMLHeadingElement;
      if (_title) {
        _title.style.display = value ? "block" : "none";
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
    if (!docs.length || !webviews.length) { new Notice(i18n.notices.noFiles); return false; }
    const title = (modal.file as TFile)?.basename ?? modal.file.name;
    if (modal.multiplePdf) {
      const outputPath = await getOutputPath(title, i18n);
      if (!outputPath) return false;
      const results = await Promise.all(webviews.map(async (wb, i) => {
        const outfile = path.join(outputPath,
          docs[i].file.path.slice(modal.file.path ? modal.file.path.length + 1 : 0).replace(/\.md$/, ".pdf"));
        await fs.mkdir(path.dirname(outfile), { recursive: true });
        return exportToPDF(outfile, { ...settings, ...config }, wb, docs[i], i18n);
      }));
      return results.every(Boolean);
    }
    const outputFile = await getOutputFile(title, settings.isTimestamp, i18n);
    return outputFile ? exportToPDF(outputFile, { ...settings, ...config }, webviews[0], docs[0], i18n) : false;
  }

  export function handleOpenDevTools() {
    webviews[webviews.length - 1]?.openDevTools();
  }

  function initWebviewEvents(preview: electron.WebviewTag, docObj: any) {
    webviews.push(preview);

    const handler = async () => {
      try {
      completed = true;
      await Promise.all(getAllStyles().map((css) => preview.insertCSS(css)));
      if (config.cssSnippet && config.cssSnippet != "0") {
        try {
          const cssSnippet = await fs.readFile(config.cssSnippet, { encoding: "utf8" });
          const printCss = cssSnippet.replaceAll(/@media print\s*{([^}]+)}/g, "$1");
          await preview.insertCSS(printCss);
          await preview.insertCSS(cssSnippet);
        } catch (error) {
          console.warn(error);
        }
      }
      await preview.executeJavaScript(makeWebviewJs(docObj.doc));
      await Promise.all(getPatchStyle().map((css) => preview.insertCSS(css)));
      if (docObj.resolve) {
        docObj.resolve();
        delete docObj.resolve;
        delete docObj.reject;
      }
      } catch (error) { docObj.reject?.(error); }
    };

    preview.addEventListener("dom-ready", handler);

    return {
      destroy() {
        preview.removeEventListener("dom-ready", handler);
        docObj.reject?.(new Error("Export dialog closed"));
      },
    };
  }

  onDestroy(() => { disposed = true; });

  onMount(() => {
    if (!previewEl) return;
    pageSizeCalc.startObserver(previewEl);

    // Initial render
    initialRender = renderPreview(true).catch((error) => {
      console.error(error);
      if (!disposed) new Notice(formatMessage(i18n.notices.renderFailed, { error: String(error) }));
    });

    return () => {
      pageSizeCalc.stopObserver();
    };
  });
</script>

<div class="print-preview">
  <PreviewToolbar {i18n} />
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
  <div bind:this={previewEl}>
    {#each docs as item, i (`${renderId}:${i}`)}
      {#if modal.multiplePdf}
        <div class="filename">{i + 1}-{item.doc.title}</div>
      {/if}
      <div class="webview-wrapper">
        <div class="print-size" style:visibility={config.pageSize === "Custom" ? "visible" : "hidden"}>
          {item.printSize ?? ""}
        </div>
        <webview
          src="app://obsidian.md/help.html"
          nodeintegration={true}
          class="print-preview-container"
          style="--modal-scale: {scale};display:flex;height:100%;"
          use:initWebviewEvents={item}
        ></webview>
      </div>
    {/each}
  </div>
</div>
