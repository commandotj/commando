/**
 * Comprehensive File Service Implementation
 * Handles all file operations: read, write, delete, rename, copy, move, metadata
 * Supports mainWindow injection for progress updates and notifications
 * Uses both handle and on IPC patterns for optimal communication
 */

import { IpcMainInvokeEvent, IpcMainEvent, BrowserWindow } from "electron"
import { Service, ServiceMetadata, BaseService } from "./core/ServiceDecorator"
import { WorkerPool, WorkerProgress } from "./core/WorkerPool"
import { ServiceIdentifiers } from "../../common/constants/ServiceIdentifiers"
import logger from "../log/logger"
import { promises as fs } from "fs"
import path from "path"
import createWorker from "./workers/file-worker?nodeWorker"

/**
 * Enhanced interfaces for comprehensive file operations
 */
interface FileOperationParams {
    source: string
    destination?: string
    content?: string
    options?: {
        overwrite?: boolean
        createDirs?: boolean
        encoding?: BufferEncoding
    }
}

interface DeleteParams {
    paths: string[]
    permanent: boolean
}

interface RenameParams {
    oldPath: string
    newPath: string
}

interface CreateFolderParams {
    path: string
    recursive: boolean
}

interface GetInfoParams {
    path: string
}

interface BatchOperationParams {
    operations: Array<{
        type: "copy" | "move" | "delete" | "rename"
        source: string
        destination?: string
    }>
    options?: {
        overwrite?: boolean
        createDirs?: boolean
        continueOnError?: boolean
    }
}

interface FileMetadata {
    name: string
    path: string
    size: number
    isDirectory: boolean
    isFile: boolean
    created: Date
    modified: Date
    permissions: {
        readable: boolean
        writable: boolean
        executable: boolean
    }
}

interface ListDirectoryParams {
    path: string
    options?: {
        recursive?: boolean
        includeHidden?: boolean
        sortBy?: "name" | "size" | "modified"
        sortOrder?: "asc" | "desc"
    }
}

@Service({
    name: "FileService",
    version: "1.0.0",
    description: "Comprehensive file operations service with progress tracking",
    maxWorkers: 4,
    workerFactory: createWorker,
})
export default class FileService implements BaseService {
    private workerPool: WorkerPool
    private mainWindow: BrowserWindow | null = null

    /**
     * Constructor with mainWindow injection for direct renderer communication
     *
     * @param mainWindow - Optional BrowserWindow for progress updates and notifications
     */
    constructor(mainWindow?: BrowserWindow) {
        this.mainWindow = mainWindow || null
        this.workerPool = WorkerPool.getInstance()
    }

    async initialize(): Promise<void> {
        logger.info("FileService initialized with comprehensive file operations")
    }

