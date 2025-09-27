/**
 * Copy Service Implementation
 * Handles single file and batch copy operations with progress tracking
 */

import { IpcMainInvokeEvent, IpcMainEvent, BrowserWindow } from "electron";
import {
  Service,
  ServiceMetadata,
  AbstractBaseService,
} from "./core/ServiceDecorator";
import { WorkerPool, WorkerProgress } from "./core/WorkerPool";
import { ServiceIdentifiers } from "@common/constants/ServiceIdentifiers";
import logger from "@main/log/logger";
import createWorker from "./workers/copy-worker?nodeWorker";

interface CopyParams {
  source: string;
  destination: string;
}

interface BatchCopyParams {
  sources: string[];
  destination: string;
}

interface CancelParams {
  taskId: string;
}

@Service({
  name: "CopyService",
  version: "1.0.0",
  description: "Handles file copy operations with progress tracking",
  maxWorkers: 3,
  workerFactory: createWorker,
})
/**
 * File Copy Service Implementation
 * Handles single file and batch copy operations with progress tracking
 * Supports mainWindow injection for direct renderer communication
 */
export default class CopyService extends AbstractBaseService {
  private workerPool: WorkerPool;

  /**
   * Constructor with optional mainWindow injection
   * MainWindow enables direct communication with renderer for progress updates
   *
   * @param mainWindow - Optional BrowserWindow for direct renderer communication
   */
  constructor(mainWindow?: BrowserWindow) {
    super(mainWindow);
    this.workerPool = WorkerPool.getInstance();
  }

  async initialize(): Promise<void> {
    logger.info("CopyService initialized with worker pool");
  }

  async cleanup(): Promise<void> {
    logger.info("CopyService cleaning up");
  }

  getMetadata(): ServiceMetadata {
    return {
      name: "CopyService",
      version: "1.0.0",
      ipcChannels: [
        { channel: "copy:file", type: "handle" },
        { channel: "copy:batch", type: "handle" },
        { channel: "copy:cancel", type: "handle" },
        { channel: "copy:status", type: "on" },
      ],
      description: "Handles file copy operations with progress tracking",
    };
  }

  /**
   * Handle single file copy operation
   *
   * @param _event - IPC event (unused in this implementation)
   * @param params - Request parameters containing source and destination paths
   */
  async handleFile(
    _event: IpcMainInvokeEvent,
    params: CopyParams,
  ): Promise<unknown> {
    this.validateCopyParams(params);

    // Setup progress callback for real-time updates
    // Uses mainWindow for direct renderer communication
    const progressCallback = (progress: WorkerProgress): void => {
      // Send progress updates directly to renderer via mainWindow
      // This ensures consistent communication channel regardless of IPC event source
      if (this.mainWindow) {
        this.mainWindow.webContents.send("copy:progress", {
          ...progress,
          operation: "file", // Override operation type for UI differentiation
        });
      }
    };

    // Ensure Promise is returned for handle pattern
    const result = await this.workerPool.execute(
      ServiceIdentifiers.COPY_SERVICE,
      "copy-file",
      params,
      progressCallback,
    );
    return result;
  }

  /**
   * Handle batch copy operation
   *
   * @param _event - IPC event (unused in this implementation)
   * @param params - Request parameters containing source and destination paths
   */
  async handleBatch(
    _event: IpcMainInvokeEvent,
    params: BatchCopyParams,
  ): Promise<unknown> {
    this.validateBatchParams(params);

    // Setup progress callback for batch operation tracking
    const progressCallback = (progress: WorkerProgress): void => {
      // Send batch progress updates directly to renderer
      // MainWindow provides reliable communication channel
      if (this.mainWindow) {
        this.mainWindow.webContents.send("copy:progress", {
          ...progress,
          operation: "batch", // Mark as batch operation for UI handling
        });
      }
    };

    // Ensure Promise is returned for handle pattern
    const result = await this.workerPool.execute(
      "CopyService",
      "copy-batch",
      params,
      progressCallback,
    );
    return result;
  }

  /**
   * Handle cancel operation
   *
   * @param _event - IPC event (unused in this implementation)
   * @param params - Request parameters containing taskId
   */
  async handleCancel(
    _event: IpcMainInvokeEvent,
    params: CancelParams,
  ): Promise<unknown> {
    const result = await this.workerPool.execute(
      "CopyService",
      "cancel-copy",
      params,
    );
    return result;
  }

  /**
   * Handle status requests using IPC 'on' pattern (unidirectional)
   * Demonstrates mainWindow usage for response communication
   * No return value expected - response sent via mainWindow
   *
   * @param _event - IPC event (unused in this implementation)
   * @param params - Request parameters containing requestId
   */
  async handleStatus(
    _event: IpcMainEvent,
    params: { requestId: string },
  ): Promise<void> {
    try {
      // Process status request and prepare response
      const status = { requestId: params.requestId, active: true };

      // Send response directly via mainWindow instead of event.reply
      // This ensures consistent communication channel
      if (this.mainWindow) {
        this.mainWindow.webContents.send("copy:status:response", status);
      }
    } catch (error) {
      logger.error("Status check failed", { error });
    }
  }

  /**
   * Validate copy parameters
   *
   * @param params - Request parameters containing source and destination paths
   */
  private validateCopyParams(params: CopyParams): void {
    if (
      !params.source ||
      !params.destination ||
      typeof params.source !== "string" ||
      typeof params.destination !== "string"
    ) {
      throw new Error("Invalid copy parameters");
    }
  }

  /**
   * Validate batch copy parameters
   *
   * @param params - Request parameters containing source and destination paths
   */
  private validateBatchParams(params: BatchCopyParams): void {
    if (
      !Array.isArray(params.sources) ||
      params.sources.length === 0 ||
      !params.destination ||
      typeof params.destination !== "string"
    ) {
      throw new Error("Invalid batch copy parameters");
    }
  }
}
