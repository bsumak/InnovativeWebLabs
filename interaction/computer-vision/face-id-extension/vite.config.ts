import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: { cors: { origin: [/chrome-extension:\/\//] } },
  build: {
    rolldownOptions: {
      input: {
        scanner: "src/scanner/index.html",
        settings: "src/settings/index.html",
      },
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    crx({ manifest }),
  ],
});
