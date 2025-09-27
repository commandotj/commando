/**
 * Directory Service Implementation
 * 专门处理目录浏览、导航和相关操作的服务
 * 支持mainWindow注入用于实时更新和通知
 */

import { IpcMainInvokeEvent, IpcMainEvent, BrowserWindow } from "electron";
import {
  Service,
  ServiceMetadata,
  AbstractBaseService,
} from "./core/ServiceDecorator";
import logger from "@main/log/logger";
import { promises as fs } from "fs";
import path from "path";

import type {
  DirectoryEntry,
  ListDirectoryOptions,
} from "@common/types/DirectoryTypes";

/**
 * 目录列表请求参数
 */
interface ListDirectoryParams {
  path: string;
  options?: ListDirectoryOptions;
}

/**
 * 目录导航参数
 */
interface NavigateParams {
  path: string;
  addToHistory?: boolean;
}

/**
 * 目录监控参数
 */
interface WatchDirectoryParams {
  path: string;
  recursive?: boolean;
}

@Service({
  name: "DirectoryService",
  version: "1.0.0",
  description: "专门处理目录浏览、导航和监控的服务",
})
export default class DirectoryService extends AbstractBaseService {
  private currentPath: string = process.cwd();
  private navigationHistory: string[] = [];
  private watchedDirectories: Set<string> = new Set();

  /**
   * 构造函数支持mainWindow注入
   *
   * @param mainWindow - 可选的主窗口引用，用于发送实时更新
   */
  constructor(mainWindow?: BrowserWindow) {
    super(mainWindow);
  }

  async initialize(): Promise<void> {
    logger.info("DirectoryService initialized - 目录服务已初始化");
  }

  async cleanup(): Promise<void> {
    // 清理所有监控的目录
    this.watchedDirectories.clear();
    logger.info("DirectoryService cleaned up - 目录服务已清理");
  }

  getMetadata(): ServiceMetadata {
    return {
      name: "DirectoryService",
      version: "1.0.0",
      ipcChannels: [
        { channel: "directory:list", type: "handle" },
        { channel: "directory:navigate", type: "handle" },
        { channel: "directory:current", type: "handle" },
        { channel: "directory:parent", type: "handle" },
        { channel: "directory:history", type: "handle" },
        { channel: "directory:refresh", type: "handle" },
        { channel: "directory:watch", type: "on" },
        { channel: "directory:unwatch", type: "on" },
      ],
      description: "专门处理目录浏览、导航和监控的服务",
    };
  }

