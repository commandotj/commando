/**
 * Drive Service Implementation
 * 专门处理磁盘驱动器检测、监控和相关操作的服务
 * 支持mainWindow注入用于实时更新和通知
 */

import { IpcMainInvokeEvent, IpcMainEvent, BrowserWindow } from "electron"
import { Service, ServiceMetadata, BaseService } from "./core/ServiceDecorator"
import logger from "@main/log/logger"
import * as si from "systeminformation"
import type { Systeminformation } from "systeminformation"
import type { DriveInfo, DriveListOptions, DriveDetails } from "@common/types/DriveTypes"
// 驱动器服务消息常量
const DRIVE_MESSAGES = {
    SCANNING: "正在扫描驱动器...",
    REFRESHING: "正在刷新磁盘列表...",
} as const

/**
 * 磁盘列表请求参数
 */
interface ListDrivesParams {
    options?: DriveListOptions
}

/**
 * 磁盘详情请求参数
 */
interface DriveDetailsParams {
    device: string
}

/**
 * 磁盘监控参数
 */
interface WatchDrivesParams {
    interval?: number // 监控间隔（毫秒）
}

@Service({
    name: "DriveService",
    version: "1.0.0",
    description: "专门处理磁盘驱动器检测、监控和管理的服务",
})
export default class DriveService implements BaseService {
    private driveCache: DriveInfo[] = []
    private watchInterval: NodeJS.Timeout | null = null
    private lastUpdateTime: number = 0
    private mainWindow: BrowserWindow | null = null

    /**
     * 构造函数支持mainWindow注入
     *
     * @param mainWindow - 可选的主窗口引用，用于发送实时更新
     */
    constructor(mainWindow?: BrowserWindow) {
        this.mainWindow = mainWindow || null
    }

    async initialize(): Promise<void> {
        logger.info("DriveService initialized - 磁盘服务已初始化")
        // 初始化时获取一次磁盘列表
        await this.refreshDriveCache()
    }

    async cleanup(): Promise<void> {
        // 清理监控定时器
        if (this.watchInterval) {
            clearInterval(this.watchInterval)
            this.watchInterval = null
        }
        logger.info("DriveService cleaned up - 磁盘服务已清理")
    }

    /**
     * Set main window reference for direct renderer communication
     *
     * @param mainWindow - The main BrowserWindow instance
     */
    setMainWindow(mainWindow: BrowserWindow): void {
        this.mainWindow = mainWindow
    }

    /**
     * Send loading state notification to renderer
     *
     * @param loading - Loading state boolean
     * @param message - Optional message to display
     * @param error - Optional error state boolean
     */
    sendLoadingState(loading: boolean, message?: string, error?: boolean): void {
        if (this.mainWindow) {
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
            name: "DriveService",
            version: "1.0.0",
            ipcChannels: [
                { channel: "drive:list", type: "handle" },
                { channel: "drive:details", type: "handle" },
                { channel: "drive:refresh", type: "handle" },
                { channel: "drive:watch", type: "on" },
                { channel: "drive:unwatch", type: "on" },
            ],
            description: "专门处理磁盘驱动器检测、监控和管理的服务",
        }
    }

    /**
     * 获取磁盘驱动器列表 - 主要功能，替代原有的listDrives
     *
     * @param _event - IPC事件
     * @param params - 磁盘列表参数
     * @returns 磁盘信息数组
     */
    async handleList(_event: IpcMainInvokeEvent, params: ListDrivesParams = {}): Promise<DriveInfo[]> {
        try {
            logger.info("开始获取磁盘列表", { options: params.options })

            // 使用缓存数据（如果足够新鲜）
            const cacheAge = Date.now() - this.lastUpdateTime
            if (cacheAge < 5000 && this.driveCache.length > 0) {
                // 5秒内使用缓存
                logger.debug("使用磁盘缓存数据", {
                    cacheAge,
                    count: this.driveCache.length,
                })
                return this.filterAndSortDrives(this.driveCache, params.options)
            }

            // 发送加载开始通知
            this.sendLoadingState(true, DRIVE_MESSAGES.SCANNING)

            // 刷新缓存
            await this.refreshDriveCache()

            // 应用过滤和排序
            const result = this.filterAndSortDrives(this.driveCache, params.options)

            // 发送加载完成和磁盘列表变化通知
            this.sendLoadingState(false)
            if (this.mainWindow) {
                this.mainWindow.webContents.send("drive:list:changed", {
                    drives: result,
                    timestamp: Date.now(),
                })
            }

            logger.info("磁盘列表获取成功", {
                totalCount: this.driveCache.length,
                filteredCount: result.length,
            })

            return result
        } catch (error) {
            // 发送加载错误通知
            this.sendLoadingState(false, error instanceof Error ? error.message : "获取磁盘列表失败", true)

            const errorMsg = "获取磁盘列表失败"
            logger.error(errorMsg, {
                error: error instanceof Error ? error.message : String(error),
            })
            throw new Error(errorMsg)
        }
    }

