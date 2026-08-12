import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryRoot = resolve(import.meta.dirname, "..");

export default defineConfig({
  base: "/slotshield/",
  root: resolve(repositoryRoot, "pages-demo"),
  publicDir: resolve(repositoryRoot, "public"),
  plugins: [react()],
  build: {
    outDir: resolve(repositoryRoot, "dist/pages-client"),
    emptyOutDir: true,
  },
});
