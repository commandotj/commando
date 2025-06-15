"use strict";
const electron = require("electron");
const os = require("os");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const fs = require("fs");
const i18next = require("i18next");
function listDirSync(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries.map((entry) => {
    let size = void 0;
    let mtime = void 0;
    try {
      const stat = fs.statSync(path.join(dirPath, entry.name));
      if (!entry.isDirectory()) {
        size = stat.size;
      }
      mtime = stat.mtimeMs;
    } catch (e) {
      size = void 0;
      mtime = void 0;
    }
    return {
      name: entry.name,
      isDirectory: entry.isDirectory(),
      size,
      mtime
    };
  });
}
const drivelist = require("drivelist");
async function listDrives() {
  try {
    const drives = await drivelist.list();
    return drives.filter((d) => d.mountpoints && d.mountpoints.length > 0).map((d) => ({
      device: d.device,
      description: d.description,
      size: d.size,
      mountpoints: d.mountpoints,
      // [{ path }]
      isSystem: d.system,
      isRemovable: d.isRemovable
    }));
  } catch (err) {
    console.error("[drivelist] error:", err);
    console.error("[drivelist] process.env.PATH:", process.env.PATH);
    return [];
  }
}
function registerIpcHandlers({
  preload: preload2,
  url: url2,
  indexHtml: indexHtml2,
  env: env2
}) {
  electron.ipcMain.handle("list-dir", async (_event, dirPath) => {
    try {
      return listDirSync(dirPath);
    } catch (err) {
      return [];
    }
  });
  electron.ipcMain.handle("list-drives", async () => {
    return await listDrives();
  });
  electron.ipcMain.handle("open-win", (_, arg) => {
    const childWindow = new electron.BrowserWindow({
      webPreferences: {
        preload: preload2,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });
    if (env2.VITE_DEV_SERVER_URL) {
      childWindow.loadURL(`${url2}#${arg}`);
    } else {
      childWindow.loadFile(indexHtml2, { hash: arg });
    }
  });
}
let mainWindow = null;
async function createWindow({
  preload: preload2,
  url: url2,
  indexHtml: indexHtml2,
  env: env2
}) {
  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new electron.BrowserWindow({
    title: "Main window",
    icon: path.join(env2.PUBLIC, "favicon.ico"),
    width: width * 2 / 3,
    height: height - 200,
    webPreferences: {
      preload: preload2,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  mainWindow.webContents.setWindowOpenHandler(({ url: url22 }) => {
    if (url22.startsWith("https:")) electron.shell.openExternal(url22);
    return { action: "deny" };
  });
}
const defaultConfig = {
  shortcutNewTab: "CmdOrCtrl+N",
  shortcutOpen: "CmdOrCtrl+O",
  shortcutSave: "CmdOrCtrl+S",
  showNewTab: true,
  showOpen: true,
  showSave: true
};
const defaultTheme = {
  // 可扩展 icon/color 等
  iconType: "default"
};
function getMenuTemplate({ config = defaultConfig, theme = defaultTheme } = {}) {
  const platform = process.platform;
  const template = [
    {
      label: i18next.t("menu.file.label"),
      submenu: [
        {
          label: i18next.t("menu.file.newTab"),
          accelerator: config.shortcutNewTab,
          visible: config.showNewTab,
          click: () => sendMenuAction("new-tab")
        },
        {
          label: i18next.t("menu.file.open"),
          accelerator: config.shortcutOpen,
          visible: config.showOpen,
          click: () => sendMenuAction("open")
        },
        {
          label: i18next.t("menu.file.save"),
          accelerator: config.shortcutSave,
          visible: config.showSave,
          click: () => sendMenuAction("save")
        },
        { type: "separator" },
        platform === "darwin" ? {
          label: i18next.t("menu.file.close"),
          role: "close"
        } : {
          label: i18next.t("menu.file.quit"),
          role: "quit"
        }
      ]
    },
    {
      label: i18next.t("menu.edit.label"),
      submenu: [
        { label: i18next.t("menu.edit.undo"), role: "undo" },
        { label: i18next.t("menu.edit.redo"), role: "redo" },
        { type: "separator" },
        { label: i18next.t("menu.edit.cut"), role: "cut" },
        { label: i18next.t("menu.edit.copy"), role: "copy" },
        { label: i18next.t("menu.edit.paste"), role: "paste" },
        ...platform === "darwin" ? [
          {
            label: i18next.t("menu.edit.pasteAndMatchStyle"),
            role: "pasteAndMatchStyle"
          },
          {
            label: i18next.t("menu.edit.delete"),
            role: "delete"
          },
          {
            label: i18next.t("menu.edit.selectAll"),
            role: "selectAll"
          },
          { type: "separator" },
          {
            label: i18next.t("menu.edit.speech"),
            submenu: [
              {
                label: i18next.t("menu.edit.startSpeaking"),
                role: "startSpeaking"
              },
              {
                label: i18next.t("menu.edit.stopSpeaking"),
                role: "stopSpeaking"
              }
            ]
          }
        ] : [
          {
            label: i18next.t("menu.edit.delete"),
            role: "delete"
          },
          { type: "separator" },
          {
            label: i18next.t("menu.edit.selectAll"),
            role: "selectAll"
          }
        ]
      ]
    },
    {
      label: i18next.t("menu.view.label"),
      submenu: [
        {
          label: i18next.t("menu.view.reload"),
          accelerator: "CmdOrCtrl+R",
          click: () => sendMenuAction("reload")
        },
        {
          label: i18next.t("menu.view.toggleFullscreen"),
          accelerator: "F11",
          click: () => sendMenuAction("toggle-fullscreen")
        },
        {
          label: i18next.t("menu.view.resetZoom"),
          role: "resetZoom"
        },
        {
          label: i18next.t("menu.view.zoomIn"),
          role: "zoomIn"
        },
        {
          label: i18next.t("menu.view.zoomOut"),
          role: "zoomOut"
        }
      ]
    }
  ];
  return [
    ...platform === "darwin" ? [{ role: "appMenu" }] : [],
    ...template
  ];
}
function sendMenuAction(action) {
  const win2 = electron.BrowserWindow.getFocusedWindow();
  if (win2) {
    win2.webContents.send("menu-action", action);
  }
}
const menu$1 = { "file": { "label": "File", "newTab": "New Tab", "open": "Open...", "save": "Save", "close": "Close", "quit": "Quit" }, "edit": { "label": "Edit", "undo": "Undo", "redo": "Redo", "cut": "Cut", "copy": "Copy", "paste": "Paste", "pasteAndMatchStyle": "Paste and Match Style", "delete": "Delete", "selectAll": "Select All", "speech": "Speech", "startSpeaking": "Start Speaking", "stopSpeaking": "Stop Speaking" }, "view": { "label": "View", "reload": "Reload", "toggleFullscreen": "Toggle Full Screen", "resetZoom": "Reset Zoom", "zoomIn": "Zoom In", "zoomOut": "Zoom Out" } };
const enUS = {
  menu: menu$1
};
const menu = { "file": { "label": "文件", "newTab": "新建标签页", "open": "打开...", "save": "保存", "close": "关闭", "quit": "退出" }, "edit": { "label": "编辑", "undo": "撤销", "redo": "重做", "cut": "剪切", "copy": "复制", "paste": "粘贴", "pasteAndMatchStyle": "粘贴并匹配样式", "delete": "删除", "selectAll": "全选", "speech": "语音", "startSpeaking": "开始朗读", "stopSpeaking": "停止朗读" }, "view": { "label": "视图", "reload": "重新加载", "toggleFullscreen": "切换全屏", "resetZoom": "重置缩放", "zoomIn": "放大", "zoomOut": "缩小" } };
const zhCN = {
  menu
};
process.env.DIST_ELECTRON = path.join(__dirname, "../");
process.env.DIST = path.join(process.env.DIST_ELECTRON, "../dist");
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL ? path.join(process.env.DIST_ELECTRON, "../public") : process.env.DIST;
if (os.release().startsWith("6.1")) electron.app.disableHardwareAcceleration();
if (!electron.app.requestSingleInstanceLock()) {
  electron.app.quit();
  process.exit(0);
}
let win = null;
const preload = path.join(__dirname, "../preload/index.js");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = path.join(process.env.DIST, "index.html");
const env = process.env;
process.platform === "darwin";
async function initI18n() {
  await i18next.init({
    lng: "zh-CN",
    // 默认语言，可根据系统或配置动态设置
    fallbackLng: "en-US",
    resources: {
      "en-US": { translation: enUS },
      "zh-CN": { translation: zhCN }
    }
  });
}
(async () => {
  await initI18n();
  electron.app.whenReady().then(() => {
    utils.electronApp.setAppUserModelId("com.electron");
    electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(getMenuTemplate({})));
    createWindow({ preload, url, indexHtml, env });
  });
  electron.ipcMain.handle("set-language", async (_event, lang) => {
    await i18next.changeLanguage(lang);
    electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(getMenuTemplate({})));
  });
})();
electron.app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") electron.app.quit();
});
electron.app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});
electron.app.on("activate", () => {
  const allWindows = electron.BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow({ preload, url, indexHtml, env });
  }
});
registerIpcHandlers({ preload, url, indexHtml, env });
