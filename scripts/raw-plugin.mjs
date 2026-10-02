import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { readFile } from "node:fs/promises";
const require = createRequire(import.meta.url);

export const pagedScriptPath = resolve(dirname(require.resolve("pagedjs")), "../dist/paged.polyfill.min.js");

// Vite supports ?raw natively; use the same source import in esbuild.
export const rawPlugin = {
  name: "raw-assets",
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, (args) => ({
      path: args.path === "pagedjs-polyfill?raw" ? pagedScriptPath : require.resolve(args.path.slice(0, -4)), namespace: "raw-assets",
    }));
    build.onLoad({ filter: /.*/, namespace: "raw-assets" }, async (args) => ({
      contents: await readFile(args.path, "utf8"), loader: "text",
    }));
  },
};
