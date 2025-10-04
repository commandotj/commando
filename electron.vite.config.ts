import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        resolve: {
            alias: {
                "@common": resolve("src/common"),
                "@main": resolve("src/main"),
                "@shared": resolve("src/shared"),
                // 引擎别名 - 只需要两个！
                "@engines": resolve("src/main/services/engine"),
                "@engine-shared": resolve("src/main/services/engine/shared"),
            },
        },
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        resolve: {
            alias: {
                "@common": resolve("src/common"),
                "@preload": resolve("src/preload"),
                "@shared": resolve("src/shared"),
            },
        },
    },
    renderer: {
        resolve: {
            alias: {
                "@renderer": resolve("src/renderer/src"),
            },
        },
        plugins: [react()],
    },
});
