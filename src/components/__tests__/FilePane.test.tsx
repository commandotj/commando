import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import FilePane from "../FilePane";
import * as redux from "../../app/hooks";
import { fetchDirectory } from "../../app/fileManagerSlice";
import type { RootState } from "../../app/store";
import { DndContext, DragEndEvent } from "@dnd-kit/core";

// Mock rc-util scrollbar size calculation
jest.mock("rc-util/lib/getScrollBarSize", () => ({
    __esModule: true,
    default: () => 0,
    getTargetScrollBarSize: () => ({ width: 0, height: 0 }),
}));

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
    });

    it("renders breadcrumb and table", () => {
        render(
            <Provider store={store}>
                <FilePane paneIndex={0} />
            </Provider>
        );
        expect(screen.getByText("Users")).toBeInTheDocument();
        expect(screen.getByText("Documents")).toBeInTheDocument();
        expect(screen.getByText("file.txt")).toBeInTheDocument();
        expect(screen.getByText("120.56 KB")).toBeInTheDocument();
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

    it("does not dispatch fetchDirectory when file is clicked", () => {
        const { container } = render(
            <Provider store={store}>
                <FilePane paneIndex={0} />
            </Provider>
        );
        const fileLink = screen.getByText("file.txt");
        fireEvent.click(fileLink);
        expect(dispatch).not.toHaveBeenCalled();
        expect(fetchDirectory).not.toHaveBeenCalled();
    });

    it("dispatches fetchDirectory when breadcrumb is clicked", () => {
        render(
            <Provider store={store}>
                <FilePane paneIndex={0} />
            </Provider>
        );
        fireEvent.click(screen.getByText("Users"));
        expect(dispatch).toHaveBeenCalled();
        expect(fetchDirectory).toHaveBeenCalledWith({
            paneIndex: 0,
            path: "/Users",
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

    it("renders resizable columns", () => {
        render(
            <Provider store={store}>
                <FilePane paneIndex={0} />
            </Provider>
        );

        // Check if resizable column headers are present
        const columnHeaders = screen.getAllByRole("columnheader");
        columnHeaders.forEach((header) => {
            expect(header).toHaveStyle({ resize: "horizontal" });
        });
    });

    describe("Drag and Drop", () => {
        it("renders draggable file items", () => {
            render(
                <Provider store={store}>
                    <FilePane paneIndex={0} />
                </Provider>
            );

            const fileItem = screen.getByText("file.txt");
            expect(
                fileItem.closest('[data-draggable="true"]')
            ).toBeInTheDocument();
        });

        it("renders droppable folder items", () => {
            render(
                <Provider store={store}>
                    <FilePane paneIndex={0} />
                </Provider>
            );

            const folderItem = screen.getByText("Documents");
            expect(
                folderItem.closest('[data-droppable="true"]')
            ).toBeInTheDocument();
        });

        it("handles drag end event", () => {
            const mockDispatch = jest.fn();
            (redux.useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);

            render(
                <Provider store={store}>
                    <FilePane paneIndex={0} />
                </Provider>
            );

            const fileItem = screen.getByText("file.txt");
            const folderItem = screen.getByText("Documents");

            // Simulate drag end event
            const dragEndEvent = {
                active: { id: "file.txt" },
                over: { id: "Documents" },
            } as DragEndEvent;

            fireEvent.dragEnd(fileItem, dragEndEvent);

            // Verify that the appropriate action was dispatched
            expect(mockDispatch).toHaveBeenCalled();
        });
    });
});
