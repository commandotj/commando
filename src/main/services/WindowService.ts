/**
 * Window Service 实现
 * 提供窗口管理功能：创建、关闭、最小化、最大化、状态跟踪等
 */

import { IpcMainInvokeEvent, BrowserWindow } from "electron"
import { Service, ServiceMetadata, BaseService } from "./core/ServiceDecorator"
import logger from "../log/logger"

interface WindowOptions {
    width?: number
    height?: number
    x?: number
    y?: number
    center?: boolean
    resizable?: boolean
    minimizable?: boolean
    maximizable?: boolean
    closable?: boolean
    alwaysOnTop?: boolean
    fullscreen?: boolean
    show?: boolean
    title?: string
    icon?: string
    webPreferences?: Electron.WebPreferences
}

interface WindowInfo {
    id: number
    title: string
    bounds: Electron.Rectangle
    isVisible: boolean
    isMinimized: boolean
    isMaximized: boolean
    isFullScreen: boolean
    isAlwaysOnTop: boolean
    url?: string
}

@Service({
    name: "WindowService",
    version: "1.0.0",
    description: "Window management service for creating and managing application windows",
})
export default class WindowService implements BaseService {
    private windows = new Map<number, BrowserWindow>()
    private mainWindow: BrowserWindow | null = null
    private preload: string = ""
    private url: string = ""
    private indexHtml: string = ""
    private env: Record<string, string> = {}

    constructor(mainWindow?: BrowserWindow) {
        this.mainWindow = mainWindow || null
    }

    async initialize(): Promise<void> {
        logger.info("WindowService initialized with window management capabilities")
    }

    async cleanup(): Promise<void> {
        logger.info("WindowService cleaning up")
        // 关闭所有子窗口，但保留主窗口
        for (const [, window] of this.windows) {
            if (window !== this.mainWindow && !window.isDestroyed()) {
                window.close()
            }
        }
        this.windows.clear()
    }

    setMainWindow(mainWindow: BrowserWindow): void {
        this.mainWindow = mainWindow
    }

    /**
     * 设置窗口配置参数
     */
    setWindowConfig(config: { preload: string; url: string; indexHtml: string; env: Record<string, string> }): void {
        this.preload = config.preload
        this.url = config.url
        this.indexHtml = config.indexHtml
        this.env = config.env
    }

