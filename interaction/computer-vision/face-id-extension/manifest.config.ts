import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  description: "Face ID authentication for the web",
  icons: {
    "16": "public/png/icon-16.png",
    "48": "public/png/icon-48.png",
    "128": "public/png/icon-128.png",
  },
  action: {
    default_popup: "src/popup/index.html",
    default_icon: {
      "16": "public/png/icon-16.png",
      "48": "public/png/icon-48.png",
      "128": "public/png/icon-128.png",
    },
  },
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  incognito: "split",
  permissions: ["storage", "activeTab", "tabs"],
  web_accessible_resources: [
    {
      resources: ["src/scanner/index.html", "src/settings/index.html"],
      matches: ["<all_urls>"],
    },
  ],
  content_scripts: [
    {
      js: ["src/content/main.ts"],
      matches: ["<all_urls>"],
      run_at: "document_idle",
    },
  ],
});
