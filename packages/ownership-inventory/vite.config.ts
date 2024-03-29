//@ts-nocheck
import OMT from "@surma/rollup-plugin-off-main-thread";
import react from "@vitejs/plugin-react";
import { generateAssets } from "@wcrichto/rust-editor/dist/build-utils.cjs";
import * as cp from "child_process";
import toml from "rollup-plugin-toml";
import { defineConfig } from "vite";

let commitHash = cp.execSync("git rev-parse HEAD").toString("utf-8").trim();
let [serverUrl, telemetryUrl] = process.argv.includes("--watch")
  ? ["http://localhost:8001", "http://localhost:8001"]
  : [
      "https://willcrichton.net/rust-experiments/ownership-inventory",
      "https://rust-book.willcrichton.net/rust-experiments",
    ];
let stage = process.env["STAGE"] || null;

export default defineConfig({
  base: "./",
  define: {
    COMMIT_HASH: JSON.stringify(commitHash),
    TELEMETRY_URL: JSON.stringify(telemetryUrl),
    STAGE: JSON.stringify(stage),
  },
  plugins: [
    OMT(),
    react(),
    toml,
    {
      name: "StaticFiles",
      async writeBundle(options) {
        let outDir = options.dir!;
        generateAssets({ outDir, serverUrl });
      },
    },
  ],
});
