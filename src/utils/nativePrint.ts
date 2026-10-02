import type { IpcRenderer, IpcRendererEvent, PrintToPDFOptions } from "electron";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

class NativePrintError extends Error {
  constructor(public code: "nativePrintBusy" | "nativePrintTimeout" | "nativePrintInvalid") {
    super(code);
    this.name = "NativePrintError";
  }
}

// Native replies carry no request id and may signal failure with the same {} reply.
// Retain timed-out jobs until their late reply drains, avoiding reply misattribution.
const pending = new WeakSet<IpcRenderer>();

export async function printNativePdf(ipc: IpcRenderer, options: PrintToPDFOptions, timeoutMs = 60_000): Promise<Uint8Array> {
  if (pending.has(ipc)) throw new NativePrintError("nativePrintBusy");
  pending.add(ipc);
  let tempDir: string;
  try {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "better-export-print-"));
  } catch (error) { pending.delete(ipc); throw error; }
  const output = path.join(tempDir, "output.pdf");
  const cleanup = () => fs.rm(tempDir, { recursive: true, force: true }).catch(console.error);

  return new Promise((resolve, reject) => {
    let timedOut = false;
    const onResult = async (_event: IpcRendererEvent, _result: unknown) => {
      clearTimeout(timer);
      pending.delete(ipc);
      if (timedOut) { await cleanup(); return; }
      try {
        const buffer = await fs.readFile(output);
        if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("The PDF printer produced invalid output.");
        resolve(new Uint8Array(buffer));
      } catch (error) {
        console.error(error);
        reject(new NativePrintError("nativePrintInvalid"));
      } finally { await cleanup(); }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      reject(new NativePrintError("nativePrintTimeout"));
      // Keep the listener, job lock and temp directory until the native reply arrives.
    }, timeoutMs);
    ipc.once("print-to-pdf", onResult);
    try { ipc.send("print-to-pdf", { ...options, filepath: output }); }
    catch (error) {
      clearTimeout(timer);
      pending.delete(ipc);
      ipc.removeListener("print-to-pdf", onResult);
      void cleanup();
      reject(error);
    }
  });
}
