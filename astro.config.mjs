// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  vite: {
    assetsInclude: ["**/*.node"],
    plugins: [
      tailwindcss(),
      {
        name: "resolve-duckdb-node-bindings",
        resolveId(source) {
          if (source.includes("@duckdb/node-bindings")) {
            return { id: source, external: true };
          }
          return null;
        },
      },
    ],
    build: {
      rollupOptions: {
        external: [
          // "fs",
          // "fs/promises",
          // "stream",
          // "string_decoder",
          "@duckdb/node-api",
          "@duckdb/node-bindings-linux-x64/duckdb.node",
          "@duckdb/node-bindings-linux-arm64/duckdb.node",
          "@duckdb/node-bindings-darwin-x64/duckdb.node",
          "@duckdb/node-bindings-win32-x64/duckdb.node",
          "@duckdb/node-bindings-darwin-arm64/duckdb.node",
        ],
      },
    },
    optimizeDeps: {
      exclude: [
        // "fs",
        // "fs/promises",
        // "stream",
        // "string_decoder",
        "@duckdb/node-bindings-linux-x64/duckdb.node",
        "@duckdb/node-bindings-linux-arm64/duckdb.node",
        "@duckdb/node-bindings-darwin-x64/duckdb.node",
        "@duckdb/node-bindings-darwin-arm64/duckdb.node",
        "@duckdb/node-bindings-win32-x64/duckdb.node",
      ],
    },
    ssr: {
      external: [
        "@duckdb/node-bindings-linux-x64/duckdb.node",
        "@duckdb/node-bindings-linux-arm64/duckdb.node",
        "@duckdb/node-bindings-darwin-x64/duckdb.node",
        "@duckdb/node-bindings-darwin-arm64/duckdb.node",
        "@duckdb/node-bindings-win32-x64/duckdb.node",
      ],
    },
  },
});
