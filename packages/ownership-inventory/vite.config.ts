import OMT from "@surma/rollup-plugin-off-main-thread";
import react from "@vitejs/plugin-react";
import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import toml from "rollup-plugin-toml";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [
    OMT(),
    react(),
    toml,
    {
      name: "StaticFiles",
      async writeBundle(options, bundle) {
        let outDir = options.dir!;
        [
          "node_modules/coi-serviceworker/coi-serviceworker.js",
          "node_modules/@wcrichto/rust-editor/dist/editor.worker.js",
        ].forEach(f => {
          fs.copyFileSync(f, path.join(outDir, path.basename(f)));
        });

        /*
        The web workers generated by rust-editor are in ESM format, so they have
        `new URL(..., import.meta.url)` calls. This is important for Vite to 
        find the referenced and copy them into the output. However, some browsers
        like Firefox don't support ESM web workers. A hack that seems to work is just
        replacing all `import.meta.url` references with `self.location`.

        Note that has to happen in `writeBundle` and not `transform`, since if we
        make this change too soon, then Vite misses the URLs and doesn't copy the
        assets.
        */
        ["ra-worker", "workerHelpers"].forEach(name => {
          let asset = Object.values(bundle).find(asset => asset.name == name)!;
          let assetPath = path.join(outDir, asset.fileName);
          let contents = fs.readFileSync(assetPath, "utf-8");
          contents = contents.replace(/import\.meta\.url/g, `self.location`);
          fs.writeFileSync(assetPath, contents);
        });
      },
    },
  ],
});
