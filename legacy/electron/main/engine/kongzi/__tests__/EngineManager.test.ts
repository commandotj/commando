/**
 * KongziEngineManager 单元测试
 *
 * 测试孔子引擎管理器的功能
 */

import { EngineManager } from "../EngineManager";
import { IpcMainInvokeEvent } from "electron";

// Mock dependencies
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
};

const mockEvent = {
    sender: {
        send: jest.fn(),
    },
} as unknown as IpcMainInvokeEvent;

// Mock Composer
const mockComposer = {
    assembleEngines: jest.fn().mockResolvedValue(undefined),
    configureEngineCommunication: jest.fn().mockResolvedValue(undefined),
    getEngine: jest.fn(),
    getAllEngines: jest.fn().mockReturnValue([]),
};

// Mock LubanEngine
const mockLubanEngine = {
    name: "LubanEngine",
    version: "1.0.0",
    capabilities: ["file_operation"],
    initialize: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn().mockResolvedValue(undefined),
    executeTask: jest.fn().mockResolvedValue(undefined),
    getStatus: jest.fn().mockReturnValue({ status: "ready" }),
};

describe("EngineManager", () => {
    let kongziManager: EngineManager;

    beforeEach(() => {
        kongziManager = new EngineManager({
            logger: mockLogger,
        });
        jest.clearAllMocks();
    });

    describe("initialize", () => {
        it("应该初始化孔子引擎管理器", async () => {
            // Mock composer
            (kongziManager as any).composer = mockComposer;
            (kongziManager as any).composer.getEngine = jest
                .fn()
                .mockReturnValue(mockLubanEngine);

            await kongziManager.initialize();

            expect(mockComposer.assembleEngines).toHaveBeenCalled();
            expect(
                mockComposer.configureEngineCommunication
            ).toHaveBeenCalled();
            expect(mockLubanEngine.initialize).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(
                "孔子引擎管理器初始化完成"
            );
        });
    });

    describe("批量复制功能", () => {
        beforeEach(async () => {
            // Mock composer and engine
            (kongziManager as any).composer = mockComposer;
            (kongziManager as any).composer.getEngine = jest
                .fn()
                .mockReturnValue(mockLubanEngine);
            await kongziManager.initialize();
        });

        it("应该通过IPC处理批量复制请求", async () => {
            // 测试通过IPC调用的方式
            const params = {
                sources: ["/source/file1.txt", "/source/file2.txt"],
                destination: "/destination/",
            };

            // 模拟IPC调用
            const result = await (kongziManager as any).handleBatchCopyRequest(
                mockEvent,
                params
            );

            expect(result).toBeDefined();
            expect(result.taskId).toBeDefined();
            expect(result.status).toBe("pending");
            expect(mockLubanEngine.executeTask).toHaveBeenCalled();
        });
    });

    describe("用户确认功能", () => {
        beforeEach(async () => {
            // Mock composer and engine
            (kongziManager as any).composer = mockComposer;
            (kongziManager as any).composer.getEngine = jest
                .fn()
                .mockReturnValue(mockLubanEngine);
            await kongziManager.initialize();
        });

        it("应该处理用户重试确认", async () => {
            const params = {
                taskId: "test-task-123",
                action: "retry",
            };

            const result = await (kongziManager as any).handleUserConfirmation(
                params
            );

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it("应该处理用户跳过确认", async () => {
            const params = {
                taskId: "test-task-123",
                action: "skip",
            };

            const result = await (kongziManager as any).handleUserConfirmation(
                params
            );

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it("应该处理用户取消确认", async () => {
            const params = {
                taskId: "test-task-123",
                action: "cancel",
            };

            const result = await (kongziManager as any).handleUserConfirmation(
                params
            );

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it("应该处理用户覆盖确认", async () => {
            const params = {
                taskId: "test-task-123",
                action: "overwrite",
            };

            const result = await (kongziManager as any).handleUserConfirmation(
                params
            );

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it("应该处理用户重命名确认", async () => {
            const params = {
                taskId: "test-task-123",
                action: "rename",
                newName: "new-file.txt",
            };

            const result = await (kongziManager as any).handleUserConfirmation(
                params
            );

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });
    });

    describe("cleanup", () => {
        it("应该清理所有引擎", async () => {
            // Mock composer and engines
            (kongziManager as any).composer = mockComposer;
            (kongziManager as any).composer.getAllEngines = jest
                .fn()
                .mockReturnValue([mockLubanEngine]);
            await kongziManager.initialize();

            await kongziManager.cleanup();

            expect(mockLubanEngine.cleanup).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(
                "孔子引擎管理器清理完成"
            );
        });
    });

    describe("错误处理", () => {
        it("应该处理引擎执行错误", async () => {
            const error = new Error("Engine execution failed");
            mockLubanEngine.executeTask = jest.fn().mockRejectedValue(error);

            (kongziManager as any).composer = mockComposer;
            (kongziManager as any).composer.getEngine = jest
                .fn()
                .mockReturnValue(mockLubanEngine);
            await kongziManager.initialize();

            const params = {
                sources: ["/source/file.txt"],
                destination: "/destination/",
            };

            await expect(
                (kongziManager as any).handleBatchCopyRequest(mockEvent, params)
            ).rejects.toThrow("Engine execution failed");
        });

        it("应该处理无效的引擎选择", async () => {
            (kongziManager as any).composer = mockComposer;
            (kongziManager as any).composer.getEngine = jest
                .fn()
                .mockReturnValue(null);
            await kongziManager.initialize();

            const params = {
                sources: ["/source/file.txt"],
                destination: "/destination/",
            };

            await expect(
                (kongziManager as any).handleBatchCopyRequest(mockEvent, params)
            ).rejects.toThrow("未找到合适的引擎");
        });
    });
});
