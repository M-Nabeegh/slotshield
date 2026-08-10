export const GITHUB_PAGES_URL = "https://m-nabeegh.github.io/slotshield/";

export const FULL_PREVIEW_URL = GITHUB_PAGES_URL;

const viteEnv = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env;

export const IS_STATIC_PREVIEW =
  viteEnv?.VITE_STATIC_DEMO === "1" ||
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_STATIC_DEMO === "1");

export const PUBLIC_PREVIEW_URL = IS_STATIC_PREVIEW
  ? GITHUB_PAGES_URL
  : FULL_PREVIEW_URL;
