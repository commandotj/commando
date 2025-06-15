import { app, BrowserWindow, shell, ipcMain, screen, Menu } from "electron";
import { release } from "os";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import "./ipc";
import { createWindow } from "./window";
import { getMenuTemplate } from "./menu";
// @ts-ignore
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

let win: BrowserWindow | null = null;
// Here, you can also use other preload
const preload = join(__dirname, "../preload/index.js");
const url = (process as any).env.VITE_DEV_SERVER_URL;
const indexHtml = join((process as any).env.DIST, "index.html");
const env = (process as any).env;

// --- Native OS App Menu ---
const isMac = (process as any).platform === "darwin";

// 示例：动态配置、i18n、主题对象（实际可从配置文件、store、全局状态等获取）
const config = {
    shortcutNewTab: "CmdOrCtrl+N",
    shortcutOpen: "CmdOrCtrl+O",
    shortcutSave: "CmdOrCtrl+S",
    showNewTab: true,
    showOpen: true,
    showSave: true,
};
const locale = {
    file: "文件",
    newTab: "新建标签页",
    open: "打开...",
    save: "保存",
    close: "关闭",
    quit: "退出",
    edit: "编辑",
    undo: "撤销",
    redo: "重做",
    cut: "剪切",
    copy: "复制",
    paste: "粘贴",
    pasteAndMatchStyle: "粘贴并匹配样式",
    delete: "删除",
    selectAll: "全选",
    speech: "语音",
    startSpeaking: "开始朗读",
    stopSpeaking: "停止朗读",
    view: "视图",
    reload: "重新加载",
    toggleFullscreen: "切换全屏",
    resetZoom: "重置缩放",
    zoomIn: "放大",
    zoomOut: "缩小",
};
const theme = {
    iconType: "dark", // 示例，可扩展更多主题属性
};

function sendMenuAction(action: string) {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        win.webContents.send("menu-action", action);
    }
}

async function initI18n() {
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
        // Set app user model id for windows
        electronApp.setAppUserModelId("com.electron");

        Menu.setApplicationMenu(Menu.buildFromTemplate(getMenuTemplate({})));
        createWindow({ preload, url, indexHtml, env });
    });

    // 支持运行时切换语言
    ipcMain.handle("set-language", async (_event, lang) => {
        await i18next.changeLanguage(lang);
        Menu.setApplicationMenu(Menu.buildFromTemplate(getMenuTemplate({})));
    });
})();

app.on("window-all-closed", () => {
    win = null;
    if ((process as any).platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
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
        createWindow({ preload, url, indexHtml, env });
    }
});

// 预留：监听配置、语言、主题变化事件，动态刷新菜单
// 例如：eventEmitter.on('localeChanged', (newLocale) => { ... })
// Menu.setApplicationMenu(Menu.buildFromTemplate(getMenuTemplate({ config, locale: newLocale, theme })));
