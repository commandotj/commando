import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ConflictResolutionModal from "../ConflictResolutionModal";
import { ConflictInfo } from "../../app/fileOperationsSlice";

// Mock Radix UI Dialog
jest.mock("@radix-ui/react-dialog", () => ({
    Root: ({ children, open, onOpenChange }: any) =>
        open ? <div data-testid="dialog-root">{children}</div> : null,
    Portal: ({ children }: any) => (
        <div data-testid="dialog-portal">{children}</div>
    ),
    Overlay: ({ children }: any) => (
        <div data-testid="dialog-overlay">{children}</div>
    ),
    Content: ({ children }: any) => (
        <div data-testid="dialog-content">{children}</div>
    ),
    Title: ({ children }: any) => (
        <div data-testid="dialog-title">{children}</div>
    ),
}));

describe("ConflictResolutionModal", () => {
    const mockConflicts: ConflictInfo[] = [
        {
            source: "/path/source.txt",
            destination: "/path/destination.txt",
            sourceSize: 1024,
            destinationSize: 2048,
            sourceModified: 1640995200000,
            destinationModified: 1640995200000,
        },
    ];

    const defaultProps = {
        open: true,
        conflicts: mockConflicts,
        onResolve: jest.fn(),
        onCancel: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders conflict information correctly", () => {
        render(<ConflictResolutionModal {...defaultProps} />);

        expect(screen.getByText("文件冲突处理 (1/1)")).toBeInTheDocument();
        expect(
            screen.getByText("源文件: /path/source.txt")
        ).toBeInTheDocument();
        expect(
            screen.getByText("目标文件: /path/destination.txt")
        ).toBeInTheDocument();
    });

    it("displays file size and modification time", () => {
        render(<ConflictResolutionModal {...defaultProps} />);

        expect(screen.getByText("大小: 1 KB")).toBeInTheDocument();
        expect(screen.getByText("大小: 2 KB")).toBeInTheDocument();
    });

    it("handles resolution selection", () => {
        render(<ConflictResolutionModal {...defaultProps} />);

        const overwriteRadio = screen.getByLabelText("覆盖目标文件");
        fireEvent.click(overwriteRadio);

        expect(overwriteRadio).toBeChecked();
    });

    it("handles apply to all checkbox", () => {
        render(<ConflictResolutionModal {...defaultProps} />);

        const applyToAllCheckbox =
            screen.getByLabelText("将此选择应用到所有冲突");
        fireEvent.click(applyToAllCheckbox);

        expect(applyToAllCheckbox).toBeChecked();
    });

    it("shows rename input when rename is selected", () => {
        render(<ConflictResolutionModal {...defaultProps} />);

        const renameRadio = screen.getByLabelText("重命名源文件");
        fireEvent.click(renameRadio);

        expect(screen.getByText("新文件名:")).toBeInTheDocument();
    });

    it("calls onCancel when cancel button is clicked", () => {
        render(<ConflictResolutionModal {...defaultProps} />);

        const cancelButton = screen.getByText("取消");
        fireEvent.click(cancelButton);

        expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it("calls onResolve with correct resolutions when completed", () => {
        render(<ConflictResolutionModal {...defaultProps} />);

        const overwriteRadio = screen.getByLabelText("覆盖目标文件");
        fireEvent.click(overwriteRadio);

        const completeButton = screen.getByText("完成");
        fireEvent.click(completeButton);

        expect(defaultProps.onResolve).toHaveBeenCalledWith({
            "/path/source.txt": {
                action: "overwrite",
                applyToAll: false,
            },
        });
    });

    it("handles multiple conflicts navigation", () => {
        const multipleConflicts: ConflictInfo[] = [
            {
                source: "/path/file1.txt",
                destination: "/path/dest1.txt",
                sourceSize: 1024,
                destinationSize: 2048,
                sourceModified: 1640995200000,
                destinationModified: 1640995200000,
            },
            {
                source: "/path/file2.txt",
                destination: "/path/dest2.txt",
                sourceSize: 2048,
                destinationSize: 1024,
                sourceModified: 1640995200000,
                destinationModified: 1640995200000,
            },
        ];

        render(
            <ConflictResolutionModal
                {...defaultProps}
                conflicts={multipleConflicts}
            />
        );

        expect(screen.getByText("文件冲突处理 (1/2)")).toBeInTheDocument();

        const nextButton = screen.getByText("下一个");
        fireEvent.click(nextButton);

        expect(screen.getByText("文件冲突处理 (2/2)")).toBeInTheDocument();
    });
});
