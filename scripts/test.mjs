import { build } from "esbuild";
import { readdir, rm, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { rawPlugin } from "./raw-plugin.mjs";
const outdir = resolve(".test-build");
try {
  await mkdir(outdir, { recursive: true });
  const tests = (await readdir("tests")).filter((name) => name.endsWith(".test.ts"));
  await build({ entryPoints: tests.map((name) => `tests/${name}`), outdir,
    outExtension: { ".js": ".cjs" }, bundle: true, platform: "node", format: "cjs", target: "node20",
    external: ["docx", "linkedom", "jszip"], plugins: [rawPlugin],
    alias: { obsidian: resolve("tests/mocks/obsidian.ts"), electron: resolve("tests/mocks/electron.ts") },
  });
  const result = spawnSync(process.execPath, ["--test", "--test-reporter=dot", ...tests.map((name) => resolve(outdir, name.replace(/\.ts$/, ".cjs")))], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
} finally { await rm(outdir, { recursive: true, force: true }); }
