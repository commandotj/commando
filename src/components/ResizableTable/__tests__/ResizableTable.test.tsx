import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { ResizableTable } from "../index";

// Mock window.matchMedia for Ant Design Table
beforeAll(() => {
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
});

// Mock columns and data
const columns = [
    { title: "Name", dataIndex: "name", key: "name", width: 100 },
    { title: "Size", dataIndex: "size", key: "size", width: 100 },
];
const data = [
    { key: 1, name: "file1.txt", size: 123 },
    { key: 2, name: "file2.txt", size: 456 },
];

describe("ResizableTable - Drag Overlay", () => {
    it("should visually track the mouse position with the overlay during drag, even if state lags", () => {
        // We'll need to simulate drag start, move, and check overlay position
        // This is a placeholder for the actual implementation, which will depend on the overlay logic
        // For now, just render and check the overlay appears on drag start
        const handleColumnsChange = jest.fn();
        const { container } = render(
            <ResizableTable
                columns={columns}
                dataSource={data}
                onColumnsChange={handleColumnsChange}
            />
        );

        // Find the resize handle (should be the last child of the first column header)
        const headerCells = container.querySelectorAll("th");
        const resizeHandle = headerCells[0].querySelector("div");
        expect(resizeHandle).toBeInTheDocument();

        // Simulate drag start (mousedown)
        fireEvent.mouseDown(resizeHandle!);
        // Simulate mouse move
        fireEvent.mouseMove(document, { clientX: 200 });
        // Overlay should appear
        const overlay = container.querySelector(".resize-overlay");
        expect(overlay).toBeInTheDocument();
        // Optionally, check overlay position (style.left or transform)
        // This will be implemented after overlay logic is updated
    });
});
