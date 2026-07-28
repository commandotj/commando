/**
 * @jest-environment node
 */

// WindowService 单元测试，验证窗口管理功能

import { BrowserWindow } from "electron";
import WindowService from "../WindowService";
import { logger } from "../../engine/laozi";

// Mock dependencies
jest.mock("../../log/logger", () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));

// Mock Electron BrowserWindow
jest.mock("electron", () => ({
    BrowserWindow: jest.fn().mockImplementation(() => ({
        id: 12345,
        isDestroyed: jest.fn().mockReturnValue(false),
        on: jest.fn(),
        loadURL: jest.fn().mockResolvedValue(undefined),
        loadFile: jest.fn().mockResolvedValue(undefined),
        show: jest.fn(),
        hide: jest.fn(),
        close: jest.fn(),
        minimize: jest.fn(),
        maximize: jest.fn(),
        unmaximize: jest.fn(),
        restore: jest.fn(),
        center: jest.fn(),
        focus: jest.fn(),
        setBounds: jest.fn(),
        setTitle: jest.fn(),
        setAlwaysOnTop: jest.fn(),
        setFullScreen: jest.fn(),
        getTitle: jest.fn().mockReturnValue("Test Window"),
        getBounds: jest
            .fn()
            .mockReturnValue({ x: 100, y: 100, width: 800, height: 600 }),
        isVisible: jest.fn().mockReturnValue(true),
        isMinimized: jest.fn().mockReturnValue(false),
        isMaximized: jest.fn().mockReturnValue(false),
        isFullScreen: jest.fn().mockReturnValue(false),
        isAlwaysOnTop: jest.fn().mockReturnValue(false),
        webContents: {
            getURL: jest.fn().mockReturnValue("file:///test.html"),
        },
    })),
    screen: {
        getPrimaryDisplay: jest.fn().mockReturnValue({
            workArea: { x: 0, y: 0, width: 1920, height: 1080 },
        }),
    },
}));

