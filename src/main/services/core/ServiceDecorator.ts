/**
 * Service Decorator and Registry System
 * Provides automatic service registration and IPC binding
 */

import {
  ipcMain,
  IpcMainInvokeEvent,
  IpcMainEvent,
  BrowserWindow,
} from "electron";
import type { Worker as NodeWorker } from "worker_threads";
import { WorkerPool } from "./WorkerPool";
import logger from "../../log/logger";

// IPC channel configuration
export interface IpcChannelConfig {
  channel: string;
  type: "handle" | "on"; // handle for invoke/handle, on for send/on
  methodName?: string; // 自定义方法名，默认从channel自动推导
}

// Service metadata interface
export interface ServiceMetadata {
  name: string;
  version: string;
  ipcChannels: string[] | IpcChannelConfig[]; // 支持简单字符串或详细配置
  description?: string;
  workerScript?: string;
  maxWorkers?: number;
  workerFactory?: () => NodeWorker;
}

/**
 * Base service interface that all services must implement
 * Services receive mainWindow via constructor injection
 */
export interface BaseService {
  /** Initialize the service - called during application startup */
  initialize(): Promise<void>;

  /** Cleanup the service - called during application shutdown */
  cleanup(): Promise<void>;

  /** Return service metadata for registration and IPC binding */
  getMetadata(): ServiceMetadata;

  /** Send loading state notification to renderer */
  sendLoadingState(loading: boolean, message?: string, error?: boolean): void;
}

/**
 * Abstract base service class providing common functionality
 */
export abstract class AbstractBaseService implements BaseService {
  protected mainWindow: BrowserWindow | null = null;

  constructor(mainWindow?: BrowserWindow) {
    this.mainWindow = mainWindow || null;
  }

  /** Set main window reference */
  setMainWindow(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
  }

  /** Send loading state notification to renderer */
  sendLoadingState(loading: boolean, message?: string, error?: boolean): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send("service:loading", {
        service: this.getMetadata().name,
        loading,
        message,
        error,
        timestamp: Date.now(),
      });
    }
  }

  /** Abstract methods to be implemented by concrete services */
  abstract initialize(): Promise<void>;
  abstract cleanup(): Promise<void>;
  abstract getMetadata(): ServiceMetadata;
}