    /**
     * 获取指定磁盘的详细信息
     *
     * @param _event - IPC事件
     * @param params - 磁盘详情参数
     * @returns 磁盘详细信息
     */
    async handleDetails(_event: IpcMainInvokeEvent, params: DriveDetailsParams): Promise<DriveDetails | null> {
        try {
            this.validateDevice(params.device)

            logger.info("获取磁盘详情", { device: params.device })

            // 先获取基础信息
            const basicInfo = this.driveCache.find(drive => drive.device === params.device)
            if (!basicInfo) {
                // 如果缓存中没有，尝试刷新后再查找
                await this.refreshDriveCache()
                const refreshedInfo = this.driveCache.find(drive => drive.device === params.device)
                if (!refreshedInfo) {
                    logger.warn("未找到指定磁盘", { device: params.device })
                    return null
                }
                return this.enrichDriveDetails(refreshedInfo)
            }

            return this.enrichDriveDetails(basicInfo)
        } catch (error) {
            const errorMsg = `获取磁盘详情失败: ${params.device}`
            logger.error(errorMsg, {
                error: error instanceof Error ? error.message : String(error),
            })
            throw new Error(errorMsg)
        }
    }

    /**
     * 手动刷新磁盘列表
     *
     * @param _event - IPC事件
     * @returns 刷新后的磁盘列表
     */
    async handleRefresh(): Promise<DriveInfo[]> {
        try {
            logger.info("手动刷新磁盘列表")

            // 发送加载开始通知
            this.sendLoadingState(true, DRIVE_MESSAGES.REFRESHING)

            await this.refreshDriveCache()

            // 发送加载完成通知
            this.sendLoadingState(false)
            if (this.mainWindow) {
                this.mainWindow.webContents.send("drive:refreshed", {
                    drives: this.driveCache,
                    timestamp: Date.now(),
                })
            }

            return [...this.driveCache]
        } catch (error) {
            // 发送加载错误通知
            this.sendLoadingState(false, error instanceof Error ? error.message : "刷新磁盘列表失败", true)

            logger.error("刷新磁盘列表失败", {
                error: error instanceof Error ? error.message : String(error),
            })
            throw error
        }
    }