describe("WindowService", () => {
    let windowService: WindowService;
    let mockMainWindow: BrowserWindow;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock BrowserWindow
        mockMainWindow = {
            isDestroyed: jest.fn().mockReturnValue(false),
            webContents: {
                send: jest.fn(),
            },
        } as unknown as BrowserWindow;

        windowService = new WindowService(mockMainWindow);
        windowService.setWindowConfig({
            preload: "/path/to/preload.js",
            url: "http://localhost:3000",
            indexHtml: "/path/to/index.html",
            env: { VITE_DEV_SERVER_URL: "http://localhost:3000" },
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("服务初始化", () => {
        it("应该正确初始化服务", async () => {
            await windowService.initialize();
            expect(logger.info).toHaveBeenCalledWith(
                "WindowService initialized with window management capabilities"
            );
        });

        it("应该正确清理服务", async () => {
            await windowService.cleanup();
            expect(logger.info).toHaveBeenCalledWith(
                "WindowService cleaning up"
            );
        });

        it("应该返回正确的元数据", () => {
            const metadata = windowService.getMetadata();
            expect(metadata.name).toBe("WindowService");
            expect(metadata.version).toBe("1.0.0");
            expect(metadata.ipcChannels).toHaveLength(15);
        });
    });

    describe("窗口创建", () => {
        it("应该创建新窗口", async () => {
            const result = await windowService.handleCreate(
                {} as any,
                { width: 800, height: 600 },
                "test-route"
            );

            expect(result.success).toBe(true);
            expect(result.id).toBe(12345);
            expect(BrowserWindow).toHaveBeenCalledWith({
                width: 800,
                height: 600,
                center: true,
                resizable: true,
                minimizable: true,
                maximizable: true,
                closable: true,
                show: false,
                webPreferences: {
                    preload: "/path/to/preload.js",
                    contextIsolation: true,
                    nodeIntegration: false,
                    sandbox: false,
                },
            });
        });

        it("应该处理窗口创建错误", async () => {
            const mockError = new Error("创建失败");
            (BrowserWindow as unknown as jest.Mock).mockImplementationOnce(
                () => {
                    throw mockError;
                }
            );

            const result = await windowService.handleCreate({} as any, {});

            expect(result.success).toBe(false);
            expect(result.error).toBe("创建失败");
        });
    });

    describe("窗口操作", () => {
        let mockWindow: any;

        beforeEach(() => {
            mockWindow = {
                id: 12345,
                isDestroyed: jest.fn().mockReturnValue(false),
                close: jest.fn(),
                minimize: jest.fn(),
                maximize: jest.fn(),
                unmaximize: jest.fn(),
                restore: jest.fn(),
                center: jest.fn(),
                focus: jest.fn(),
                show: jest.fn(),
                hide: jest.fn(),
                setBounds: jest.fn(),
                setTitle: jest.fn(),
                setAlwaysOnTop: jest.fn(),
                setFullScreen: jest.fn(),
                getTitle: jest.fn().mockReturnValue("Test Window"),
                getBounds: jest.fn().mockReturnValue({
                    x: 100,
                    y: 100,
                    width: 800,
                    height: 600,
                }),
                isVisible: jest.fn().mockReturnValue(true),
                isMinimized: jest.fn().mockReturnValue(false),
                isMaximized: jest.fn().mockReturnValue(false),
                isFullScreen: jest.fn().mockReturnValue(false),
                isAlwaysOnTop: jest.fn().mockReturnValue(false),
                webContents: {
                    getURL: jest.fn().mockReturnValue("file:///test.html"),
                },
            };
            (windowService as any).windows.set(12345, mockWindow);
        });

        it("应该关闭窗口", async () => {
            const result = await windowService.handleClose({} as any, 12345);

            expect(result.success).toBe(true);
            expect(mockWindow.close).toHaveBeenCalled();
        });

        it("应该最小化窗口", async () => {
            const result = await windowService.handleMinimize({} as any, 12345);

            expect(result.success).toBe(true);
            expect(mockWindow.minimize).toHaveBeenCalled();
        });

        it("应该最大化窗口", async () => {
            const result = await windowService.handleMaximize({} as any, 12345);

            expect(result.success).toBe(true);
            expect(mockWindow.maximize).toHaveBeenCalled();
        });

        it("应该恢复窗口", async () => {
            const result = await windowService.handleRestore({} as any, 12345);

            expect(result.success).toBe(true);
            expect(mockWindow.restore).toHaveBeenCalled();
        });

        it("应该居中窗口", async () => {
            const result = await windowService.handleCenter({} as any, 12345);

            expect(result.success).toBe(true);
            expect(mockWindow.center).toHaveBeenCalled();
        });

        it("应该设置窗口边界", async () => {
            const bounds = { x: 200, y: 200, width: 1000, height: 700 };
            const result = await windowService.handleSetBounds(
                {} as any,
                12345,
                bounds
            );

            expect(result.success).toBe(true);
            expect(mockWindow.setBounds).toHaveBeenCalledWith(bounds);
        });

        it("应该设置窗口标题", async () => {
            const result = await windowService.handleSetTitle(
                {} as any,
                12345,
                "New Title"
            );

            expect(result.success).toBe(true);
            expect(mockWindow.setTitle).toHaveBeenCalledWith("New Title");
        });

        it("应该设置窗口置顶", async () => {
            const result = await windowService.handleSetAlwaysOnTop(
                {} as any,
                12345,
                true
            );

            expect(result.success).toBe(true);
            expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true);
        });

        it("应该聚焦窗口", async () => {
            const result = await windowService.handleFocus({} as any, 12345);

            expect(result.success).toBe(true);
            expect(mockWindow.focus).toHaveBeenCalled();
        });

        it("应该显示窗口", async () => {
            const result = await windowService.handleShow({} as any, 12345);

            expect(result.success).toBe(true);
            expect(mockWindow.show).toHaveBeenCalled();
        });

        it("应该隐藏窗口", async () => {
            const result = await windowService.handleHide({} as any, 12345);

            expect(result.success).toBe(true);
            expect(mockWindow.hide).toHaveBeenCalled();
        });

        it("应该切换全屏模式", async () => {
            const result = await windowService.handleToggleFullscreen(
                {} as any,
                12345
            );

            expect(result.success).toBe(true);
            expect(mockWindow.setFullScreen).toHaveBeenCalledWith(true);
        });
    });

    describe("窗口信息", () => {
        let mockWindow: any;

        beforeEach(() => {
            mockWindow = {
                id: 12345,
                isDestroyed: jest.fn().mockReturnValue(false),
                getTitle: jest.fn().mockReturnValue("Test Window"),
                getBounds: jest.fn().mockReturnValue({
                    x: 100,
                    y: 100,
                    width: 800,
                    height: 600,
                }),
                isVisible: jest.fn().mockReturnValue(true),
                isMinimized: jest.fn().mockReturnValue(false),
                isMaximized: jest.fn().mockReturnValue(false),
                isFullScreen: jest.fn().mockReturnValue(false),
                isAlwaysOnTop: jest.fn().mockReturnValue(false),
                webContents: {
                    getURL: jest.fn().mockReturnValue("file:///test.html"),
                },
            };
            (windowService as any).windows.set(12345, mockWindow);
        });

        it("应该获取窗口列表", async () => {
            const result = await windowService.handleList();

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: 12345,
                title: "Test Window",
                bounds: { x: 100, y: 100, width: 800, height: 600 },
                isVisible: true,
                isMinimized: false,
                isMaximized: false,
                isFullScreen: false,
                isAlwaysOnTop: false,
                url: "file:///test.html",
            });
        });

        it("应该获取窗口信息", async () => {
            const result = await windowService.handleGetInfo({} as any, 12345);

            expect(result).toEqual({
                id: 12345,
                title: "Test Window",
                bounds: { x: 100, y: 100, width: 800, height: 600 },
                isVisible: true,
                isMinimized: false,
                isMaximized: false,
                isFullScreen: false,
                isAlwaysOnTop: false,
                url: "file:///test.html",
            });
        });

        it("应该处理不存在的窗口", async () => {
            const result = await windowService.handleGetInfo({} as any, 99999);

            expect(result).toBeNull();
        });
    });

    describe("错误处理", () => {
        it("应该处理窗口不存在的情况", async () => {
            const result = await windowService.handleClose({} as any, 99999);

            expect(result.success).toBe(false);
            expect(result.error).toBe("窗口不存在或已销毁");
        });

        it("应该处理已销毁的窗口", async () => {
            const mockWindow = {
                id: 12345,
                isDestroyed: jest.fn().mockReturnValue(true),
            };
            (windowService as any).windows.set(12345, mockWindow);

            const result = await windowService.handleClose({} as any, 12345);

            expect(result.success).toBe(false);
            expect(result.error).toBe("窗口不存在或已销毁");
        });
    });

    describe("进度跟踪", () => {
        it("应该发送加载状态", () => {
            const mockWebContents = mockMainWindow.webContents as any;
            windowService.sendLoadingState(true, "测试消息");

            expect(mockWebContents.send).toHaveBeenCalledWith(
                "service:loading",
                {
                    service: "WindowService",
                    loading: true,
                    message: "测试消息",
                    error: undefined,
                    timestamp: expect.any(Number),
                }
            );
        });

        it("应该处理窗口销毁状态", () => {
            const mockWebContents = mockMainWindow.webContents as any;
            mockMainWindow.isDestroyed = jest.fn().mockReturnValue(true);

            windowService.sendLoadingState(true, "测试消息");

            expect(mockWebContents.send).not.toHaveBeenCalled();
        });
    });
});
