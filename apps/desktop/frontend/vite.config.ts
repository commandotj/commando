import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wails from "@wailsio/runtime/plugins/vite";

const frontendDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(frontendDir, "../../..");
const uiDir = resolve(repoRoot, "packages/ui");
const sharedDir = resolve(repoRoot, "packages/shared");

export default defineConfig({
    root: frontendDir,
    publicDir: resolve(frontendDir, "public"),
    server: {
        host: "127.0.0.1",
        port: Number(process.env.WAILS_VITE_PORT) || 5189,
        strictPort: true,
    },
    build: {
        outDir: "dist",
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(frontendDir, "index.html"),
        },
    },
    plugins: [react(), wails(resolve(frontendDir, "bindings"))],
    optimizeDeps: {
        entries: [resolve(frontendDir, "index.html")],
    },
    resolve: {
        alias: {
            "@commandojs/ui": resolve(uiDir, "src"),
            "@commandojs/ui/": resolve(uiDir, "src/"),
            "@commandojs/shared": sharedDir,
            "@common": sharedDir,
        },
    },
});
