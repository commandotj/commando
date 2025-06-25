import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BatchCopyProgressModal from "../BatchCopyProgressModal";
import type { CopyWorkerMessage } from "../../../../../typings/copy";

// 全局 mock
const mockFsApi = {
    copyBatch: jest.fn(),
    cancelCopyBatch: jest.fn(),
    onCopyBatchProgress: jest.fn(),
    // 添加其他需要的 fsApi 方法的 mock
    listDir: jest.fn(),
    getHomeDir: jest.fn(),
    listDrives: jest.fn(),
    copyFile: jest.fn(),
    onCopyProgress: jest.fn(),
    getCopyQueueStatus: jest.fn(),
    cancelCopyTask: jest.fn(),
};

const mockIpcRenderer = {
    on: jest.fn(),
    removeListener: jest.fn(),
};

beforeAll(() => {
    window.fsApi = mockFsApi;
    window.electron = {
        ipcRenderer: mockIpcRenderer,
    };
});

afterEach(() => {
    jest.clearAllMocks();
    mockFsApi.onCopyBatchProgress.mockClear();
});

describe("BatchCopyProgressModal", () => {
    const defaultProps = {
        open: true,
        srcs: ["/a.txt", "/b.txt"],
        dest: "/dest",
        onClose: jest.fn(),
    };

    it("renders and shows progress files", async () => {
        mockFsApi.copyBatch.mockResolvedValue("mock-batch-id");
        render(<BatchCopyProgressModal {...defaultProps} />);

        // 确保 onCopyBatchProgress 被调用以注册监听器
        await waitFor(() => {
            expect(mockFsApi.onCopyBatchProgress).toHaveBeenCalled();
        });

        expect(screen.getByText("批量复制进度")).toBeInTheDocument();
        expect(screen.getByText("文件进度")).toBeInTheDocument();
        expect(screen.getByText("/a.txt")).toBeInTheDocument();
        expect(screen.getByText("/b.txt")).toBeInTheDocument();
    });

    it("shows error modal on error event and can close it", async () => {
        render(<BatchCopyProgressModal {...defaultProps} srcs={["/a.txt"]} />);

        await waitFor(() => {
            expect(mockFsApi.onCopyBatchProgress).toHaveBeenCalled();
        });

        // 捕获传递给 onCopyBatchProgress 的回调
        const progressCallback = mockFsApi.onCopyBatchProgress.mock.calls[0][0];
        const errorMessage: CopyWorkerMessage = {
            type: "error",
            error: "复制失败",
        };
        const mockProgressEvent = {
            batchId: "mock-batch-id",
            type: "progress",
            file: "/a.txt",
            fileProgress: errorMessage,
            status: "error",
        };

        // 模拟事件
        progressCallback(mockProgressEvent);

        expect(await screen.findByText("复制错误")).toBeInTheDocument();
        expect(screen.getByText("复制失败")).toBeInTheDocument();
        fireEvent.click(screen.getByText("确认"));
        await waitFor(() => {
            expect(screen.queryByText("复制错误")).not.toBeInTheDocument();
        });
    });

    it("calls cancelCopyBatch on cancel button click", async () => {
        const batchId = "mock-batch-id-123";
        mockFsApi.copyBatch.mockResolvedValue(batchId);
        render(<BatchCopyProgressModal {...defaultProps} />);

        await waitFor(() => {
            expect(mockFsApi.copyBatch).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByText("取消"));
        expect(mockFsApi.cancelCopyBatch).toHaveBeenCalledWith(batchId);
    });

    it("calls onClose when close button is clicked", async () => {
        const onClose = jest.fn();
        render(<BatchCopyProgressModal {...defaultProps} onClose={onClose} />);
        fireEvent.click(screen.getByText("关闭"));
        expect(onClose).toHaveBeenCalled();
    });
});
