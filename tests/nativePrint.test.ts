import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { PDFDocument } from "pdf-lib";
import { printNativePdf } from "../src/utils/nativePrint";

class FakeIpc extends EventEmitter {
  options: any;
  handler: (options: any) => void = () => {};
  send(_channel: string, options: any) { this.options = options; this.handler(options); }
}
test("native print validates fresh output and never writes the caller's existing destination", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "native-print-test-"));
  try {
    const destination = path.join(dir, "existing.pdf");
    await fs.writeFile(destination, "existing file");
    const pdf = await PDFDocument.create(); pdf.addPage(); const bytes = await pdf.save();
    const ipc = new FakeIpc();
    ipc.handler = async (options) => { await fs.writeFile(options.filepath, bytes); ipc.emit("print-to-pdf", {}, {}); };
    const result = await printNativePdf(ipc as never, { filepath: destination } as never);
    assert.equal((await PDFDocument.load(result)).getPageCount(), 1);
    assert.notEqual(ipc.options.filepath, destination);
    assert.equal(await fs.readFile(destination, "utf8"), "existing file");
    assert.equal(ipc.listenerCount("print-to-pdf"), 0);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
test("Obsidian's empty reply without a newly produced PDF rejects", async () => {
  const ipc = new FakeIpc(); ipc.handler = () => { ipc.emit("print-to-pdf", {}, {}); };
  await assert.rejects(printNativePdf(ipc as never, {}), { code: "nativePrintInvalid" });
});
test("timeout retains the native request until its late reply is drained", async () => {
  const ipc = new FakeIpc();
  await assert.rejects(printNativePdf(ipc as never, {}, 5), { code: "nativePrintTimeout" });
  assert.equal(ipc.listenerCount("print-to-pdf"), 1);
  await assert.rejects(printNativePdf(ipc as never, {}), { code: "nativePrintBusy" });
  ipc.emit("print-to-pdf", {}, {});
  assert.equal(ipc.listenerCount("print-to-pdf"), 0);
  const pdf = await PDFDocument.create(); pdf.addPage(); const bytes = await pdf.save();
  ipc.handler = async (options) => { await fs.writeFile(options.filepath, bytes); ipc.emit("print-to-pdf", {}, {}); };
  assert.ok((await printNativePdf(ipc as never, {})).length > 100);
});
