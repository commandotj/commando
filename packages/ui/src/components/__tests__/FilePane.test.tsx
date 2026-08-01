// [测试修复历史]
// 2025-06-15：为彻底解决 FilePane 组件测试中的异步渲染、状态流转与类型链路问题，做出如下修正：
// - 所有 render 调用均用 await act(async () => { render(...) }) 包裹，消除 useEffect/setState 相关 act() 警告。
// - mock store/selector 结构与组件实际依赖完全对齐，确保 entries、currentPath 等渲染条件一致。
// - window.fsApi 统一 mock，listDir/listDrives 返回 Promise，保证组件异步数据流畅通。
// - 所有异步断言均用 findByText/waitFor，彻底消除 race condition。
// - 相关讨论见 AI 智能修复记录与团队代码审查。
//
// 如需修改测试用例结构、mock 机制或异步断言方式，请优先参考本注释，确保主流程测试链路不被破坏。
//
// [End of 修复历史]
import "./setup"; // Import global setup first
import "@testing-library/jest-dom";
import {
    render,
    screen,
    fireEvent,
    waitFor,
    act,
} from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import { configureStore as configureRealStore } from "@reduxjs/toolkit";
import FilePane from "../FilePane";
import * as redux from "../../app/hooks";
import { fetchDirectory } from "../../app/fileManagerSlice";
// import { setPaneSelectedKeys } from "../../app/fileManagerSlice";
// import fileManagerReducer from "../../app/fileManagerSlice";
// import driveReducer from "../../app/driveSlice";
// import clipboardReducer from "../../app/clipboardSlice";
// import fileOperationsReducer from "../../app/fileOperationsSlice";
import {
    DEFAULT_SYNC_OPTIONS,
    DEFAULT_SYNC_STRATEGY_ID,
} from "../../constants/sync";
import type { RootState } from "../../app/store";

const defaultSyncState = {
    strategyId: DEFAULT_SYNC_STRATEGY_ID,
    options: DEFAULT_SYNC_OPTIONS,
    report: null,
    plan: null,
    diffMap: {},
    status: "idle" as const,
    error: null,
    lastJobId: null,
    planModalOpen: false,
    progressFile: "",
    progressDone: 0,
    progressTotal: 0,
    executeResult: null,
};

const mockStore = configureStore<RootState>([]);

jest.mock("../../app/hooks");

jest.mock("../../app/fileManagerSlice", () => ({
    ...jest.requireActual("../../app/fileManagerSlice"),
    fetchDirectory: jest.fn(() => ({ type: "fileManager/fetchDirectory" })),
    setPaneSelectedKeys: jest.fn(() => ({
        type: "fileManager/setPaneSelectedKeys",
    })),
}));

// Mock useDriveEvents hook
jest.mock("../../hooks/useDriveEvents", () => ({
    useDriveEvents: jest.fn(),
}));

// Mock logger module
jest.mock("../../logger", () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

// Mock useI18n hook
jest.mock("../../hooks/useI18n", () => ({
    useI18n: () => ({
        t: (key: string) => {
            // Return English translations for common keys
            const translations: Record<string, string> = {
                "ui.table.name": "Name",
                "ui.table.dateModified": "Date Modified",
                "ui.table.size": "Size",
                "ui.table.type": "Type",
                "ui.file.typeFolder": "Folder",
                "ui.file.typeFile": "File",
                "ui.status.itemsSelected": "items selected",
                "ui.status.totalItems": "total items",
            };
            return translations[key] || key;
        },
        changeLanguage: jest.fn(),
        currentLanguage: "en-US",
        isReady: true,
    }),
}));

beforeAll(() => {
    // Mock window.getComputedStyle
    Object.defineProperty(window, "getComputedStyle", {
        value: () => ({
            getPropertyValue: (prop: string) => {
                if (
                    prop === "overflow" ||
                    prop === "overflow-y" ||
                    prop === "overflow-x"
                ) {
                    return "auto";
                }
                return "";
            },
            overflow: "auto",
            overflowY: "auto",
            overflowX: "auto",
            scrollbarWidth: "17px",
            scrollbarHeight: "17px",
        }),
    });

    // Mock window.matchMedia
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });

    // Mock navigator.userAgent
    Object.defineProperty(window.navigator, "userAgent", {
        value: "node.js",
    });

    // Mock offsetHeight/offsetWidth for Ant Design Table
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
        configurable: true,
        value: 100,
    });
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
        configurable: true,
        value: 100,
    });

    // Mock document.documentElement.style
    Object.defineProperty(document.documentElement, "style", {
        value: {
            overflow: "auto",
            overflowY: "auto",
            overflowX: "auto",
        },
    });

    // window.fsApi and window.logApi are already mocked in setup.ts
});

