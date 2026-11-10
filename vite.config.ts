import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { slotshieldApi } from "./server/vitePlugin";

export default defineConfig(({ mode }) => ({
  // The GitHub Pages build is static: no API routes, served from /slotshield/.
  base: mode === "pages" ? "/slotshield/" : "/",
  plugins: [react(), slotshieldApi()],
  build: {
    outDir: mode === "pages" ? "dist/pages" : "dist/app",
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "server/**/*.test.ts", "cli/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
  },
}));
