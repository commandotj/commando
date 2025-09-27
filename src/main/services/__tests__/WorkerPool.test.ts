/**
 * Jest Tests for Worker Pool Management
 * Tests worker lifecycle, load balancing, and communication protocol
 */

import { Worker } from "worker_threads";

// Use fake timers to avoid test timeouts
beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});
import WorkerPool, {
  WorkerMessage,
  WorkerRequest,
  WorkerResponse,
} from "../core/WorkerPool";

// Mock dependencies
jest.mock("worker_threads");
jest.mock("../../log/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock("uuid", () => ({
  v4: jest.fn().mockReturnValue("mock-uuid-123"),
}));

const MockWorker = Worker as jest.MockedClass<typeof Worker>;

describe("WorkerPool", () => {
  let workerPool: WorkerPool;
  let mockWorkerInstance: jest.Mocked<Worker>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton
    (WorkerPool as unknown as { instance: undefined }).instance = undefined;
    workerPool = WorkerPool.getInstance();

    // Create mock worker instance
    mockWorkerInstance = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    } as unknown as jest.Mocked<Worker>;

    MockWorker.mockImplementation(() => mockWorkerInstance);
  });

  describe("Worker Pool Singleton", () => {
    it("should return the same instance", () => {
      const pool1 = WorkerPool.getInstance();
      const pool2 = WorkerPool.getInstance();
      expect(pool1).toBe(pool2);
    });
  });

  describe("Worker Type Registration", () => {
    it("should register a new worker type", () => {
      const config = {
        script: "testWorker.js",
        maxWorkers: 2,
        idleTimeout: 60000,
        maxRetries: 3,
      };

      const mockWorkerFactory = jest.fn(
        () => new Worker("test") as jest.Mocked<Worker>,
      );
      workerPool.registerWorkerType("TestWorker", config, mockWorkerFactory);

      // Should not throw and should log registration
      const logger = jest.mocked(jest.requireMock("../../log/logger"));
      expect(logger.info).toHaveBeenCalledWith(
        "Registered worker type: TestWorker",
        expect.objectContaining({
          maxWorkers: 2,
        }),
      );
    });

    it("should set default values for optional config", () => {
      const config = {
        script: "simpleWorker.js",
        maxWorkers: 1,
      };

      const mockFactory = jest.fn(
        () => new Worker("test") as jest.Mocked<Worker>,
      );
      workerPool.registerWorkerType("SimpleWorker", config, mockFactory);

      // Should set defaults without throwing
      expect(() => {
        const mockFactory2 = jest.fn(
          () => new Worker("test") as jest.Mocked<Worker>,
        );
        workerPool.registerWorkerType("SimpleWorker", config, mockFactory2);
      }).not.toThrow();
    });
  });

  describe("Worker Execution", () => {
    beforeEach(() => {
      const execFactory = jest.fn(
        () => new Worker("test") as jest.Mocked<Worker>,
      );
      workerPool.registerWorkerType(
        "ExecutionWorker",
        {
          maxWorkers: 2,
          maxRetries: 2,
        },
        execFactory,
      );
    });

    it("should execute operation successfully", async () => {
      // Mock successful worker response
      const mockResponse: WorkerResponse = {
        id: "mock-uuid-123",
        type: "response",
        operation: "test-operation",
        payload: "success",
        timestamp: Date.now(),
      };

      // Setup worker message handling
      let messageHandler: (message: WorkerMessage) => void;
      mockWorkerInstance.on.mockImplementation(
        (event: string | symbol, handler: (...args: unknown[]) => void) => {
          if (event === "message") {
            messageHandler = handler;
          }
          return mockWorkerInstance;
        },
      );

      // Execute and immediately respond
      const executePromise = workerPool.execute(
        "ExecutionWorker",
        "test-operation",
        { data: "test" },
      );

      // Trigger the response
      setTimeout(() => messageHandler(mockResponse), 0);

      const result = await executePromise;
      expect(result).toBe("success");
    });

    it("should handle worker progress messages", async () => {
      const progressCallback = jest.fn();
      let messageHandler: (message: WorkerMessage) => void;

      mockWorkerInstance.on.mockImplementation(
        (event: string | symbol, handler: (...args: unknown[]) => void) => {
          if (event === "message") {
            messageHandler = handler;
          }
          return mockWorkerInstance;
        },
      );

      // Start execution
      const executePromise = workerPool.execute(
        "ExecutionWorker",
        "progress-operation",
        { data: "test" },
        progressCallback,
      );

      // Send progress message
      const progressMessage = {
        id: "mock-uuid-123",
        type: "progress" as const,
        operation: "progress-operation",
        progress: 50,
        currentItem: "file1.txt",
        timestamp: Date.now(),
      };

      setTimeout(() => {
        messageHandler(progressMessage);

        // Then send completion
        messageHandler({
          id: "mock-uuid-123",
          type: "response" as const,
          operation: "progress-operation",
          payload: "completed",
          timestamp: Date.now(),
        });
      }, 0);

      await executePromise;
      expect(progressCallback).toHaveBeenCalledWith(progressMessage);
    });

    it("should handle worker errors", async () => {
      let messageHandler: (message: WorkerMessage) => void;

      mockWorkerInstance.on.mockImplementation(
        (event: string | symbol, handler: (...args: unknown[]) => void) => {
          if (event === "message") {
            messageHandler = handler;
          }
          return mockWorkerInstance;
        },
      );

      const executePromise = workerPool.execute(
        "ExecutionWorker",
        "error-operation",
        { data: "test" },
      );

      // Send error message
      setTimeout(() => {
        messageHandler({
          id: "mock-uuid-123",
          type: "error",
          operation: "error-operation",
          error: "Operation failed",
          timestamp: Date.now(),
        });
      }, 0);

      await expect(executePromise).rejects.toThrow("Operation failed");
    });

    it("should retry failed operations", async () => {
      const logger = jest.requireMock("../../log/logger");
      let callCount = 0;

      // Mock worker that fails twice then succeeds
      MockWorker.mockImplementation(() => {
        callCount++;
        const worker = {
          postMessage: jest.fn(),
          terminate: jest.fn(),
          on: jest
            .fn()
            .mockImplementation((event: string, handler: unknown) => {
              if (event === "message") {
                setTimeout(() => {
                  if (callCount <= 2) {
                    (handler as (data: unknown) => void)({
                      id: "mock-uuid-123",
                      type: "error",
                      operation: "retry-operation",
                      error: "Temporary failure",
                      timestamp: Date.now(),
                    });
                  } else {
                    (handler as (data: unknown) => void)({
                      id: "mock-uuid-123",
                      type: "response",
                      operation: "retry-operation",
                      payload: "success after retry",
                      timestamp: Date.now(),
                    });
                  }
                }, 0);
              }
              return worker;
            }),
        } as unknown as jest.Mocked<Worker>;
        return worker;
      });

      const result = await workerPool.execute(
        "ExecutionWorker",
        "retry-operation",
        { data: "test" },
      );

      expect(result).toBe("success after retry");
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Retrying operation retry-operation"),
      );
    });

    it("should fail after max retries", async () => {
      // Mock worker that always fails
      mockWorkerInstance.on.mockImplementation(
        (event: string | symbol, handler: (...args: unknown[]) => void) => {
          if (event === "message") {
            setTimeout(() => {
              handler({
                id: "mock-uuid-123",
                type: "error",
                operation: "fail-operation",
                error: "Persistent failure",
                timestamp: Date.now(),
              });
            }, 0);
          }
          return mockWorkerInstance;
        },
      );

      await expect(
        workerPool.execute("ExecutionWorker", "fail-operation", {
          data: "test",
        }),
      ).rejects.toThrow("Persistent failure");
    });

    it("should throw error for unregistered worker type", async () => {
      await expect(
        workerPool.execute("UnregisteredWorker", "test", {}),
      ).rejects.toThrow("Worker type UnregisteredWorker not registered");
    });
  });

  describe("Worker Pool Management", () => {
    beforeEach(() => {
      const poolFactory = jest.fn(
        () => new Worker("test") as jest.Mocked<Worker>,
      );
      workerPool.registerWorkerType(
        "PoolWorker",
        {
          maxWorkers: 2,
        },
        poolFactory,
      );
    });

    it("should create workers up to max limit", async () => {
      // Mock worker instances that respond immediately
      mockWorkerInstance.on.mockImplementation(
        (event: string | symbol, handler: (...args: unknown[]) => void) => {
          if (event === "message") {
            setTimeout(() => {
              handler({
                id: "mock-uuid-123",
                type: "response",
                operation: "concurrent-op",
                payload: "success",
                timestamp: Date.now(),
              });
            }, 10);
          }
          return mockWorkerInstance;
        },
      );

      // Start multiple concurrent operations
      const promises = [
        workerPool.execute("PoolWorker", "concurrent-op", { id: 1 }),
        workerPool.execute("PoolWorker", "concurrent-op", { id: 2 }),
        workerPool.execute("PoolWorker", "concurrent-op", { id: 3 }),
      ];

      await Promise.all(promises);

      // Should have created workers (max 2 for this type)
      expect(MockWorker).toHaveBeenCalledTimes(2);
    });

    it("should provide pool statistics", () => {
      const stats = workerPool.getPoolStats();
      expect(stats).toBeInstanceOf(Object);

      // Should have registered worker types
      expect(stats["PoolWorker"]).toBeDefined();
    });
  });

  describe("Worker Cleanup", () => {
    beforeEach(() => {
      const cleanupFactory = jest.fn(
        () => new Worker("test") as jest.Mocked<Worker>,
      );
      workerPool.registerWorkerType(
        "CleanupWorker",
        {
          maxWorkers: 1,
        },
        cleanupFactory,
      );
    });

    it("should cleanup all workers", async () => {
      // Create a worker first
      mockWorkerInstance.on.mockImplementation(
        (event: string | symbol, handler: (...args: unknown[]) => void) => {
          if (event === "message") {
            setTimeout(() => {
              handler({
                id: "mock-uuid-123",
                type: "response",
                operation: "test",
                payload: "success",
                timestamp: Date.now(),
              });
            }, 0);
          }
          return mockWorkerInstance;
        },
      );

      await workerPool.execute("CleanupWorker", "test", {});
      await workerPool.cleanup();

      expect(mockWorkerInstance.terminate).toHaveBeenCalled();
    });

    it("should start idle worker cleanup", () => {
      jest.useFakeTimers();

      workerPool.startIdleWorkerCleanup();

      // Should set up interval
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 60000);

      jest.useRealTimers();
    });
  });

  describe("Worker Communication Protocol", () => {
    it("should send properly formatted request messages", async () => {
      mockWorkerInstance.on.mockImplementation(
        (event: string | symbol, handler: (...args: unknown[]) => void) => {
          if (event === "message") {
            // Verify the message format
            setTimeout(() => {
              const sentMessage = mockWorkerInstance.postMessage.mock
                .calls[0][0] as WorkerRequest;
              expect(sentMessage).toMatchObject({
                id: expect.any(String),
                type: "request",
                operation: "protocol-test",
                payload: { data: "test" },
                timestamp: expect.any(Number),
              });

              handler({
                id: sentMessage.id,
                type: "response",
                operation: "protocol-test",
                payload: "protocol-success",
                timestamp: Date.now(),
              });
            }, 0);
          }
          return mockWorkerInstance;
        },
      );

      const result = await workerPool.execute(
        "ExecutionWorker",
        "protocol-test",
        { data: "test" },
      );

      expect(result).toBe("protocol-success");
      expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "request",
          operation: "protocol-test",
        }),
      );
    });

    it("should handle unknown message IDs gracefully", () => {
      const logger = jest.requireMock("../../log/logger");

      // Register the worker type first
      workerPool.registerWorkerType(
        "ExecutionWorker",
        { maxWorkers: 1, idleTimeout: 5000 },
        () => mockWorkerInstance,
      );

      mockWorkerInstance.on.mockImplementation(
        (event: string | symbol, handler: (...args: unknown[]) => void) => {
          if (event === "message") {
            // Send message with unknown ID
            setTimeout(() => {
              handler({
                id: "unknown-id",
                type: "response",
                operation: "unknown",
                payload: "should-be-ignored",
                timestamp: Date.now(),
              });
            }, 0);
          }
          return mockWorkerInstance;
        },
      );

      // Start and immediately try to send unknown message
      workerPool.execute("ExecutionWorker", "test", {});

      // Should log warning about unknown request
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "Received message for unknown request unknown-id",
        ),
      );
    });
  });
});
