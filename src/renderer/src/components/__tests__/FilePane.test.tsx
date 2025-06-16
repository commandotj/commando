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
import FilePane from "../FilePane";
import * as redux from "../../app/hooks";
import { fetchDirectory } from "../../app/fileManagerSlice";
import type { RootState } from "../../app/store";

const mockStore = configureStore<RootState>([]);

jest.mock("../../app/hooks");

jest.mock("../../app/fileManagerSlice", () => ({
    ...jest.requireActual("../../app/fileManagerSlice"),
    fetchDirectory: jest.fn(() => ({ type: "fileManager/fetchDirectory" })),
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
        value: jest.fn().mockImplementation((query) => ({
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

    window.fsApi = {
        listDir: jest.fn().mockResolvedValue([]),
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
        // ...mock 其他方法
    } as unknown as typeof window.fsApi;
});

describe("FilePane", () => {
    let store: ReturnType<typeof mockStore>;
    let dispatch: jest.Mock;

    beforeEach(() => {
        store = mockStore({
            fileManager: {
                panes: [
                    {
                        currentPath: "/Users/test",
                        entries: [
                            { name: "Documents", isDirectory: true },
                            {
                                name: "file.txt",
                                isDirectory: false,
                                size: 123456,
                            },
                        ],
                    },
                    {
                        currentPath: "/Users/test",
                        entries: [],
                    },
                ],
            },
        });
        dispatch = jest.fn();
        (redux.useAppDispatch as jest.Mock).mockReturnValue(dispatch);
        (redux.useAppSelector as jest.Mock).mockImplementation((fn) =>
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
        render(
            <Provider store={store}>
                <FilePane paneIndex={0} />
            </Provider>
        );
        await waitFor(() => {
            expect(screen.getAllByText("Users").length).toBeGreaterThan(0);
            expect(screen.getAllByText("Documents").length).toBeGreaterThan(0);
            expect(screen.getAllByText("file.txt").length).toBeGreaterThan(0);
            expect(screen.getAllByText("120.56 KB").length).toBeGreaterThan(0);
        });
    });

    it("dispatches fetchDirectory when folder is clicked", () => {
        render(
            <Provider store={store}>
                <FilePane paneIndex={0} />
            </Provider>
        );
        fireEvent.click(screen.getByText("Documents"));
        expect(dispatch).toHaveBeenCalled();
        expect(fetchDirectory).toHaveBeenCalledWith({
            paneIndex: 0,
            path: "/Users/test/Documents",
        });
    });

    it("does not dispatch fetchDirectory when file is clicked", async () => {
        const fileLink = await screen.findByText("file.txt");
        await act(async () => {
            fireEvent.click(fileLink);
        });
        expect(dispatch).not.toHaveBeenCalled();
        expect(fetchDirectory).not.toHaveBeenCalled();
    });

    it("dispatches fetchDirectory when breadcrumb is clicked", async () => {
        render(
            <Provider store={store}>
                <FilePane paneIndex={0} />
            </Provider>
        );
        await waitFor(() => {
            expect(screen.getAllByText("Users").length).toBeGreaterThan(0);
        });
        const usersLinks = screen.getAllByText("Users");
        const clickable = usersLinks.find(
            (el) =>
                el instanceof HTMLElement &&
                (el.className.includes("cursor-pointer") ||
                    el.getAttribute("title") === "Users")
        );
        expect(clickable).toBeDefined();
        if (clickable) {
            fireEvent.click(clickable);
        }
        expect(dispatch).toHaveBeenCalled();
        expect(fetchDirectory).toHaveBeenCalledWith({
            paneIndex: 0,
            path: expect.any(String),
        });
    });

    it("handles row selection", () => {
        render(
            <Provider store={store}>
                <FilePane paneIndex={0} />
            </Provider>
        );
        const checkboxes = screen.getAllByRole("checkbox");
        const rowCheckbox = checkboxes[1]; // First checkbox is the header checkbox
        fireEvent.click(rowCheckbox);
        expect(rowCheckbox).toBeChecked();
    });

    it("renders resizable columns", async () => {
        render(
            <Provider store={store}>
                <FilePane paneIndex={0} />
            </Provider>
        );
        await waitFor(() => {
            expect(screen.getAllByText("Name").length).toBeGreaterThan(0);
            expect(screen.getAllByText("Date Modified").length).toBeGreaterThan(
                0
            );
            expect(screen.getAllByText("Size").length).toBeGreaterThan(0);
        });
    });

    describe.skip("Drag and Drop", () => {
        it("renders draggable file items", async () => {});
        it("renders droppable folder items", async () => {});
        it("handles drag end event", async () => {});
    });

    it("supports Ctrl/Cmd 增量多选和取消选择", () => {
        render(
            <Provider store={store}>
                <FilePane paneIndex={0} />
            </Provider>
        );
        const checkboxes = screen.getAllByRole("checkbox");
        const rowCheckbox1 = checkboxes[1];
        const rowCheckbox2 = checkboxes[2];
        // 先选第一个
        fireEvent.click(rowCheckbox1, { ctrlKey: true });
        expect(rowCheckbox1).toBeChecked();
        // 增量选第二个
        fireEvent.click(rowCheckbox2, { metaKey: true });
        expect(rowCheckbox2).toBeChecked();
        // 再次点击第一个取消
        fireEvent.click(rowCheckbox1, { ctrlKey: true });
        expect(rowCheckbox1).not.toBeChecked();
    });

    it("supports Shift 区间多选", () => {
        render(
            <Provider store={store}>
                <FilePane paneIndex={0} />
            </Provider>
        );
        const checkboxes = screen.getAllByRole("checkbox");
        const rowCheckbox1 = checkboxes[1];
        const rowCheckbox2 = checkboxes[2];
        // 先选第一个
        fireEvent.click(rowCheckbox1);
        // Shift 选区间
        fireEvent.click(rowCheckbox2, { shiftKey: true });
        expect(rowCheckbox1).toBeChecked();
        expect(rowCheckbox2).toBeChecked();
    });

    it("supports 全选和全不选", () => {
        render(
            <Provider store={store}>
                <FilePane paneIndex={0} />
            </Provider>
        );
        const checkboxes = screen.getAllByRole("checkbox");
        const selectAll = checkboxes[0];
        const rowCheckbox1 = checkboxes[1];
        const rowCheckbox2 = checkboxes[2];
        // 全选
        fireEvent.click(selectAll);
        expect(rowCheckbox1).toBeChecked();
        expect(rowCheckbox2).toBeChecked();
        // 全不选
        fireEvent.click(selectAll);
        expect(rowCheckbox1).not.toBeChecked();
        expect(rowCheckbox2).not.toBeChecked();
    });
});
