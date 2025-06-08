import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import FilePane from "./FilePane";
import * as redux from "../app/hooks";
import { fetchDirectory } from "../app/fileManagerSlice";

const mockStore = configureStore([]);

jest.mock("../app/hooks");

jest.mock("../app/fileManagerSlice", () => ({
    ...jest.requireActual("../app/fileManagerSlice"),
    fetchDirectory: jest.fn(() => ({ type: "fileManager/fetchDirectory" })),
}));

beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(), // deprecated
            removeListener: jest.fn(), // deprecated
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });
});

describe("FilePane", () => {
    let store: any;
    let dispatch: jest.Mock;

    beforeEach(() => {
        store = mockStore({
            fileManager: {
                panes: [
                    {
                        currentPath: "/Users/test",
                        entries: [
                            { name: "Documents", isDirectory: true },
                            { name: "file.txt", isDirectory: false },
                        ],
                        selectedKeys: [],
                    },
                    {
                        currentPath: "/Users/test",
                        entries: [],
                        selectedKeys: [],
                    },
                ],
            },
        });
        dispatch = jest.fn();
        (redux.useAppDispatch as jest.Mock).mockReturnValue(dispatch);
        (redux.useAppSelector as jest.Mock).mockImplementation((fn) =>
            fn(store.getState())
        );
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
    });

    it("dispatches fetchDirectory when folder is clicked", () => {
        render(
            <Provider store={store}>
                <FilePane paneIndex={0} />
            </Provider>
        );
        fireEvent.click(screen.getByText("Documents"));
        expect(dispatch).toHaveBeenCalled();
        expect(fetchDirectory).toHaveBeenCalled();
    });
});
