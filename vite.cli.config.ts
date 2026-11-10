import { defineConfig } from "vite";

/** Bundles the command-line tool into one file Node can run directly. */
export default defineConfig({
  build: {
    ssr: "cli/slotshield.ts",
    outDir: "dist/cli",
    target: "node22",
    rollupOptions: {
      output: { entryFileNames: "slotshield.js", banner: "#!/usr/bin/env node" },
    },
  },
});
