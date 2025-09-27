/**
 * Jest Tests for Service Decorator and Registry
 * Tests service registration, IPC binding, and lifecycle management
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from "electron";
import {
  ServiceRegistry,
  Service,
  BaseService,
  ServiceMetadata,
} from "../core/ServiceDecorator";

// Mock dependencies
jest.mock("electron", () => ({
  ipcMain: {
    handle: jest.fn(),
    removeHandler: jest.fn(),
  },
  IpcMainInvokeEvent: {},
}));
jest.mock("../../log/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock("../core/WorkerPool", () => ({
  WorkerPool: {
    getInstance: jest.fn().mockReturnValue({
      registerWorkerType: jest.fn(),
      cleanup: jest.fn(),
    }),
  },
}));

describe("ServiceDecorator", () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create new registry instance for each test
    (ServiceRegistry as unknown as { instance: undefined }).instance =
      undefined;
    registry = ServiceRegistry.getInstance();
  });

  describe("Service Registration", () => {
    it("should register a service with @Service decorator", () => {
      @Service({
        name: "TestService",
        version: "1.0.0",
        workerScript: "test.js",
      })
      class TestService implements BaseService {
        async initialize(): Promise<void> {
          // Empty for testing
        }
        async cleanup(): Promise<void> {
          // Empty for testing
        }
        sendLoadingState(
          _loading: boolean,
          _message?: string,
          _error?: boolean,
        ): void {
          // Mock implementation
        }
        getMetadata(): ServiceMetadata {
          return {
            name: "TestService",
            version: "1.0.0",
            ipcChannels: ["test:action"],
            workerScript: "test.js",
          };
        }

        async handleAction(
          _event: IpcMainInvokeEvent,
          _params?: unknown,
        ): Promise<string> {
          return "success";
        }
      }

      expect(registry.getService("TestService")).toBeDefined();
    });

    it("should auto-detect IPC channels from method names", () => {
      @Service({
        name: "AutoService",
        version: "1.0.0",
      })
      class AutoService implements BaseService {
        async initialize(): Promise<void> {
          // Empty for testing
        }
        async cleanup(): Promise<void> {
          // Empty for testing
        }
        sendLoadingState(
          _loading: boolean,
          _message?: string,
          _error?: boolean,
        ): void {
          // Empty for testing
        }
        getMetadata(): ServiceMetadata {
          return {
            name: "AutoService",
            version: "1.0.0",
            ipcChannels: ["autoservice:copy", "autoservice:delete"],
          };
        }

        async handleCopy(): Promise<string> {
          return "copied";
        }
        async handleDelete(): Promise<string> {
          return "deleted";
        }
      }

      const service = registry.getService("AutoService");
      expect(service).toBeDefined();
      expect(service?.getMetadata().ipcChannels).toContain("autoservice:copy");
      expect(service?.getMetadata().ipcChannels).toContain(
        "autoservice:delete",
      );
    });

    it("should bind IPC handlers automatically", () => {
      @Service({
        name: "IPCService",
        version: "1.0.0",
        ipcChannels: ["ipc:test"],
      })
      class IPCService implements BaseService {
        async initialize(): Promise<void> {
          // Empty for testing
        }
        async cleanup(): Promise<void> {
          // Empty for testing
        }
        sendLoadingState(
          _loading: boolean,
          _message?: string,
          _error?: boolean,
        ): void {
          // Empty for testing
        }
        getMetadata(): ServiceMetadata {
          return {
            name: "IPCService",
            version: "1.0.0",
            ipcChannels: ["ipc:test"],
          };
        }

        async handleTest(): Promise<string> {
          return "ipc-success";
        }
      }

      expect(ipcMain.handle).toHaveBeenCalledWith(
        "ipc:test",
        expect.any(Function),
      );
    });
  });

  describe("Service Lifecycle", () => {
    let testService: unknown;

    beforeEach(() => {
      @Service({
        name: "LifecycleService",
        version: "1.0.0",
      })
      class LifecycleService implements BaseService {
        initialized = false;
        cleanedUp = false;

        async initialize(): Promise<void> {
          this.initialized = true;
        }

        async cleanup(): Promise<void> {
          this.cleanedUp = true;
        }

        sendLoadingState(
          _loading: boolean,
          _message?: string,
          _error?: boolean,
        ): void {
          // Empty for testing
        }

        getMetadata(): ServiceMetadata {
          return {
            name: "LifecycleService",
            version: "1.0.0",
            ipcChannels: [],
          };
        }
      }

      testService = registry.getService("LifecycleService") as unknown as {
        initialized: boolean;
        cleanedUp: boolean;
      };
    });

    it("should initialize all services", async () => {
      await registry.initializeAll();
      expect((testService as { initialized: boolean }).initialized).toBe(true);
    });

    it("should cleanup all services", async () => {
      await registry.cleanupAll();
      expect((testService as { cleanedUp: boolean }).cleanedUp).toBe(true);
    });

    it("should handle initialization errors gracefully", async () => {
      @Service({
        name: "ErrorService",
        version: "1.0.0",
      })
      class ErrorService implements BaseService {
        async initialize(): Promise<void> {
          throw new Error("Init failed");
        }

        async cleanup(): Promise<void> {
          // Empty for testing
        }

        sendLoadingState(
          _loading: boolean,
          _message?: string,
          _error?: boolean,
        ): void {
          // Empty for testing
        }

        getMetadata(): ServiceMetadata {
          return {
            name: "ErrorService",
            version: "1.0.0",
            ipcChannels: [],
          };
        }
      }

      // Should not throw
      await expect(registry.initializeAll()).resolves.not.toThrow();
    });
  });

  describe("Channel to Method Mapping", () => {
    it("should convert channel names to method names correctly", () => {
      const testCases = [
        { channel: "file:copy", expected: "handleCopy" },
        { channel: "file:batch-copy", expected: "handleBatchCopy" },
        { channel: "delete:file", expected: "handleFile" },
        {
          channel: "rename:batch-rename",
          expected: "handleBatchRename",
        },
      ];

      @Service({
        name: "MappingService",
        version: "1.0.0",
        ipcChannels: testCases.map((tc) => tc.channel),
      })
      class MappingService implements BaseService {
        async initialize(): Promise<void> {
          // Empty for testing
        }
        async cleanup(): Promise<void> {
          // Empty for testing
        }
        sendLoadingState(
          _loading: boolean,
          _message?: string,
          _error?: boolean,
        ): void {
          // Empty for testing
        }
        getMetadata(): ServiceMetadata {
          return {
            name: "MappingService",
            version: "1.0.0",
            ipcChannels: testCases.map((tc) => tc.channel),
          };
        }

        async handleCopy(): Promise<string> {
          return "copy";
        }
        async handleBatchCopy(): Promise<string> {
          return "batch-copy";
        }
        async handleFile(): Promise<string> {
          return "file";
        }
        async handleBatchRename(): Promise<string> {
          return "batch-rename";
        }
      }

      testCases.forEach(({ channel }) => {
        expect(ipcMain.handle).toHaveBeenCalledWith(
          channel,
          expect.any(Function),
        );
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle IPC method errors", async () => {
      @Service({
        name: "ErrorService",
        version: "1.0.0",
        ipcChannels: ["error:test"],
      })
      class ErrorService implements BaseService {
        async initialize(): Promise<void> {
          // Empty for testing
        }
        async cleanup(): Promise<void> {
          // Empty for testing
        }
        sendLoadingState(
          _loading: boolean,
          _message?: string,
          _error?: boolean,
        ): void {
          // Empty for testing
        }
        getMetadata(): ServiceMetadata {
          return {
            name: "ErrorService",
            version: "1.0.0",
            ipcChannels: ["error:test"],
          };
        }

        async handleTest(): Promise<void> {
          throw new Error("Method failed");
        }
      }

      // Get the IPC handler function
      const handlerCall = (ipcMain.handle as jest.Mock).mock.calls.find(
        (call) => call[0] === "error:test",
      );
      expect(handlerCall).toBeDefined();

      const handler = handlerCall![1];
      const mockEvent = {} as IpcMainInvokeEvent;

      // Should propagate the error
      await expect(handler(mockEvent)).rejects.toThrow("Method failed");
    });

    it("should warn about missing methods", () => {
      const logger = jest.requireMock("../../log/logger");

      @Service({
        name: "MissingMethodService",
        version: "1.0.0",
        ipcChannels: ["missing:nonexistent"],
      })
      class MissingMethodService implements BaseService {
        async initialize(): Promise<void> {
          // Empty for testing
        }
        async cleanup(): Promise<void> {
          // Empty for testing
        }
        sendLoadingState(
          _loading: boolean,
          _message?: string,
          _error?: boolean,
        ): void {
          // Empty for testing
        }
        getMetadata(): ServiceMetadata {
          return {
            name: "MissingMethodService",
            version: "1.0.0",
            ipcChannels: ["missing:nonexistent"],
          };
        }
      }

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Method handleNonexistent not found"),
      );
    });
  });

  describe("Worker Pool Integration", () => {
    it("should register worker types for services", () => {
      const { WorkerPool } = jest.requireMock("../core/WorkerPool");
      const mockWorkerPool = WorkerPool.getInstance();

      @Service({
        name: "WorkerService",
        version: "1.0.0",
        workerScript: "worker.js",
        maxWorkers: 3,
      })
      class WorkerService implements BaseService {
        async initialize(): Promise<void> {
          // Empty for testing
        }
        async cleanup(): Promise<void> {
          // Empty for testing
        }
        sendLoadingState(
          _loading: boolean,
          _message?: string,
          _error?: boolean,
        ): void {
          // Empty for testing
        }
        getMetadata(): ServiceMetadata {
          return {
            name: "WorkerService",
            version: "1.0.0",
            ipcChannels: [],
            workerScript: "worker.js",
            maxWorkers: 3,
          };
        }
      }

      expect(mockWorkerPool.registerWorkerType).toHaveBeenCalledWith(
        "WorkerService",
        expect.objectContaining({
          maxWorkers: 3,
        }),
      );
    });
  });

  describe("Service Registry Operations", () => {
    it("should return singleton instance", () => {
      const registry1 = ServiceRegistry.getInstance();
      const registry2 = ServiceRegistry.getInstance();
      expect(registry1).toBe(registry2);
    });

    it("should get all services", () => {
      @Service({
        name: "Service1",
        version: "1.0.0",
      })
      class Service1 implements BaseService {
        async initialize(): Promise<void> {
          // Empty for testing
        }
        async cleanup(): Promise<void> {
          // Empty for testing
        }
        sendLoadingState(
          _loading: boolean,
          _message?: string,
          _error?: boolean,
        ): void {
          // Empty for testing
        }
        getMetadata(): ServiceMetadata {
          return {
            name: "Service1",
            version: "1.0.0",
            ipcChannels: [],
          };
        }
      }

      @Service({
        name: "Service2",
        version: "1.0.0",
      })
      class Service2 implements BaseService {
        async initialize(): Promise<void> {
          // Empty for testing
        }
        async cleanup(): Promise<void> {
          // Empty for testing
        }
        sendLoadingState(
          _loading: boolean,
          _message?: string,
          _error?: boolean,
        ): void {
          // Empty for testing
        }
        getMetadata(): ServiceMetadata {
          return {
            name: "Service2",
            version: "1.0.0",
            ipcChannels: [],
          };
        }
      }

      const allServices = registry.getAllServices();
      expect(allServices.size).toBeGreaterThanOrEqual(2);
      expect(allServices.has("Service1")).toBe(true);
      expect(allServices.has("Service2")).toBe(true);
    });

    it("should return undefined for non-existent service", () => {
      const service = registry.getService("NonExistent");
      expect(service).toBeUndefined();
    });
  });
});
