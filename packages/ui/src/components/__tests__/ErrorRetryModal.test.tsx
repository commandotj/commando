import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorRetryModal from "../ErrorRetryModal";

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

describe("ErrorRetryModal", () => {
    const defaultProps = {
        open: true,
        error: "File not found",
        fileName: "/path/missing.txt",
        onRetry: jest.fn(),
        onSkip: jest.fn(),
        onCancel: jest.fn(),
        retryCount: 1,
        maxRetries: 3,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders error information correctly", () => {
        render(<ErrorRetryModal {...defaultProps} />);

        expect(screen.getByText("操作失败")).toBeInTheDocument();
        expect(screen.getByText("文件: /path/missing.txt")).toBeInTheDocument();
        expect(screen.getByText("错误: File not found")).toBeInTheDocument();
        expect(screen.getByText("重试次数: 1/3")).toBeInTheDocument();
    });

    it("shows retry option when retries are available", () => {
        render(<ErrorRetryModal {...defaultProps} />);

        expect(screen.getByLabelText("重试操作")).toBeInTheDocument();
        expect(screen.getByText("重试")).toBeInTheDocument();
    });

    it("hides retry option when max retries reached", () => {
        const propsWithMaxRetries = {
            ...defaultProps,
            retryCount: 3,
            maxRetries: 3,
        };

        render(<ErrorRetryModal {...propsWithMaxRetries} />);

        expect(screen.queryByLabelText("重试操作")).not.toBeInTheDocument();
        expect(screen.getByText("跳过")).toBeInTheDocument();
    });

    it("handles apply to all checkbox", () => {
        render(<ErrorRetryModal {...defaultProps} />);

        const applyToAllCheckbox =
            screen.getByLabelText("将此选择应用到所有错误");
        fireEvent.click(applyToAllCheckbox);

        expect(applyToAllCheckbox).toBeChecked();
    });

    it("calls onCancel when cancel button is clicked", () => {
        render(<ErrorRetryModal {...defaultProps} />);

        const cancelButton = screen.getByText("取消");
        fireEvent.click(cancelButton);

        expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it("calls onRetry when retry is selected and button clicked", () => {
        render(<ErrorRetryModal {...defaultProps} />);

        const retryRadio = screen.getByLabelText("重试操作");
        fireEvent.click(retryRadio);

        const actionButton = screen.getByText("重试");
        fireEvent.click(actionButton);

        expect(defaultProps.onRetry).toHaveBeenCalled();
    });

    it("calls onSkip when skip is selected and button clicked", () => {
        render(<ErrorRetryModal {...defaultProps} />);

        const skipRadio = screen.getByLabelText("跳过此文件");
        fireEvent.click(skipRadio);

        const actionButton = screen.getByText("重试");
        fireEvent.click(actionButton);

        expect(defaultProps.onSkip).toHaveBeenCalled();
    });

    it("calls onCancel when cancel is selected and button clicked", () => {
        render(<ErrorRetryModal {...defaultProps} />);

        const cancelRadio = screen.getByLabelText("取消操作");
        fireEvent.click(cancelRadio);

        const actionButton = screen.getByText("取消");
        fireEvent.click(actionButton);

        expect(defaultProps.onCancel).toHaveBeenCalled();
    });
});