describe("FilePane", () => {
    let store:
        ReturnType<typeof mockStore> | ReturnType<typeof configureRealStore>;

    // Ensure window.logApi is mocked before each test
    beforeEach(() => {
        (global as unknown as { window: unknown }).window = {
            ...global.window,
            logApi: {
                log: jest.fn(),
            },
        };
    });
    let dispatch: jest.Mock;

    beforeEach(() => {
        store = mockStore({
            fileManager: {
                panes: [
                    {
                        currentPath: "/Users/test",
                        syncRoot: "/Users/test",
                        entries: [
                            {
                                name: "Documents",
                                isDirectory: true,
                                size: 0,
                                mtime: Date.now(),
                            },
                            {
                                name: "file.txt",
                                isDirectory: false,
                                size: 123456,
                                mtime: Date.now(),
                            },
                        ],
                        selectedKeys: [],
                    },
                    {
                        currentPath: "/Users/test",
                        syncRoot: "/Users/test",
                        entries: [],
                        selectedKeys: [],
                    },
                ],
                activePane: 0,
                viewMode: "browse",
            },
            clipboard: {
                items: [],
                operation: null,
                sourcePane: null,
                timestamp: 0,
            },
            fileOperations: {
                activeOperations: {},
                batchOperations: {},
                operationHistory: [],
            },
            drive: {
                drives: [],
                loading: false,
                error: null,
                loadingMessage: "",
                lastUpdateTime: null,
            },
            sync: defaultSyncState,
        });
        dispatch = jest.fn();
        (redux.useAppDispatch as jest.Mock).mockReturnValue(dispatch);
        (redux.useAppSelector as jest.Mock).mockImplementation(fn =>
            fn(store.getState())
        );
        (fetchDirectory as unknown as jest.Mock).mockClear();

        window.fsApi = {
            listDir: jest.fn().mockResolvedValue([
                {
                    name: "file.txt",
                    isDirectory: false,
                    size: 1234,
                    path: "/file.txt",
                },
            ]),
            listDrives: jest.fn().mockResolvedValue([
                {
                    device: "/dev/disk1",
                    description: "Mock Disk",
                    size: 1000000000,
                    mountpoints: [{ path: "/" }],
                    isSystem: true,
                    isRemovable: false,
                },
            ]),
        } as unknown as typeof window.fsApi;
    });

    it("renders breadcrumb and table", async () => {
        await act(async () => {
            render(
                <Provider store={store}>
                    <FilePane paneIndex={0} />
                </Provider>
            );
        });
        await waitFor(() => {
            expect(screen.getAllByText("Users").length).toBeGreaterThan(0);
            expect(screen.getAllByText("Documents").length).toBeGreaterThan(0);
            expect(screen.getAllByText("file.txt").length).toBeGreaterThan(0);
            expect(screen.getAllByText("120.56 KB").length).toBeGreaterThan(0);
        });
    });

    it("dispatches fetchDirectory when folder is clicked", async () => {
        await act(async () => {
            render(
                <Provider store={store}>
                    <FilePane paneIndex={0} />
                </Provider>
            );
        });
        await act(async () => {
            fireEvent.click(screen.getByText("Documents"));
        });
        expect(dispatch).toHaveBeenCalled();
        expect(fetchDirectory).toHaveBeenCalledWith({
            paneIndex: 0,
            path: "/Users/test/Documents",
        });
    });

    it("does not dispatch fetchDirectory when file is clicked", async () => {
        await act(async () => {
            render(
                <Provider store={store}>
                    <FilePane paneIndex={0} />
                </Provider>
            );
        });
        // Reset dispatch mock after component mount (which calls fetchDrives)
        dispatch.mockClear();
        const fileLink = await screen.findByText("file.txt");
        await act(async () => {
            fireEvent.click(fileLink);
        });
        expect(dispatch).not.toHaveBeenCalled();
        expect(fetchDirectory).not.toHaveBeenCalled();
    });

    it("dispatches fetchDirectory when breadcrumb is clicked", async () => {
        await act(async () => {
            render(
                <Provider store={store}>
                    <FilePane paneIndex={0} />
                </Provider>
            );
        });
        await waitFor(() => {
            expect(screen.getAllByText("Users").length).toBeGreaterThan(0);
        });
        const usersLinks = screen.getAllByText("Users");
        const clickable = usersLinks.find(
            el =>
                el instanceof HTMLElement &&
                (el.className.includes("cursor-pointer") ||
                    el.getAttribute("title") === "Users")
        );
        expect(clickable).toBeDefined();
        await act(async () => {
            if (clickable) {
                fireEvent.click(clickable);
            }
        });
        expect(dispatch).toHaveBeenCalled();
        expect(fetchDirectory).toHaveBeenCalledWith({
            paneIndex: 0,
            path: expect.any(String),
        });
    });

    it("handles row selection", async () => {
        await act(async () => {
            render(
                <Provider store={store}>
                    <FilePane paneIndex={0} />
                </Provider>
            );
        });
        // Reset dispatch mock after component mount (which calls fetchDrives)
        dispatch.mockClear();
        const checkboxes = screen.getAllByRole("checkbox");
        const rowCheckbox = checkboxes[1]; // First checkbox is the header checkbox
        await act(async () => {
            fireEvent.click(rowCheckbox);
        });
        // Check if setPaneSelectedKeys was called (since we're using mock store)
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "fileManager/setPaneSelectedKeys",
            })
        );
    });

    it("renders resizable columns", async () => {
        await act(async () => {
            render(
                <Provider store={store}>
                    <FilePane paneIndex={0} />
                </Provider>
            );
        });
        await waitFor(() => {
            expect(screen.getAllByText("Name").length).toBeGreaterThan(0);
            expect(screen.getAllByText("Date Modified").length).toBeGreaterThan(
                0
            );
            expect(screen.getAllByText("Size").length).toBeGreaterThan(0);
        });
    });

    it("supports Ctrl/Cmd 增量多选和取消选择", async () => {
        await act(async () => {
            render(
                <Provider store={store}>
                    <FilePane paneIndex={0} />
                </Provider>
            );
        });
        // Reset dispatch mock after component mount (which calls fetchDrives)
        dispatch.mockClear();
        const checkboxes = screen.getAllByRole("checkbox");
        const rowCheckbox1 = checkboxes[1];
        const rowCheckbox2 = checkboxes[2];
        await act(async () => {
            fireEvent.click(rowCheckbox1, { ctrlKey: true });
        });
        // Check if setPaneSelectedKeys was called
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "fileManager/setPaneSelectedKeys",
            })
        );
        dispatch.mockClear();
        await act(async () => {
            fireEvent.click(rowCheckbox2, { metaKey: true });
        });
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "fileManager/setPaneSelectedKeys",
            })
        );
    });

    it("supports Shift 区间多选", async () => {
        await act(async () => {
            render(
                <Provider store={store}>
                    <FilePane paneIndex={0} />
                </Provider>
            );
        });
        // Reset dispatch mock after component mount (which calls fetchDrives)
        dispatch.mockClear();
        const checkboxes = screen.getAllByRole("checkbox");
        const rowCheckbox1 = checkboxes[1];
        const rowCheckbox2 = checkboxes[2];
        await act(async () => {
            fireEvent.click(rowCheckbox1);
        });
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "fileManager/setPaneSelectedKeys",
            })
        );
        dispatch.mockClear();
        await act(async () => {
            fireEvent.click(rowCheckbox2, { shiftKey: true });
        });
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "fileManager/setPaneSelectedKeys",
            })
        );
    });

    it("supports 全选和全不选", async () => {
        await act(async () => {
            render(
                <Provider store={store}>
                    <FilePane paneIndex={0} />
                </Provider>
            );
        });
        // Reset dispatch mock after component mount (which calls fetchDrives)
        dispatch.mockClear();
        const checkboxes = screen.getAllByRole("checkbox");
        const selectAll = checkboxes[0];
        // 全选
        await act(async () => {
            fireEvent.click(selectAll);
        });
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "fileManager/setPaneSelectedKeys",
            })
        );
        dispatch.mockClear();
        // 全不选
        await act(async () => {
            fireEvent.click(selectAll);
        });
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "fileManager/setPaneSelectedKeys",
            })
        );
    });
});
