import { renderHook, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import React from "react";
import { useClipboard } from "../useClipboard";
import clipboardReducer from "../../app/clipboardSlice";
import fileManagerReducer from "../../app/fileManagerSlice";
import fileOperationsReducer from "../../app/fileOperationsSlice";

// Mock the clipboard service
jest.mock("../../services/clipboardService", () => ({
  clipboardService: {
    copy: jest.fn(),
    cut: jest.fn(),
    paste: jest.fn(),
    clear: jest.fn(),
    canPaste: jest.fn(),
    getItems: jest.fn(),
    hasItems: jest.fn(),
    getOperationType: jest.fn(),
    isFromPane: jest.fn(),
    isStale: jest.fn(),
  },
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
          { currentPath: "", entries: [], selectedKeys: [] },
          { currentPath: "", entries: [], selectedKeys: [] },
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

const renderUseClipboard = (
  initialState = {},
): ReturnType<typeof renderHook> => {
  const store = createTestStore(initialState);
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    // eslint-disable-next-line react/no-children-prop
    React.createElement(Provider, { store, children });

  return renderHook(() => useClipboard(), { wrapper });
};

/* eslint-disable @typescript-eslint/no-explicit-any */
describe("useClipboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return initial empty state", () => {
    const { result } = renderUseClipboard();

    expect((result.current as any).state).toEqual({
      items: [],
      operation: null,
      sourcePane: null,
      timestamp: 0,
    });
    expect((result.current as any).isEmpty).toBe(true);
    expect((result.current as any).isCopy).toBe(false);
    expect((result.current as any).isCut).toBe(false);
  });

  it("should return clipboard state with items", () => {
    const clipboardState = {
      items: ["/file1.txt", "/file2.txt"],
      operation: "copy" as const,
      sourcePane: 0 as const,
      timestamp: Date.now(),
    };

    const { result } = renderUseClipboard({
      clipboard: clipboardState,
    });

    expect((result.current as any).state).toEqual(clipboardState);
    expect((result.current as any).items).toEqual(["/file1.txt", "/file2.txt"]);
    expect((result.current as any).operation).toBe("copy");
    expect((result.current as any).sourcePane).toBe(0);
    expect((result.current as any).isEmpty).toBe(false);
    expect((result.current as any).isCopy).toBe(true);
    expect((result.current as any).isCut).toBe(false);
  });

  it("should return cut operation state", () => {
    const clipboardState = {
      items: ["/file.txt"],
      operation: "cut" as const,
      sourcePane: 1 as const,
      timestamp: Date.now(),
    };

    const { result } = renderUseClipboard({
      clipboard: clipboardState,
    });

    expect((result.current as any).isCopy).toBe(false);
    expect((result.current as any).isCut).toBe(true);
  });

  it("should call clipboard service methods", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { clipboardService } = require("../../services/clipboardService");
    const { result } = renderUseClipboard();

    // Test copy
    act(() => {
      (result.current as any).copy(["/file.txt"], 0);
    });
    expect(clipboardService.copy).toHaveBeenCalledWith(["/file.txt"], 0);

    // Test cut
    act(() => {
      (result.current as any).cut(["/file.txt"], 1);
    });
    expect(clipboardService.cut).toHaveBeenCalledWith(["/file.txt"], 1);

    // Test clear
    act(() => {
      (result.current as any).clear();
    });
    expect(clipboardService.clear).toHaveBeenCalled();

    // Test canPaste
    (result.current as any).canPaste("/target");
    expect(clipboardService.canPaste).toHaveBeenCalledWith("/target");

    // Test getItems
    (result.current as any).getItems();
    expect(clipboardService.getItems).toHaveBeenCalled();

    // Test hasItems
    (result.current as any).hasItems();
    expect(clipboardService.hasItems).toHaveBeenCalled();

    // Test getOperationType
    (result.current as any).getOperationType();
    expect(clipboardService.getOperationType).toHaveBeenCalled();

    // Test isFromPane
    (result.current as any).isFromPane(0);
    expect(clipboardService.isFromPane).toHaveBeenCalledWith(0);

    // Test isStale
    (result.current as any).isStale();
    expect(clipboardService.isStale).toHaveBeenCalled();
  });

  it("should handle async paste operation", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { clipboardService } = require("../../services/clipboardService");
    clipboardService.paste.mockResolvedValue(undefined);

    const { result } = renderUseClipboard();

    await act(async () => {
      await (result.current as any).paste("/target", 1);
    });

    expect(clipboardService.paste).toHaveBeenCalledWith("/target", 1);
  });

  it("should handle paste errors", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { clipboardService } = require("../../services/clipboardService");
    const error = new Error("Paste failed");
    clipboardService.paste.mockRejectedValue(error);

    const { result } = renderUseClipboard();

    await expect(
      act(async () => {
        await (result.current as any).paste("/target", 1);
      }),
    ).rejects.toThrow("Paste failed");
  });

  it("should memoize callback functions", () => {
    const { result, rerender } = renderUseClipboard();

    const firstRenderCallbacks = {
      copy: (result.current as any).copy,
      cut: (result.current as any).cut,
      paste: (result.current as any).paste,
      clear: (result.current as any).clear,
      canPaste: (result.current as any).canPaste,
    };

    rerender();

    expect((result.current as any).copy).toBe(firstRenderCallbacks.copy);
    expect((result.current as any).cut).toBe(firstRenderCallbacks.cut);
    expect((result.current as any).paste).toBe(firstRenderCallbacks.paste);
    expect((result.current as any).clear).toBe(firstRenderCallbacks.clear);
    expect((result.current as any).canPaste).toBe(
      firstRenderCallbacks.canPaste,
    );
  });
});