// Service registry
class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services = new Map<string, BaseService>();
  private serviceInstances = new Map<string, unknown>();
  private workerPool: WorkerPool;
  private mainWindow: BrowserWindow | null = null;

  private constructor() {
    this.workerPool = WorkerPool.getInstance();
  }

  static getInstance(): ServiceRegistry {
    if (!this.instance) {
      this.instance = new ServiceRegistry();
    }
    return this.instance;
  }

  /**
   * Register a service class for automatic IPC binding and initialization
   * MainWindow is automatically injected during construction if available
   *
   * @param serviceClass - Service class constructor that accepts optional mainWindow
   */
  register(
    serviceClass: new (mainWindow?: BrowserWindow) => BaseService,
  ): void {
    // Create service instance with mainWindow injection
    const instance = new serviceClass(this.mainWindow || undefined);
    const metadata = instance.getMetadata();

    logger.info(`Registering service: ${metadata.name}`, {
      version: metadata.version,
      channels: metadata.ipcChannels,
      description: metadata.description,
    });

    this.services.set(metadata.name, instance);
    this.serviceInstances.set(metadata.name, instance);

    // Auto-bind IPC handlers
    this.bindIpcHandlers(instance, metadata);

    // Auto-register worker if factory is provided
    if (metadata.workerFactory) {
      this.workerPool.registerWorkerType(
        metadata.name,
        {
          maxWorkers: metadata.maxWorkers || 2,
          idleTimeout: 300000,
          maxRetries: 3,
        },
        metadata.workerFactory,
      );
    }
  }

  private bindIpcHandlers(
    service: BaseService,
    metadata: ServiceMetadata,
  ): void {
    metadata.ipcChannels.forEach((channelConfig: string | IpcChannelConfig) => {
      // Support both string and IpcChannelConfig
      const config: IpcChannelConfig =
        typeof channelConfig === "string"
          ? { channel: channelConfig, type: "handle" }
          : channelConfig;

      const methodName =
        config.methodName || this.channelToMethodName(config.channel);
      const method = (
        service as unknown as Record<string, (...args: unknown[]) => unknown>
      )[methodName];

      if (typeof method === "function") {
        if (config.type === "handle") {
          // Bidirectional communication with invoke/handle
          ipcMain.handle(
            config.channel,
            async (event: IpcMainInvokeEvent, ...args: unknown[]) => {
              try {
                // Ensure Promise is returned for handle pattern
                const result = await method.call(service, event, ...args);
                return result;
              } catch (error) {
                logger.error(
                  `Service ${metadata.name} error on ${config.channel}`,
                  {
                    error:
                      error instanceof Error ? error.message : String(error),
                    args: args.length,
                  },
                );
                throw error;
              }
            },
          );
        } else if (config.type === "on") {
          // Unidirectional communication with send/on
          ipcMain.on(
            config.channel,
            async (event: IpcMainEvent, ...args: unknown[]) => {
              try {
                await method.call(service, event, ...args);
              } catch (error) {
                logger.error(
                  `Service ${metadata.name} error on ${config.channel}`,
                  {
                    error:
                      error instanceof Error ? error.message : String(error),
                    args: args.length,
                  },
                );
                // Send error back to renderer for 'on' pattern
                if (this.mainWindow) {
                  this.mainWindow.webContents.send(`${config.channel}:error`, {
                    error:
                      error instanceof Error ? error.message : String(error),
                  });
                }
              }
            },
          );
        }
      } else {
        logger.warn(
          `Method ${methodName} not found in service ${metadata.name}`,
        );
      }
    });
  }

  private channelToMethodName(channel: string): string {
    // Convert 'file:copy' to 'handleCopy'
    // Convert 'file:batch-copy' to 'handleBatchCopy'
    const parts = channel.split(":");
    if (parts.length < 2) return "handle";

    const operation = parts[1]
      .split("-")
      .map((part, index) =>
        index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
      )
      .join("");

    return `handle${operation.charAt(0).toUpperCase() + operation.slice(1)}`;
  }

  async initializeAll(): Promise<void> {
    logger.info("Initializing all services", { count: this.services.size });

    const initPromises = Array.from(this.services.values()).map(
      async (service) => {
        try {
          await service.initialize();
          logger.info(`Service ${service.getMetadata().name} initialized`);
        } catch (error) {
          logger.error(
            `Failed to initialize service ${service.getMetadata().name}`,
            {
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      },
    );

    await Promise.all(initPromises);
  }

  async cleanupAll(): Promise<void> {
    logger.info("Cleaning up all services");

    const cleanupPromises = Array.from(this.services.values()).map(
      async (service) => {
        try {
          await service.cleanup();
        } catch (error) {
          logger.error(
            `Failed to cleanup service ${service.getMetadata().name}`,
            {
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      },
    );

    await Promise.all(cleanupPromises);
    await this.workerPool.cleanup();
  }

  getService<T extends BaseService>(name: string): T | undefined {
    return this.serviceInstances.get(name) as T;
  }

  getAllServices(): Map<string, BaseService> {
    return new Map(this.services);
  }

  /**
   * Set the main application window for future service registrations
   * Services registered after this call will receive mainWindow via constructor
   *
   * @param window - The main BrowserWindow instance
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
    // New services will automatically receive mainWindow during registration
  }
}

// Service decorator
export function Service(
  metadata: Omit<ServiceMetadata, "ipcChannels"> & { ipcChannels?: string[] },
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function <T extends new (...args: any[]) => any>(constructor: T): T {
    // Enhance the constructor to auto-register
    const EnhancedClass = class extends constructor {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(...args: any[]) {
        super(...args);

        // Auto-detect IPC channels from method names if not provided
        const channels = metadata.ipcChannels || this.autoDetectIpcChannels();

        // Override getMetadata to return the decorator metadata
        this.getMetadata = () => ({
          ...metadata,
          ipcChannels: channels,
        });

        // Auto-register this service
        setTimeout(() => {
          ServiceRegistry.getInstance().register(
            constructor as new () => BaseService,
          );
        }, 0);
      }

      private autoDetectIpcChannels(): string[] {
        const channels: string[] = [];
        const prototype = Object.getPrototypeOf(this);
        const methodNames = Object.getOwnPropertyNames(prototype);

        methodNames.forEach((methodName) => {
          if (
            methodName.startsWith("handle") &&
            methodName !== "handleMessage"
          ) {
            // Convert 'handleCopy' to 'file:copy'
            // Convert 'handleBatchCopy' to 'file:batch-copy'
            const operation = methodName.slice(6); // Remove 'handle'
            const channel = `${metadata.name.toLowerCase()}:${this.camelToKebab(operation)}`;
            channels.push(channel);
          }
        });

        return channels;
      }

      private camelToKebab(str: string): string {
        return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
      }
    };

    return EnhancedClass as T;
  };
}

// Export singleton registry
export const serviceRegistry = ServiceRegistry.getInstance();

// Export types for services to extend
export { ServiceRegistry, WorkerPool };
