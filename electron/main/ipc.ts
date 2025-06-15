import { ipcMain, BrowserWindow } from "electron";
import { listDirSync } from "./listDir";
import { listDrives } from "./drive";

export function registerIpcHandlers({
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
    // IPC handler for directory listing
    ipcMain.handle("list-dir", async (_event, dirPath) => {
        try {
            return listDirSync(dirPath);
        } catch (err) {
            return [];
        }
    });

    // IPC handler for listing drives
    ipcMain.handle("list-drives", async () => {
        return await listDrives();
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

        if (env.VITE_DEV_SERVER_URL) {
            childWindow.loadURL(`${url}#${arg}`);
        } else {
            childWindow.loadFile(indexHtml, { hash: arg });
        }
    });
}
