import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Lets the palette test read src/index.css, which is the single source of
    // truth for the theme tokens.
    css: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