  /**
   * 列出目录内容 - 主要功能，替代原有的listDir
   *
   * @param _event - IPC事件
   * @param params - 目录列表参数
   * @returns 目录条目数组
   */
  async handleList(
    _event: IpcMainInvokeEvent,
    params: ListDirectoryParams,
  ): Promise<DirectoryEntry[]> {
    try {
      this.validateDirectoryPath(params.path);

      logger.info("开始列出目录内容", {
        path: params.path,
        options: params.options,
      });

      // 使用异步版本替代同步版本，提供更好的性能
      const entries = await fs.readdir(params.path, {
        withFileTypes: true,
      });
      const results: DirectoryEntry[] = [];

      for (const entry of entries) {
        const fullPath = path.join(params.path, entry.name);

        // 跳过隐藏文件（除非明确请求）
        if (!params.options?.includeHidden && entry.name.startsWith(".")) {
          continue;
        }

        try {
          const stat = await fs.stat(fullPath);
          let permissions:
            | {
                readable: boolean;
                writable: boolean;
                executable: boolean;
              }
            | undefined;

          // 获取权限信息（如果请求）
          if (params.options?.includePermissions) {
            permissions = await this.getFilePermissions(fullPath);
          }

          const directoryEntry: DirectoryEntry = {
            name: entry.name,
            isDirectory: entry.isDirectory(),
            size: entry.isDirectory() ? undefined : stat.size,
            mtime: stat.mtimeMs,
            isHidden: entry.name.startsWith("."),
            permissions,
            extension: entry.isDirectory()
              ? undefined
              : path.extname(entry.name).toLowerCase(),
          };

          results.push(directoryEntry);
        } catch (error) {
          // 跳过无法访问的文件，但记录警告
          logger.warn("无法访问文件", {
            path: fullPath,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // 排序处理
      if (params.options?.sortBy) {
        this.sortDirectoryEntries(
          results,
          params.options.sortBy,
          params.options.sortOrder,
        );
      }

      // 更新当前路径
      this.currentPath = params.path;

      // 发送目录变化通知
      if (this.mainWindow) {
        this.mainWindow.webContents.send("directory:changed", {
          path: params.path,
          entryCount: results.length,
        });
      }

      logger.info("目录列表获取成功", {
        path: params.path,
        entryCount: results.length,
      });

      return results;
    } catch (error) {
      const errorMsg = `获取目录列表失败: ${params.path}`;
      logger.error(errorMsg, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(errorMsg);
    }
  }

  /**
   * 导航到指定目录
   *
   * @param _event - IPC事件
   * @param params - 导航参数
   * @returns 导航结果
   */
  async handleNavigate(
    _event: IpcMainInvokeEvent,
    params: NavigateParams,
  ): Promise<{ success: boolean; path: string; entries: DirectoryEntry[] }> {
    try {
      this.validateDirectoryPath(params.path);

      // 添加到导航历史
      if (params.addToHistory !== false && this.currentPath !== params.path) {
        this.navigationHistory.push(this.currentPath);
        // 限制历史记录长度
        if (this.navigationHistory.length > 50) {
          this.navigationHistory.shift();
        }
      }

      // 获取目录内容
      const entries = await this.handleList(_event, {
        path: params.path,
      });

      logger.info("目录导航成功", {
        from: this.currentPath,
        to: params.path,
      });

      return {
        success: true,
        path: params.path,
        entries,
      };
    } catch (error) {
      const errorMsg = `目录导航失败: ${params.path}`;
      logger.error(errorMsg, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(errorMsg);
    }
  }

  /**
   * 获取当前目录
   *
   * @returns 当前目录路径和内容
   */
  async handleCurrent(
    event: IpcMainInvokeEvent,
  ): Promise<{ path: string; entries: DirectoryEntry[] }> {
    try {
      const entries = await this.handleList(event, {
        path: this.currentPath,
      });
      return {
        path: this.currentPath,
        entries,
      };
    } catch (error) {
      logger.error("获取当前目录失败", {
        currentPath: this.currentPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 导航到父目录
   *
   * @param _event - IPC事件
   * @returns 父目录信息
   */
  async handleParent(
    _event: IpcMainInvokeEvent,
  ): Promise<{ success: boolean; path: string; entries: DirectoryEntry[] }> {
    const parentPath = path.dirname(this.currentPath);

    // 防止超出根目录
    if (parentPath === this.currentPath) {
      return {
        success: false,
        path: this.currentPath,
        entries: await this.handleList(_event, {
          path: this.currentPath,
        }),
      };
    }

    return await this.handleNavigate(_event, { path: parentPath });
  }

  /**
   * 获取导航历史
   *
   * @param _event - IPC事件
   * @returns 导航历史数组
   */
  async handleHistory(): Promise<string[]> {
    return [...this.navigationHistory];
  }

  /**
   * 刷新当前目录
   *
   * @param _event - IPC事件
   * @returns 刷新后的目录内容
   */
  async handleRefresh(_event: IpcMainInvokeEvent): Promise<DirectoryEntry[]> {
    logger.info("刷新目录", { path: this.currentPath });
    return await this.handleList(_event, { path: this.currentPath });
  }

  /**
   * 监控目录变化
   *
   * @param _event - IPC事件
   * @param params - 监控参数
   */
  async handleWatch(
    _event: IpcMainEvent,
    params: WatchDirectoryParams,
  ): Promise<void> {
    try {
      this.validateDirectoryPath(params.path);

      if (!this.watchedDirectories.has(params.path)) {
        this.watchedDirectories.add(params.path);

        // 这里可以集成 fs.watch 或 chokidar 进行实际的文件监控
        logger.info("开始监控目录", {
          path: params.path,
          recursive: params.recursive,
        });

        if (this.mainWindow) {
          this.mainWindow.webContents.send("directory:watch:started", {
            path: params.path,
            recursive: params.recursive || false,
          });
        }
      }
    } catch (error) {
      logger.error("目录监控启动失败", {
        path: params.path,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 停止监控目录
   *
   * @param _event - IPC事件
   * @param params - 停止监控参数
   */
  async handleUnwatch(
    _event: IpcMainEvent,
    params: { path: string },
  ): Promise<void> {
    try {
      if (this.watchedDirectories.has(params.path)) {
        this.watchedDirectories.delete(params.path);

        logger.info("停止监控目录", { path: params.path });

        if (this.mainWindow) {
          this.mainWindow.webContents.send("directory:watch:stopped", {
            path: params.path,
          });
        }
      }
    } catch (error) {
      logger.error("停止目录监控失败", {
        path: params.path,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 验证目录路径
   *
   * @param dirPath - 要验证的目录路径
   */
  private validateDirectoryPath(dirPath: string): void {
    if (!dirPath || typeof dirPath !== "string") {
      throw new Error("无效的目录路径");
    }
  }

  /**
   * 获取文件权限信息
   *
   * @param filePath - 文件路径
   * @returns 权限对象
   */
  private async getFilePermissions(filePath: string): Promise<{
    readable: boolean;
    writable: boolean;
    executable: boolean;
  }> {
    try {
      await fs.access(filePath, fs.constants.R_OK);
      const readable = true;

      let writable = false;
      try {
        await fs.access(filePath, fs.constants.W_OK);
        writable = true;
      } catch {
        // 不可写
      }

      let executable = false;
      try {
        await fs.access(filePath, fs.constants.X_OK);
        executable = true;
      } catch {
        // 不可执行
      }

      return { readable, writable, executable };
    } catch {
      return { readable: false, writable: false, executable: false };
    }
  }

  /**
   * 排序目录条目
   *
   * @param entries - 目录条目数组
   * @param sortBy - 排序字段
   * @param sortOrder - 排序顺序
   */
  private sortDirectoryEntries(
    entries: DirectoryEntry[],
    sortBy: "name" | "size" | "mtime" | "type",
    sortOrder: "asc" | "desc" = "asc",
  ): void {
    entries.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "size": {
          const sizeA = a.size || 0;
          const sizeB = b.size || 0;
          comparison = sizeA - sizeB;
          break;
        }
        case "mtime": {
          const mtimeA = a.mtime || 0;
          const mtimeB = b.mtime || 0;
          comparison = mtimeA - mtimeB;
          break;
        }
        case "type": {
          // 目录优先，然后按扩展名排序
          if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
          }
          const extA = a.extension || "";
          const extB = b.extension || "";
          comparison = extA.localeCompare(extB);
          break;
        }
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });
  }
}
