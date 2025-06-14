import { app, BrowserWindow, shell, ipcMain, screen, Menu } from "electron";
import { release } from "node:os";
import { join } from "node:path";
import fs from "fs";
import path from "path";
import { listDirSync } from "./listDir";

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, "../");
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist");
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
    ? join(process.env.DIST_ELECTRON, "../public")
    : process.env.DIST;

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
    app.quit();
    process.exit(0);
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null;
// Here, you can also use other preload
const preload = join(__dirname, "../preload/index.js");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = join(process.env.DIST, "index.html");

// --- Native OS App Menu ---
const isMac = process.platform === "darwin";

const template: Electron.MenuItemConstructorOptions[] = [
    {
        label: "File",
        submenu: [
            {
                label: "New Tab",
                accelerator: "CmdOrCtrl+N",
                click: () => sendMenuAction("new-tab"),
            },
            {
                label: "Open...",
                accelerator: "CmdOrCtrl+O",
                click: () => sendMenuAction("open"),
            },
            {
                label: "Save",
                accelerator: "CmdOrCtrl+S",
                click: () => sendMenuAction("save"),
            },
            { type: "separator" as const },
            isMac ? { role: "close" as const } : { role: "quit" as const },
        ],
    },
    {
        label: "Edit",
        submenu: [
            { role: "undo" as const },
            { role: "redo" as const },
            { type: "separator" as const },
            { role: "cut" as const },
            { role: "copy" as const },
            { role: "paste" as const },
            ...(isMac
                ? [
                      { role: "pasteAndMatchStyle" as const },
                      { role: "delete" as const },
                      { role: "selectAll" as const },
                      { type: "separator" as const },
                      {
                          label: "Speech",
                          submenu: [
                              { role: "startSpeaking" as const },
                              { role: "stopSpeaking" as const },
                          ],
                      },
                  ]
                : [
                      { role: "delete" as const },
                      { type: "separator" as const },
                      { role: "selectAll" as const },
                  ]),
        ],
    },
    {
        label: "View",
        submenu: [
            {
                label: "Reload",
                accelerator: "CmdOrCtrl+R",
                click: () => sendMenuAction("reload"),
            },
            {
                label: "Toggle Full Screen",
                accelerator: "F11",
                click: () => sendMenuAction("toggle-fullscreen"),
            },
            { role: "resetZoom" as const },
            { role: "zoomIn" as const },
            { role: "zoomOut" as const },
        ],
    },
];

function sendMenuAction(action: string) {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        win.webContents.send("menu-action", action);
    }
}

async function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    win = new BrowserWindow({
        title: "Main window",
        icon: join(process.env.PUBLIC, "favicon.ico"),
        width: (width * 2) / 3,
        height: height - 200,
        webPreferences: {
            preload,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(url);
        // In development, open DevTools (React DevTools is often built-in)
        win.webContents.openDevTools();
        // If you want to load a specific extension, use win.webContents.session.loadExtension(path)
    } else {
        win.loadFile(indexHtml);
    }

    // Test actively push message to the Electron-Renderer
    win.webContents.on("did-finish-load", () => {
        win?.webContents.send(
            "main-process-message",
            new Date().toLocaleString()
        );
    });

    // Make all links open with the browser, not with the application
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("https:")) shell.openExternal(url);
        return { action: "deny" };
    });
}

app.whenReady().then(() => {
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    createWindow();
});

app.on("window-all-closed", () => {
    win = null;
    if (process.platform !== "darwin") app.quit();
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
        createWindow();
    }
});

// New window example arg: new windows url
ipcMain.handle("open-win", (_, arg) => {
    const childWindow = new BrowserWindow({
        webPreferences: {
            preload,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        childWindow.loadURL(`${url}#${arg}`);
    } else {
        childWindow.loadFile(indexHtml, { hash: arg });
    }
});

// IPC handler for directory listing
ipcMain.handle("list-dir", async (_event, dirPath) => {
    try {
        return listDirSync(dirPath);
    } catch (err) {
        return [];
    }
});
