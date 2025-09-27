import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BatchCopyProgressModal from "../BatchCopyProgressModal";
import type { CopyWorkerMessage } from "../../../../../typings/copy";

// 全局 mock
const mockFsApi = {
  // 目录操作
  listDir: jest.fn(),
  navigate: jest.fn(),
  getCurrentDir: jest.fn(),
  goToParent: jest.fn(),
  getHistory: jest.fn(),
  refresh: jest.fn(),
  onDirectoryChanged: jest.fn(),

  // 文件系统操作
  getHomeDir: jest.fn(),
  listDrives: jest.fn(),
  refreshDrives: jest.fn(),
  getDriveDetails: jest.fn(),

  // 服务状态监听
  onServiceLoading: jest.fn(),
  onDriveLoading: jest.fn(),
  onDriveListChanged: jest.fn(),
  onDriveRefreshed: jest.fn(),
  onDriveChanged: jest.fn(),

  // 复制操作
  copyFile: jest.fn(),
  copyBatch: jest.fn(),
  onCopyProgress: jest.fn(),
  onCopyBatchProgress: jest.fn(),
  getCopyQueueStatus: jest.fn(),
  cancelCopyTask: jest.fn(),
  cancelCopyBatch: jest.fn(),
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