    /**
     * 开始监控磁盘变化
     *
     * @param _event - IPC事件
     * @param params - 监控参数
     */
    async handleWatch(_event: IpcMainEvent, params: WatchDrivesParams = {}): Promise<void> {
        try {
            const interval = params.interval || 10000 // 默认10秒

            // 清理现有监控
            if (this.watchInterval) {
                clearInterval(this.watchInterval)
            }

            logger.info("开始监控磁盘变化", { interval })

            this.watchInterval = setInterval(async () => {
                try {
                    const oldDrives = [...this.driveCache]
                    await this.refreshDriveCache()

                    // 检查是否有变化
                    if (this.hasDriverChanges(oldDrives, this.driveCache)) {
                        logger.info("检测到磁盘变化", {
                            oldCount: oldDrives.length,
                            newCount: this.driveCache.length,
                        })

                        if (this.mainWindow) {
                            this.mainWindow.webContents.send("drive:changed", {
                                drives: this.driveCache,
                                timestamp: Date.now(),
                            })
                        }
                    }
                } catch (error) {
                    logger.error("磁盘监控检查失败", {
                        error: error instanceof Error ? error.message : String(error),
                    })
                }
            }, interval)

            if (this.mainWindow) {
                this.mainWindow.webContents.send("drive:watch:started", {
                    interval,
                })
            }
        } catch (error) {
            logger.error("磁盘监控启动失败", {
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    /**
     * 停止监控磁盘变化
     *
     * @param _event - IPC事件
     */
    async handleUnwatch(): Promise<void> {
        try {
            if (this.watchInterval) {
                clearInterval(this.watchInterval)
                this.watchInterval = null

                logger.info("停止磁盘监控")

                if (this.mainWindow) {
                    this.mainWindow.webContents.send("drive:watch:stopped", {
                        timestamp: Date.now(),
                    })
                }
            }
        } catch (error) {
            logger.error("停止磁盘监控失败", {
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    /**
     * 刷新磁盘缓存
     */
    private async refreshDriveCache(): Promise<void> {
        try {
            const startTime = Date.now()

            // 使用systeminformation获取文件系统和磁盘布局信息
            const [fsSize, diskLayout, blockDevices] = await Promise.all([
                si.fsSize(),
                si.diskLayout(),
                si.blockDevices(),
            ])

            const fetchTime = Date.now() - startTime

            // 先记录原始数据用于调试
            logger.debug("systeminformation原始数据", {
                fetchTime: `${fetchTime}ms`,
                fsSize: JSON.stringify(fsSize, null, 2),
                diskLayout: JSON.stringify(diskLayout, null, 2),
            })

            // 转换systeminformation数据格式为DriveInfo
            this.driveCache = fsSize
                .filter((fs: Systeminformation.FsSizeData) => {
                    // 过滤掉系统内部挂载点，只保留用户可访问的驱动器
                    return (
                        fs.mount &&
                        fs.size > 0 &&
                        !fs.mount.startsWith("/System/") &&
                        !fs.mount.startsWith("/private/") &&
                        fs.mount !== "/dev"
                    )
                })
                .map((fs: Systeminformation.FsSizeData) => {
                    // 从设备名提取磁盘号（如从/dev/disk5s1提取disk5）
                    const deviceMatch = fs.fs.match(/\/dev\/(disk\d+)/)
                    const diskId = deviceMatch ? deviceMatch[1] : ""

                    // 找到对应的物理磁盘信息
                    const physicalDisk = diskLayout.find(
                        (disk: Systeminformation.DiskLayoutData) => disk.device === diskId
                    )

                    // 找到对应的块设备信息
                    const blockDevice = blockDevices.find(
                        (device: Systeminformation.BlockDevicesData) => device.name === fs.fs
                    )

                    // 判断是否为可移动设备
                    const isRemovable =
                        physicalDisk?.interfaceType === "USB" ||
                        blockDevice?.removable === true ||
                        blockDevice?.protocol === "USB"

                    // 构建描述信息
                    let description = "Unknown Drive"
                    if (physicalDisk?.vendor && physicalDisk?.name) {
                        description = `${physicalDisk.vendor} ${physicalDisk.name}`
                    } else if (physicalDisk?.name) {
                        description = physicalDisk.name
                    } else if (blockDevice?.model) {
                        description = blockDevice.model
                    } else if (blockDevice?.label) {
                        description = blockDevice.label
                    }

                    return {
                        device: fs.fs,
                        description: description.trim(),
                        size: fs.size,
                        mountpoints: [{ path: fs.mount }],
                        isSystem: fs.mount === "/" || fs.mount === "C:\\",
                        isRemovable: isRemovable,
                        isReady: true,
                        fileSystem: fs.type || "unknown",
                        label: blockDevice?.label || physicalDisk?.name || "",
                        busType: physicalDisk?.interfaceType || "unknown",
                        used: fs.used,
                        available: fs.available,
                        usePercent: fs.use,
                    }
                })

            this.lastUpdateTime = Date.now()
            logger.debug("磁盘缓存已刷新", {
                count: this.driveCache.length,
                drives: this.driveCache,
            })
        } catch (error) {
            logger.error("刷新磁盘缓存失败", {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            })
            // 保持现有缓存，不清空
        }
    }

    /**
     * 过滤和排序磁盘列表
     */
    private filterAndSortDrives(drives: DriveInfo[], options?: DriveListOptions): DriveInfo[] {
        let filtered = [...drives]

        // 应用过滤器
        if (options?.includeRemovable === false) {
            filtered = filtered.filter(drive => !drive.isRemovable)
        }

        if (options?.includeSystem === false) {
            filtered = filtered.filter(drive => !drive.isSystem)
        }

        // 应用排序
        if (options?.sortBy) {
            filtered.sort((a, b) => {
                let comparison = 0
                switch (options.sortBy) {
                    case "device":
                        comparison = a.device.localeCompare(b.device)
                        break
                    case "size":
                        comparison = a.size - b.size
                        break
                    case "description":
                        comparison = a.description.localeCompare(b.description)
                        break
                }
                return options.sortOrder === "desc" ? -comparison : comparison
            })
        }

        return filtered
    }

    /**
     * 增强磁盘详细信息
     */
    private async enrichDriveDetails(basicInfo: DriveInfo): Promise<DriveDetails> {
        // 这里可以添加更多详细信息的获取逻辑
        // 例如使用 fs.statfs 获取磁盘使用情况
        const details: DriveDetails = {
            ...basicInfo,
            partitions: basicInfo.mountpoints.map(mp => ({
                device: basicInfo.device,
                mountpoint: mp.path,
                fileSystem: basicInfo.fileSystem || "unknown",
                size: basicInfo.size,
                // TODO: 获取实际使用情况
                used: undefined,
                available: undefined,
            })),
            health: {
                status: "healthy", // TODO: 实际健康检查
            },
        }

        return details
    }

    /**
     * 检查磁盘列表是否有变化
     */
    private hasDriverChanges(oldDrives: DriveInfo[], newDrives: DriveInfo[]): boolean {
        if (oldDrives.length !== newDrives.length) {
            return true
        }

        const oldDevices = new Set(oldDrives.map(d => d.device))
        const newDevices = new Set(newDrives.map(d => d.device))

        // 检查设备是否有增减
        for (const device of Array.from(newDevices)) {
            if (!oldDevices.has(device)) {
                return true
            }
        }

        for (const device of Array.from(oldDevices)) {
            if (!newDevices.has(device)) {
                return true
            }
        }

        return false
    }

    /**
     * 验证设备标识符
     */
    private validateDevice(device: string): void {
        if (!device || typeof device !== "string") {
            throw new Error("无效的设备标识符")
        }
    }
}
