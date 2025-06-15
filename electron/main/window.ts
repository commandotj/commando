import { BrowserWindow, screen, shell } from "electron";
import { join } from "node:path";

let win: BrowserWindow | null = null;

export async function createWindow({
    preload,
    url,
    indexHtml,
    env,
}: {
    preload: string;
    url: string;
    indexHtml: string;
    env: any;
}) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    win = new BrowserWindow({
        title: "Main window",
        icon: join(env.PUBLIC, "favicon.ico"),
        width: (width * 2) / 3,
        height: height - 200,
        webPreferences: {
            preload,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    if (env.VITE_DEV_SERVER_URL) {
        win.loadURL(url);
        win.webContents.openDevTools();
    } else {
        win.loadFile(indexHtml);
    }

    win.webContents.on("did-finish-load", () => {
        win?.webContents.send(
            "main-process-message",
            new Date().toLocaleString()
        );
    });

    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("https:")) shell.openExternal(url);
        return { action: "deny" };
    });
}

export function getMainWindow() {
    return win;
}
