import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

const configDir = fileURLToPath(new URL(".", import.meta.url));
const electronRoot = resolve(configDir, "..");

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        resolve: {
            alias: {
                "@common": resolve(electronRoot, "main/common"),
                "@main": resolve(electronRoot, "main"),
                "@shared": resolve(electronRoot, "shared"),
                "@engines": resolve(electronRoot, "main/engine"),
                "@engine-shared": resolve(electronRoot, "main/engine/shared"),
            },
        },
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        resolve: {
            alias: {
                "@common": resolve(electronRoot, "main/common"),
                "@preload": resolve(electronRoot, "preload"),
                "@shared": resolve(electronRoot, "shared"),
            },
        },
    },
    renderer: {
        resolve: {
            alias: {
                "@renderer": resolve(electronRoot, "renderer"),
            },
        },
        plugins: [react()],
    },
});