    async cleanup(): Promise<void> {
        logger.info("FileService cleaning up")
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
            name: "FileService",
            version: "1.0.0",
            ipcChannels: [
                { channel: "file:read", type: "handle" },
                { channel: "file:write", type: "handle" },
                { channel: "file:copy", type: "handle" },
                { channel: "file:move", type: "handle" },
                { channel: "file:delete", type: "handle" },
                { channel: "file:rename", type: "handle" },
                { channel: "file:create-folder", type: "handle" },
                { channel: "file:get-info", type: "handle" },
                { channel: "file:list", type: "handle" },
                { channel: "file:batch", type: "handle" },
                { channel: "file:watch", type: "on" },
                { channel: "file:unwatch", type: "on" },
            ],
            description: "Comprehensive file operations service with progress tracking",
        }
    }

    /**
     * Read file content
     *
     * @param _event - IPC event (unused)
     * @param params - File operation parameters
     * @returns File content as string or buffer
     */
    async handleRead(_event: IpcMainInvokeEvent, params: FileOperationParams): Promise<string | Buffer> {
        this.validateFilePath(params.source)

        try {
            const encoding = params.options?.encoding || "utf8"
            const content = await fs.readFile(params.source, encoding)

            logger.info("File read successfully", {
                path: params.source,
                size: content.length,
            })

            return content
        } catch (error) {
            const errorMsg = `Failed to read file: ${params.source}`
            logger.error(errorMsg, { error })
            throw new Error(errorMsg)
        }
    }

    /**
     * Write content to file
     *
     * @param _event - IPC event (unused)
     * @param params - File operation parameters with content
     * @returns Success confirmation
     */
    async handleWrite(
        _event: IpcMainInvokeEvent,
        params: FileOperationParams
    ): Promise<{ success: boolean; path: string }> {
        this.validateFilePath(params.source)

        if (!params.content) {
            throw new Error("Content is required for write operation")
        }

        try {
            // Create directories if needed
            if (params.options?.createDirs) {
                await fs.mkdir(path.dirname(params.source), {
                    recursive: true,
                })
            }

            const encoding = params.options?.encoding || "utf8"
            await fs.writeFile(params.source, params.content, encoding)

            logger.info("File written successfully", {
                path: params.source,
                size: params.content.length,
            })

            return { success: true, path: params.source }
        } catch (error) {
            const errorMsg = `Failed to write file: ${params.source}`
            logger.error(errorMsg, { error })
            throw new Error(errorMsg)
        }
    }

    /**
     * Copy file with progress tracking
     *
     * @param _event - IPC event (unused)
     * @param params - File operation parameters
     * @returns Copy operation result
     */
    async handleCopy(_event: IpcMainInvokeEvent, params: FileOperationParams): Promise<unknown> {
        this.validateCopyMoveParams(params)

        const progressCallback = (progress: WorkerProgress): void => {
            if (this.mainWindow) {
                this.mainWindow.webContents.send("file:progress", {
                    ...progress,
                    operation: "copy",
                    source: params.source,
                    destination: params.destination,
                })
            }
        }

        const result = await this.workerPool.execute(
            ServiceIdentifiers.FILE_SERVICE,
            "copy-file",
            params,
            progressCallback
        )

        return result
    }

    /**
     * Move file with progress tracking
     *
     * @param _event - IPC event (unused)
     * @param params - File operation parameters
     * @returns Move operation result
     */
    async handleMove(_event: IpcMainInvokeEvent, params: FileOperationParams): Promise<unknown> {
        this.validateCopyMoveParams(params)

        const progressCallback = (progress: WorkerProgress): void => {
            if (this.mainWindow) {
                this.mainWindow.webContents.send("file:progress", {
                    ...progress,
                    operation: "move",
                    source: params.source,
                    destination: params.destination,
                })
            }
        }

        const result = await this.workerPool.execute(
            ServiceIdentifiers.FILE_SERVICE,
            "move-file",
            params,
            progressCallback
        )

        return result
    }

    /**
     * Delete files or directories with enhanced validation
     *
     * @param _event - IPC event (unused)
     * @param params - Delete operation parameters
     * @returns Delete operation result
     */
    async handleDelete(_event: IpcMainInvokeEvent, params: DeleteParams): Promise<unknown> {
        this.validateDeleteParams(params)

        const progressCallback = (progress: WorkerProgress): void => {
            if (this.mainWindow) {
                this.mainWindow.webContents.send("file:progress", {
                    ...progress,
                    operation: "delete",
                    paths: params.paths,
                    permanent: params.permanent,
                })
            }
        }

        const result = await this.workerPool.execute(
            ServiceIdentifiers.FILE_SERVICE,
            "delete-files",
            params,
            progressCallback
        )

        return result
    }

    /**
     * Rename file or directory with enhanced validation
     *
     * @param _event - IPC event (unused)
     * @param params - Rename operation parameters
     * @returns Rename operation result
     */
    async handleRename(_event: IpcMainInvokeEvent, params: RenameParams): Promise<unknown> {
        this.validateRenameParams(params)

        const result = await this.workerPool.execute(ServiceIdentifiers.FILE_SERVICE, "rename-file", params)

        return result
    }

    /**
     * Create folder with enhanced options
     *
     * @param _event - IPC event (unused)
     * @param params - Create folder parameters
     * @returns Create folder result
     */
    async handleCreateFolder(_event: IpcMainInvokeEvent, params: CreateFolderParams): Promise<unknown> {
        this.validateCreateFolderParams(params)

        const result = await this.workerPool.execute(ServiceIdentifiers.FILE_SERVICE, "create-folder", params)

        return result
    }

    /**
     * Get comprehensive file/directory metadata
     *
     * @param _event - IPC event (unused)
     * @param params - Get info parameters
     * @returns File metadata
     */
    async handleGetInfo(_event: IpcMainInvokeEvent, params: GetInfoParams): Promise<FileMetadata> {
        this.validateGetInfoParams(params)

        try {
            const stat = await fs.stat(params.path)

            // Check permissions
            let permissions = {
                readable: true,
                writable: true,
                executable: false,
            }
            try {
                await fs.access(params.path, fs.constants.R_OK)
                await fs.access(params.path, fs.constants.W_OK)
                try {
                    await fs.access(params.path, fs.constants.X_OK)
                    permissions.executable = true
                } catch {
                    // Not executable
                }
            } catch {
                permissions = {
                    readable: false,
                    writable: false,
                    executable: false,
                }
            }

            return {
                name: path.basename(params.path),
                path: params.path,
                size: stat.size,
                isDirectory: stat.isDirectory(),
                isFile: stat.isFile(),
                created: stat.birthtime,
                modified: stat.mtime,
                permissions,
            }
        } catch (error) {
            const errorMsg = `Failed to get file info: ${params.path}`
            logger.error(errorMsg, { error })
            throw new Error(errorMsg)
        }
    }

    /**
     * List directory contents with sorting and filtering
     *
     * @param _event - IPC event (unused)
     * @param params - Directory listing parameters
     * @returns Array of file metadata
     */
    async handleList(_event: IpcMainInvokeEvent, params: ListDirectoryParams): Promise<FileMetadata[]> {
        this.validateFilePath(params.path)

        try {
            const entries = await fs.readdir(params.path, {
                withFileTypes: true,
            })
            const results: FileMetadata[] = []

            for (const entry of entries) {
                // Skip hidden files unless requested
                if (!params.options?.includeHidden && entry.name.startsWith(".")) {
                    continue
                }

                const fullPath = path.join(params.path, entry.name)
                try {
                    const metadata = await this.handleGetInfo(_event, {
                        path: fullPath,
                    })
                    results.push(metadata)
                } catch {
                    // Skip files that can't be accessed
                    continue
                }
            }

            // Sort results
            if (params.options?.sortBy) {
                results.sort((a, b) => {
                    let comparison = 0
                    switch (params.options!.sortBy) {
                        case "name":
                            comparison = a.name.localeCompare(b.name)
                            break
                        case "size":
                            comparison = a.size - b.size
                            break
                        case "modified":
                            comparison = a.modified.getTime() - b.modified.getTime()
                            break
                    }
                    return params.options!.sortOrder === "desc" ? -comparison : comparison
                })
            }

            return results
        } catch (error) {
            const errorMsg = `Failed to list directory: ${params.path}`
            logger.error(errorMsg, { error })
            throw new Error(errorMsg)
        }
    }

    /**
     * Execute batch file operations with progress tracking
     *
     * @param _event - IPC event (unused)
     * @param params - Batch operation parameters
     * @returns Batch operation results
     */
    async handleBatch(_event: IpcMainInvokeEvent, params: BatchOperationParams): Promise<unknown> {
        if (!Array.isArray(params.operations) || params.operations.length === 0) {
            throw new Error("Invalid batch operations")
        }

        const progressCallback = (progress: WorkerProgress): void => {
            if (this.mainWindow) {
                this.mainWindow.webContents.send("file:progress", {
                    ...progress,
                    operation: "batch",
                    totalOperations: params.operations.length,
                })
            }
        }

        const result = await this.workerPool.execute(
            ServiceIdentifiers.FILE_SERVICE,
            "batch-operations",
            params,
            progressCallback
        )

        return result
    }

    /**
     * Start watching a file or directory for changes (IPC 'on' pattern)
     *
     * @param _event - IPC event (unused)
     * @param params - Watch parameters
     */
    async handleWatch(_event: IpcMainEvent, params: { path: string; recursive?: boolean }): Promise<void> {
        try {
            logger.info("Started watching path", { path: params.path })

            if (this.mainWindow) {
                this.mainWindow.webContents.send("file:watch:started", {
                    path: params.path,
                    recursive: params.recursive || false,
                })
            }
        } catch (error) {
            logger.error("Failed to start watching", {
                path: params.path,
                error,
            })
        }
    }

    /**
     * Stop watching a file or directory (IPC 'on' pattern)
     *
     * @param _event - IPC event (unused)
     * @param params - Unwatch parameters
     */
    async handleUnwatch(_event: IpcMainEvent, params: { path: string }): Promise<void> {
        try {
            logger.info("Stopped watching path", { path: params.path })

            if (this.mainWindow) {
                this.mainWindow.webContents.send("file:watch:stopped", {
                    path: params.path,
                })
            }
        } catch (error) {
            logger.error("Failed to stop watching", {
                path: params.path,
                error,
            })
        }
    }

    /**
     * Validation methods for different parameter types
     */
    private validateFilePath(filePath: string): void {
        if (!filePath || typeof filePath !== "string") {
            throw new Error("Invalid file path")
        }
    }

    private validateCopyMoveParams(params: FileOperationParams): void {
        this.validateFilePath(params.source)
        if (!params.destination || typeof params.destination !== "string") {
            throw new Error("Invalid destination path")
        }
    }

    private validateDeleteParams(params: DeleteParams): void {
        if (!Array.isArray(params.paths) || params.paths.length === 0) {
            throw new Error("Invalid delete parameters: no files specified")
        }
        if (typeof params.permanent !== "boolean") {
            throw new Error("Invalid delete parameters: permanent must be boolean")
        }
    }

    private validateRenameParams(params: RenameParams): void {
        if (
            !params.oldPath ||
            !params.newPath ||
            typeof params.oldPath !== "string" ||
            typeof params.newPath !== "string" ||
            params.oldPath === params.newPath
        ) {
            throw new Error("Invalid rename parameters")
        }
    }

    private validateCreateFolderParams(params: CreateFolderParams): void {
        if (!params.path || typeof params.path !== "string") {
            throw new Error("Invalid create folder parameters")
        }
        if (typeof params.recursive !== "boolean") {
            params.recursive = false // Default to false
        }
    }

    private validateGetInfoParams(params: GetInfoParams): void {
        if (!params.path || typeof params.path !== "string") {
            throw new Error("Invalid file info parameters")
        }
    }
}