    sendLoadingState(loading: boolean, message?: string, error?: boolean): void {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send("service:loading", {
                service: this.getMetadata().name,
                loading,
                message,
                error,
                timestamp: Date.now(),
            })
        }
    }

    getMetadata(): ServiceMetadata {
        return {
            name: "WindowService",
            version: "1.0.0",
            ipcChannels: [
                { channel: "window:create", type: "handle" },
                { channel: "window:close", type: "handle" },
                { channel: "window:minimize", type: "handle" },
                { channel: "window:maximize", type: "handle" },
                { channel: "window:restore", type: "handle" },
                { channel: "window:center", type: "handle" },
                { channel: "window:set-bounds", type: "handle" },
                { channel: "window:set-title", type: "handle" },
                { channel: "window:set-always-on-top", type: "handle" },
                { channel: "window:list", type: "handle" },
                { channel: "window:get-info", type: "handle" },
                { channel: "window:focus", type: "handle" },
                { channel: "window:show", type: "handle" },
                { channel: "window:hide", type: "handle" },
                { channel: "window:toggle-fullscreen", type: "handle" },
            ],
            description: "Window management service for creating and managing application windows",
        }
    }

    /**
     * 创建新窗口
     */
    async handleCreate(
        _event: IpcMainInvokeEvent,
        options: WindowOptions = {},
        route?: string
    ): Promise<{ id: number; success: boolean; error?: string }> {
        try {
            const defaultOptions: Electron.BrowserWindowConstructorOptions = {
                width: 1200,
                height: 800,
                center: true,
                resizable: true,
                minimizable: true,
                maximizable: true,
                closable: true,
                show: false,
                webPreferences: {
                    preload: this.preload,
                    contextIsolation: true,
                    nodeIntegration: false,
                    sandbox: false,
                },
                ...options,
            }

            const window = new BrowserWindow(defaultOptions)
            const windowId = window.id

            // 注册窗口关闭事件
            window.on("closed", () => {
                this.windows.delete(windowId)
                logger.info(`窗口已关闭: ID ${windowId}`)
            })

            // 加载内容
            if (route) {
                if (this.env.VITE_DEV_SERVER_URL) {
                    await window.loadURL(`${this.url}#${route}`)
                } else {
                    await window.loadFile(this.indexHtml, { hash: route })
                }
            } else if (this.env.VITE_DEV_SERVER_URL) {
                await window.loadURL(this.url)
            } else {
                await window.loadFile(this.indexHtml)
            }

            // 显示窗口
            if (options.show !== false) {
                window.show()
            }

            // 居中显示
            if (options.center !== false) {
                window.center()
            }

            this.windows.set(windowId, window)

            logger.info(`新窗口已创建: ID ${windowId}`, {
                bounds: window.getBounds(),
                title: window.getTitle(),
            })

            return { id: windowId, success: true }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error("创建窗口失败", { error: errorMessage })
            return { id: -1, success: false, error: errorMessage }
        }
    }

    /**
     * 关闭窗口
     */
    async handleClose(_event: IpcMainInvokeEvent, windowId: number): Promise<{ success: boolean; error?: string }> {
        try {
            const window = this.windows.get(windowId)
            if (!window || window.isDestroyed()) {
                return { success: false, error: "窗口不存在或已销毁" }
            }

            window.close()
            return { success: true }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error(`关闭窗口失败: ID ${windowId}`, { error: errorMessage })
            return { success: false, error: errorMessage }
        }
    }

    /**
     * 最小化窗口
     */
    async handleMinimize(_event: IpcMainInvokeEvent, windowId: number): Promise<{ success: boolean; error?: string }> {
        try {
            const window = this.windows.get(windowId)
            if (!window || window.isDestroyed()) {
                return { success: false, error: "窗口不存在或已销毁" }
            }

            window.minimize()
            return { success: true }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error(`最小化窗口失败: ID ${windowId}`, { error: errorMessage })
            return { success: false, error: errorMessage }
        }
    }

    /**
     * 最大化窗口
     */
    async handleMaximize(_event: IpcMainInvokeEvent, windowId: number): Promise<{ success: boolean; error?: string }> {
        try {
            const window = this.windows.get(windowId)
            if (!window || window.isDestroyed()) {
                return { success: false, error: "窗口不存在或已销毁" }
            }

            if (window.isMaximized()) {
                window.unmaximize()
            } else {
                window.maximize()
            }
            return { success: true }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error(`最大化窗口失败: ID ${windowId}`, { error: errorMessage })
            return { success: false, error: errorMessage }
        }
    }

    /**
     * 恢复窗口
     */
    async handleRestore(_event: IpcMainInvokeEvent, windowId: number): Promise<{ success: boolean; error?: string }> {
        try {
            const window = this.windows.get(windowId)
            if (!window || window.isDestroyed()) {
                return { success: false, error: "窗口不存在或已销毁" }
            }

            window.restore()
            return { success: true }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error(`恢复窗口失败: ID ${windowId}`, { error: errorMessage })
            return { success: false, error: errorMessage }
        }
    }

    /**
     * 居中窗口
     */
    async handleCenter(_event: IpcMainInvokeEvent, windowId: number): Promise<{ success: boolean; error?: string }> {
        try {
            const window = this.windows.get(windowId)
            if (!window || window.isDestroyed()) {
                return { success: false, error: "窗口不存在或已销毁" }
            }

            window.center()
            return { success: true }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error(`居中窗口失败: ID ${windowId}`, { error: errorMessage })
            return { success: false, error: errorMessage }
        }
    }

    /**
     * 设置窗口边界
     */
    async handleSetBounds(
        _event: IpcMainInvokeEvent,
        windowId: number,
        bounds: Electron.Rectangle
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const window = this.windows.get(windowId)
            if (!window || window.isDestroyed()) {
                return { success: false, error: "窗口不存在或已销毁" }
            }

            window.setBounds(bounds)
            return { success: true }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error(`设置窗口边界失败: ID ${windowId}`, { error: errorMessage })
            return { success: false, error: errorMessage }
        }
    }

    /**
     * 设置窗口标题
     */
    async handleSetTitle(
        _event: IpcMainInvokeEvent,
        windowId: number,
        title: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const window = this.windows.get(windowId)
            if (!window || window.isDestroyed()) {
                return { success: false, error: "窗口不存在或已销毁" }
            }

            window.setTitle(title)
            return { success: true }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error(`设置窗口标题失败: ID ${windowId}`, { error: errorMessage })
            return { success: false, error: errorMessage }
        }
    }

    /**
     * 设置窗口置顶
     */
    async handleSetAlwaysOnTop(
        _event: IpcMainInvokeEvent,
        windowId: number,
        alwaysOnTop: boolean
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const window = this.windows.get(windowId)
            if (!window || window.isDestroyed()) {
                return { success: false, error: "窗口不存在或已销毁" }
            }

            window.setAlwaysOnTop(alwaysOnTop)
            return { success: true }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error(`设置窗口置顶失败: ID ${windowId}`, { error: errorMessage })
            return { success: false, error: errorMessage }
        }
    }

    /**
     * 获取窗口列表
     */
    async handleList(): Promise<WindowInfo[]> {
        const windowList: WindowInfo[] = []

        for (const [id, window] of this.windows) {
            if (!window.isDestroyed()) {
                windowList.push({
                    id,
                    title: window.getTitle(),
                    bounds: window.getBounds(),
                    isVisible: window.isVisible(),
                    isMinimized: window.isMinimized(),
                    isMaximized: window.isMaximized(),
                    isFullScreen: window.isFullScreen(),
                    isAlwaysOnTop: window.isAlwaysOnTop(),
                    url: window.webContents.getURL(),
                })
            }
        }

        return windowList
    }

    /**
     * 获取窗口信息
     */
    async handleGetInfo(_event: IpcMainInvokeEvent, windowId: number): Promise<WindowInfo | null> {
        const window = this.windows.get(windowId)
        if (!window || window.isDestroyed()) {
            return null
        }

        return {
            id: windowId,
            title: window.getTitle(),
            bounds: window.getBounds(),
            isVisible: window.isVisible(),
            isMinimized: window.isMinimized(),
            isMaximized: window.isMaximized(),
            isFullScreen: window.isFullScreen(),
            isAlwaysOnTop: window.isAlwaysOnTop(),
            url: window.webContents.getURL(),
        }
    }

    /**
     * 聚焦窗口
     */
    async handleFocus(_event: IpcMainInvokeEvent, windowId: number): Promise<{ success: boolean; error?: string }> {
        try {
            const window = this.windows.get(windowId)
            if (!window || window.isDestroyed()) {
                return { success: false, error: "窗口不存在或已销毁" }
            }

            window.focus()
            return { success: true }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error(`聚焦窗口失败: ID ${windowId}`, { error: errorMessage })
            return { success: false, error: errorMessage }
        }
    }

    /**
     * 显示窗口
     */
    async handleShow(_event: IpcMainInvokeEvent, windowId: number): Promise<{ success: boolean; error?: string }> {
        try {
            const window = this.windows.get(windowId)
            if (!window || window.isDestroyed()) {
                return { success: false, error: "窗口不存在或已销毁" }
            }

            window.show()
            return { success: true }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error(`显示窗口失败: ID ${windowId}`, { error: errorMessage })
            return { success: false, error: errorMessage }
        }
    }

    /**
     * 隐藏窗口
     */
    async handleHide(_event: IpcMainInvokeEvent, windowId: number): Promise<{ success: boolean; error?: string }> {
        try {
            const window = this.windows.get(windowId)
            if (!window || window.isDestroyed()) {
                return { success: false, error: "窗口不存在或已销毁" }
            }

            window.hide()
            return { success: true }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error(`隐藏窗口失败: ID ${windowId}`, { error: errorMessage })
            return { success: false, error: errorMessage }
        }
    }

    /**
     * 切换全屏模式
     */
    async handleToggleFullscreen(
        _event: IpcMainInvokeEvent,
        windowId: number
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const window = this.windows.get(windowId)
            if (!window || window.isDestroyed()) {
                return { success: false, error: "窗口不存在或已销毁" }
            }

            window.setFullScreen(!window.isFullScreen())
            return { success: true }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.error(`切换全屏模式失败: ID ${windowId}`, { error: errorMessage })
            return { success: false, error: errorMessage }
        }
    }
}
