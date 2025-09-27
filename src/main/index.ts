import { app, BrowserWindow, Menu } from "electron"
import { release } from "os"
import { join } from "path"
import { electronApp, is } from "@electron-toolkit/utils"
import { registerIpcHandlers } from "./ipc"
import { createWindow, getMainWindow } from "./window"
import { getMenuTemplate } from "./menu"
import { initializeServices, cleanupServices } from "./services"
import logger from "@main/log/logger"

process.env.DIST_ELECTRON = join(__dirname, "../")
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist")
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL ? join(process.env.DIST_ELECTRON, "../public") : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration()

if (!app.requestSingleInstanceLock()) {
    app.quit()
    process.exit(0)
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// Here, you can also use other preload
const preload = join(__dirname, "../preload/index.js")
const url = process.env.VITE_DEV_SERVER_URL || ""
const indexHtml = join(process.env.DIST, "index.html")
const env = process.env as unknown as { PUBLIC: string }

app.whenReady().then(async () => {
    try {
        // 设置应用图标（包括 Dock 图标）
        if (is.dev) {
            const iconPath = join(__dirname, "../../resources/icon.png")
            // 设置 dock 图标
            if (process.platform === "darwin" && app.dock) {
                app.dock.setIcon(iconPath)
            }
        }

        // 注册所有 IPC handler
        registerIpcHandlers({ preload, url, indexHtml, env })

        // Set app user model id for windows
        electronApp.setAppUserModelId("me.systembug.commando")

        Menu.setApplicationMenu(Menu.buildFromTemplate(getMenuTemplate({})))

        // Create the main window
        await createWindow({ preload, env })

        // Initialize services after window is created
        const mainWindow = getMainWindow()
        if (mainWindow) {
            await initializeServices(mainWindow)
            logger.info("Application services initialized successfully")
        } else {
            logger.error("Failed to get main window for services initialization")
        }
    } catch (error) {
        logger.error("Failed to initialize application", {
            error: error instanceof Error ? error.message : String(error),
        })
    }
})

app.on("window-all-closed", async () => {
    try {
        // Cleanup services before quitting
        await cleanupServices()
        logger.info("Services cleaned up successfully")
    } catch (error) {
        logger.error("Failed to cleanup services", {
            error: error instanceof Error ? error.message : String(error),
        })
    }

    if (process.platform !== "darwin") app.quit()
})

app.on("second-instance", () => {
    const win = getMainWindow()

    if (win) {
        // Focus on the main window if the user tried to open another
        if (win.isMinimized()) win.restore()
        win.focus()
    }
})

app.on("activate", () => {
    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length) {
        allWindows[0].focus()
    } else {
        createWindow({ preload, env })
    }
})

// 预留：监听配置、语言、主题变化事件，动态刷新菜单
// 例如：eventEmitter.on('localeChanged', (newLocale) => { ... })
// Menu.setApplicationMenu(Menu.buildFromTemplate(getMenuTemplate({ config, locale: newLocale, theme })));
