import { BrowserWindow, screen, shell } from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";

let mainWindow: BrowserWindow | null = null;

/**
 * 获取应用图标路径
 * 开发环境使用resources目录中的图标，生产环境依赖electron-builder配置
 */
function getIconPath(): string | undefined {
    if (is.dev) {
        // 开发环境：使用resources目录中的图标
        return join(__dirname, "../resources/icon.png");
    }
    // 生产环境：返回undefined，让electron-builder处理图标
    return undefined;
}

export async function createWindow({
    preload,
}: {
    preload: string;
    env: { PUBLIC: string };
}): Promise<void> {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow = new BrowserWindow({
        title: "Commando",
        icon: getIconPath(),
        width: (width * 2) / 3,
        height: height - 200,
        webPreferences: {
            preload,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
        mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
    }

    mainWindow.webContents.on("did-finish-load", () => {
        mainWindow?.webContents.send(
            "main-process-message",
            new Date().toLocaleString()
        );
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("https:")) shell.openExternal(url);
        return { action: "deny" };
    });
}

export function getMainWindow(): BrowserWindow | null {
    return mainWindow;
}
