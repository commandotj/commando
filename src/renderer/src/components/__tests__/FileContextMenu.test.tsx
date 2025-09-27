import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import FileContextMenu from "../FileContextMenu";
import clipboardReducer from "../../app/clipboardSlice";
import fileManagerReducer from "../../app/fileManagerSlice";
import fileOperationsReducer from "../../app/fileOperationsSlice";

// Mock Radix UI Context Menu to avoid DOM issues in tests
jest.mock("@radix-ui/react-context-menu", () => ({
  Root: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-menu-root">{children}</div>
  ),
  Trigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-menu-trigger">{children}</div>
  ),
  Portal: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-menu-portal">{children}</div>
  ),
  Content: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="context-menu-content">{children}</div>
  ),
  Item: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <div
      data-testid="context-menu-item"
      onClick={onClick}
      data-disabled={disabled}
    >
      {children}
    </div>
  ),
  Separator: () => <div data-testid="context-menu-separator" />,
}));

// Mock window.fsApi
const mockFsApi = {
  copyBatch: jest.fn(),
};

Object.defineProperty(window, "fsApi", {
  value: mockFsApi,
  writable: true,
});

const createTestStore = (
  initialState = {},
): ReturnType<typeof configureStore> => {
  return configureStore({
    reducer: {
      fileManager: fileManagerReducer,
      clipboard: clipboardReducer,
      fileOperations: fileOperationsReducer,
    },
    preloadedState: {
      clipboard: {
        items: [],
        operation: null,
        sourcePane: null,
        timestamp: 0,
      },
      fileManager: {
        panes: [
          { currentPath: "/source", entries: [], selectedKeys: [] },
          { currentPath: "/target", entries: [], selectedKeys: [] },
        ],
        activePane: 0,
      },
      fileOperations: {
        activeOperations: {},
        batchOperations: {},
        operationHistory: [],
      },
      ...initialState,
    },
  });
};

const renderWithStore = (
  component: React.ReactElement,
  initialState = {},
): ReturnType<typeof render> => {
  const store = createTestStore(initialState);
  return render(<Provider store={store}>{component}</Provider>);
};

describe("FileContextMenu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render context menu trigger", () => {
    renderWithStore(
      <FileContextMenu selectedFiles={[]} currentPath="/test" currentPane={0}>
        <div data-testid="trigger">Right click me</div>
      </FileContextMenu>,
    );

    expect(screen.getByTestId("trigger")).toBeInTheDocument();
  });

  it("should show copy and cut options when files are selected", () => {
    renderWithStore(
      <FileContextMenu
        selectedFiles={["/test/file1.txt", "/test/file2.txt"]}
        currentPath="/test"
        currentPane={0}
      >
        <div data-testid="trigger">Right click me</div>
      </FileContextMenu>,
    );

    expect(screen.getByText("Copy (2 items)")).toBeInTheDocument();
    expect(screen.getByText("Cut (2 items)")).toBeInTheDocument();
    expect(screen.getByText("Copy to Other Pane")).toBeInTheDocument();
  });

  it("should not show paste option when clipboard is empty", () => {
    renderWithStore(
      <FileContextMenu selectedFiles={[]} currentPath="/test" currentPane={0}>
        <div data-testid="trigger">Right click me</div>
      </FileContextMenu>,
    );

    expect(screen.queryByText(/Paste/)).not.toBeInTheDocument();
  });

  it("should show new folder option", () => {
    renderWithStore(
      <FileContextMenu selectedFiles={[]} currentPath="/test" currentPane={0}>
        <div data-testid="trigger">Right click me</div>
      </FileContextMenu>,
    );

    expect(screen.getByText("New Folder")).toBeInTheDocument();
  });

  it("should show rename option for single file selection", () => {
    renderWithStore(
      <FileContextMenu
        selectedFiles={["/test/file.txt"]}
        currentPath="/test"
        currentPane={0}
      >
        <div data-testid="trigger">Right click me</div>
      </FileContextMenu>,
    );

    expect(screen.getByText("Rename")).toBeInTheDocument();
  });

  it("should show delete option when files are selected", () => {
    renderWithStore(
      <FileContextMenu
        selectedFiles={["/test/file.txt"]}
        currentPath="/test"
        currentPane={0}
      >
        <div data-testid="trigger">Right click me</div>
      </FileContextMenu>,
    );

    expect(screen.getByText("Delete (1 item)")).toBeInTheDocument();
  });

  it("should disable copy to other pane when other pane has no path", () => {
    renderWithStore(
      <FileContextMenu
        selectedFiles={["/test/file.txt"]}
        currentPath="/test"
        currentPane={0}
      >
        <div data-testid="trigger">Right click me</div>
      </FileContextMenu>,
      {
        fileManager: {
          panes: [
            { currentPath: "/source", entries: [], selectedKeys: [] },
            { currentPath: "", entries: [], selectedKeys: [] }, // Empty path
          ],
          activePane: 0,
        },
      },
    );

    const copyToOtherPane = screen.getByText("Copy to Other Pane");
    expect(
      copyToOtherPane.closest('[data-disabled="true"]'),
    ).toBeInTheDocument();
  });
});
