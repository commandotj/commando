import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";

// Mock the useAppSelector hook
jest.mock("../../app/hooks", () => ({
    useAppSelector: jest.fn(),
    useAppDispatch: jest.fn(),
}));

describe("useKeyboardShortcuts", () => {
    const mockOnCopyToOtherPane = jest.fn();
    const mockOnMoveToOtherPane = jest.fn();
    const mockOnRefresh = jest.fn();

    const defaultProps = {
        onCopyToOtherPane: mockOnCopyToOtherPane,
        onMoveToOtherPane: mockOnMoveToOtherPane,
        onRefresh: mockOnRefresh,
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock useAppSelector to return default state
        const { useAppSelector } = require("../../app/hooks");
        useAppSelector.mockReturnValue({
            activePane: 0,
            panes: {
                0: { selectedKeys: [] },
                1: { selectedKeys: [] },
            },
        });
    });

    afterEach(() => {
        // Clean up event listeners
        document.removeEventListener("keydown", jest.fn());
    });

    it("calls onCopyToOtherPane when F5 is pressed with selection", () => {
        const { useAppSelector } = require("../../app/hooks");
        useAppSelector.mockReturnValue({
            activePane: 0,
            panes: {
                0: { selectedKeys: ["/path/file1.txt"] },
                1: { selectedKeys: [] },
            },
        });

        renderHook(() => useKeyboardShortcuts(defaultProps));

        const event = new KeyboardEvent("keydown", { key: "F5" });
        document.dispatchEvent(event);

        expect(mockOnCopyToOtherPane).toHaveBeenCalled();
    });

    it("calls onMoveToOtherPane when F6 is pressed with selection", () => {
        const { useAppSelector } = require("../../app/hooks");
        useAppSelector.mockReturnValue({
            activePane: 0,
            panes: {
                0: { selectedKeys: ["/path/file1.txt"] },
                1: { selectedKeys: [] },
            },
        });

        renderHook(() => useKeyboardShortcuts(defaultProps));

        const event = new KeyboardEvent("keydown", { key: "F6" });
        document.dispatchEvent(event);

        expect(mockOnMoveToOtherPane).toHaveBeenCalled();
    });

    it("calls onRefresh when F5 is pressed without selection", () => {
        const { useAppSelector } = require("../../app/hooks");
        useAppSelector.mockReturnValue({
            activePane: 0,
            panes: {
                0: { selectedKeys: [] },
                1: { selectedKeys: [] },
            },
        });

        renderHook(() => useKeyboardShortcuts(defaultProps));

        const event = new KeyboardEvent("keydown", { key: "F5" });
        document.dispatchEvent(event);

        expect(mockOnRefresh).toHaveBeenCalled();
    });

    it("calls onCopyToOtherPane when Ctrl+C is pressed with selection", () => {
        const { useAppSelector } = require("../../app/hooks");
        useAppSelector.mockReturnValue({
            activePane: 0,
            panes: {
                0: { selectedKeys: ["/path/file1.txt"] },
                1: { selectedKeys: [] },
            },
        });

        renderHook(() => useKeyboardShortcuts(defaultProps));

        const event = new KeyboardEvent("keydown", {
            key: "c",
            ctrlKey: true,
        });
        document.dispatchEvent(event);

        expect(mockOnCopyToOtherPane).toHaveBeenCalled();
    });

    it("calls onMoveToOtherPane when Ctrl+X is pressed with selection", () => {
        const { useAppSelector } = require("../../app/hooks");
        useAppSelector.mockReturnValue({
            activePane: 0,
            panes: {
                0: { selectedKeys: ["/path/file1.txt"] },
                1: { selectedKeys: [] },
            },
        });

        renderHook(() => useKeyboardShortcuts(defaultProps));

        const event = new KeyboardEvent("keydown", {
            key: "x",
            ctrlKey: true,
        });
        document.dispatchEvent(event);

        expect(mockOnMoveToOtherPane).toHaveBeenCalled();
    });

    it("does not trigger shortcuts when target is input element", () => {
        const { useAppSelector } = require("../../app/hooks");
        useAppSelector.mockReturnValue({
            activePane: 0,
            panes: {
                0: { selectedKeys: ["/path/file1.txt"] },
                1: { selectedKeys: [] },
            },
        });

        renderHook(() => useKeyboardShortcuts(defaultProps));

        // Create a mock input element
        const input = document.createElement("input");
        document.body.appendChild(input);

        // Mock the event target
        const event = new KeyboardEvent("keydown", { key: "F5" });
        Object.defineProperty(event, "target", {
            value: input,
            writable: false,
        });

        document.dispatchEvent(event);

        expect(mockOnCopyToOtherPane).not.toHaveBeenCalled();

        document.body.removeChild(input);
    });

    it("prevents default behavior for handled keys", () => {
        const { useAppSelector } = require("../../app/hooks");
        useAppSelector.mockReturnValue({
            activePane: 0,
            panes: {
                0: { selectedKeys: ["/path/file1.txt"] },
                1: { selectedKeys: [] },
            },
        });

        renderHook(() => useKeyboardShortcuts(defaultProps));

        const event = new KeyboardEvent("keydown", { key: "F5" });
        const preventDefaultSpy = jest.spyOn(event, "preventDefault");

        document.dispatchEvent(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
    });
});
