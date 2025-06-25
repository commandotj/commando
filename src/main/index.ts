import { app, BrowserWindow, ipcMain, Menu } from "electron";
import { release } from "os";
import { join } from "path";
import { electronApp } from "@electron-toolkit/utils";
import { registerIpcHandlers } from "./ipc";
import { createWindow, getMainWindow } from "./window";
import { getMenuTemplate } from "./menu";
import i18next from "i18next";
import enUS from "./i18n/en-US.json";
import zhCN from "./i18n/zh-CN.json";

(process as any).env.DIST_ELECTRON = join(__dirname, "../");
(process as any).env.DIST = join((process as any).env.DIST_ELECTRON, "../dist");
(process as any).env.PUBLIC = (process as any).env.VITE_DEV_SERVER_URL
    ? join((process as any).env.DIST_ELECTRON, "../public")
    : (process as any).env.DIST;

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration();

if (!app.requestSingleInstanceLock()) {
    app.quit();
    (process as any).exit(0);
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// Here, you can also use other preload
const preload = join(__dirname, "../preload/index.js");
const url = (process as any).env.VITE_DEV_SERVER_URL;
const indexHtml = join((process as any).env.DIST, "index.html");
const env = (process as any).env;

async function initI18n(): Promise<void> {
    await i18next.init({
        lng: "zh-CN", // 默认语言，可根据系统或配置动态设置
        fallbackLng: "en-US",
        resources: {
            "en-US": { translation: enUS },
            "zh-CN": { translation: zhCN },
        },
    });
}

(async () => {
    await initI18n();
    app.whenReady().then(() => {
        // 注册所有 IPC handler
        registerIpcHandlers({ preload, url, indexHtml, env });

        // Set app user model id for windows
        electronApp.setAppUserModelId("com.electron");

        Menu.setApplicationMenu(Menu.buildFromTemplate(getMenuTemplate({})));
        createWindow({ preload, env });
    });

    // 支持运行时切换语言
    ipcMain.handle("set-language", async (_event, lang) => {
        await i18next.changeLanguage(lang);
        Menu.setApplicationMenu(Menu.buildFromTemplate(getMenuTemplate({})));
    });
})();

app.on("window-all-closed", () => {
    if ((process as any).platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
    const win = getMainWindow();

    if (win) {
        // Focus on the main window if the user tried to open another
        if (win.isMinimized()) win.restore();
        win.focus();
    }
});

app.on("activate", () => {
    const allWindows = BrowserWindow.getAllWindows();
    if (allWindows.length) {
        allWindows[0].focus();
    } else {
        createWindow({ preload, env });
    }
});

// 预留：监听配置、语言、主题变化事件，动态刷新菜单
// 例如：eventEmitter.on('localeChanged', (newLocale) => { ... })
// Menu.setApplicationMenu(Menu.buildFromTemplate(getMenuTemplate({ config, locale: newLocale, theme })));
