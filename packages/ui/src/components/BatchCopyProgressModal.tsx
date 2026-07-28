import React, { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Progress from "@radix-ui/react-progress";

interface BatchCopyProgressModalProps {
    open: boolean;
    srcs: string[];
    dest: string;
    taskId?: string | null;
    onClose: () => void;
    operationType?: "copy" | "move";
}

type FileProgress = {
    file: string;
    status: "pending" | "running" | "done" | "error";
    progress: number; // 0-100
    error?: string;
};

type BatchStatus = "running" | "done" | "canceled" | "error";

// 定义进度消息类型
interface BatchProgressMsg {
    taskId: string;
    type: "progress" | "done";
    current: number;
    total: number;
    file?: string;
    fileProgress?: {
        copied?: number;
        total?: number;
        error?: string;
    };
    status?: "running" | "done" | "canceled" | "error";
    results?: Array<{
        source: string;
        destination?: string;
        success: boolean;
        error?: string;
    }>;
}

const progressIndicatorClass = (status: FileProgress["status"]): string => {
    if (status === "error")
        return "cmd-progress__indicator cmd-progress__indicator--danger";
    if (status === "done")
        return "cmd-progress__indicator cmd-progress__indicator--success";
    return "cmd-progress__indicator cmd-progress__indicator--muted";
};

const BatchCopyProgressModal: React.FC<BatchCopyProgressModalProps> = ({
    open,
    srcs,
    dest,
    taskId: taskIdProp,
    onClose,
    operationType: _operationType = "copy",
}) => {
    const [taskId, setTaskId] = useState<string | null>(null);
    const [fileProgressList, setFileProgressList] = useState<FileProgress[]>(
        []
    );
    const [status, setStatus] = useState<BatchStatus>("running");
    const [canceling, setCanceling] = useState(false);
    const progressRef = useRef<Record<string, FileProgress>>({});
    const taskIdRef = useRef<string | null>(null);
    const PENDING_ID = "__pending__";
    const requestSignatureRef = useRef<string | null>(null);
    const [overallPercent, setOverallPercent] = useState(0);
    const [errorModal, setErrorModal] = useState<string | null>(null);
    const [failedItems, setFailedItems] = useState<
        Array<{ file: string; error: string }>
    >([]);
    const [currentFileProgress, setCurrentFileProgress] = useState(0);
    const [currentFileName, setCurrentFileName] = useState<string>("");
    const [_speed, _setSpeed] = useState<string>("");
    const [_timeRemaining, _setTimeRemaining] = useState<string>("");
    const [bytesProcessed, setBytesProcessed] = useState(0);
    const [totalBytes, setTotalBytes] = useState(0);

    // 重置本地进度状态
    useEffect(() => {
        if (!open) {
            requestSignatureRef.current = null;
            taskIdRef.current = null;
            return;
        }

        const signature = JSON.stringify([srcs, dest]);
        if (requestSignatureRef.current === signature) {
            return;
        }

        requestSignatureRef.current = signature;
        progressRef.current = {};
        taskIdRef.current = PENDING_ID;
        setTaskId(null);
        setStatus("running");
        setCanceling(false);
        setFailedItems([]);
        setOverallPercent(0);
        setFileProgressList(
            srcs.map(f => ({ file: f, status: "pending", progress: 0 }))
        );
    }, [open, srcs, dest]);

    // 同步外部 taskId
    useEffect(() => {
        if (!open) return;
        if (taskIdProp && taskIdProp !== PENDING_ID) {
            taskIdRef.current = taskIdProp;
            setTaskId(taskIdProp);
        }
    }, [open, taskIdProp]);

    // 监听进度事件
    useEffect(() => {
        if (!open) {
            return;
        }
        function onProgress(msg: unknown): void {
            const batchMsg = msg as BatchProgressMsg;
            if (!batchMsg || !batchMsg.taskId) {
                return;
            }

            if (taskIdRef.current === PENDING_ID) {
                taskIdRef.current = batchMsg.taskId;
                setTaskId(batchMsg.taskId);
            }

            if (taskIdRef.current !== batchMsg.taskId) {
                return;
            }
            if (batchMsg.type === "progress") {
                if (
                    typeof batchMsg.current === "number" &&
                    typeof batchMsg.total === "number" &&
                    batchMsg.total > 0
                ) {
                    setOverallPercent(
                        Math.max(
                            0,
                            Math.min(
                                100,
                                Math.floor(
                                    (batchMsg.current / batchMsg.total) * 100
                                )
                            )
                        )
                    );
                }
                if (batchMsg.file) {
                    const percent =
                        batchMsg.fileProgress &&
                        typeof batchMsg.fileProgress.copied === "number" &&
                        typeof batchMsg.fileProgress.total === "number"
                            ? Math.floor(
                                  (batchMsg.fileProgress.copied /
                                      batchMsg.fileProgress.total) *
                                      100
                              )
                            : batchMsg.fileProgress &&
                                batchMsg.fileProgress.error
                              ? 0
                              : 100;
                    const fileHasError = Boolean(batchMsg.fileProgress?.error);
                    progressRef.current[batchMsg.file] = {
                        file: batchMsg.file,
                        status: fileHasError
                            ? "error"
                            : percent === 100
                              ? "done"
                              : "running",
                        progress: percent,
                        error:
                            batchMsg.fileProgress &&
                            batchMsg.fileProgress.error,
                    };
                    setFileProgressList(
                        srcs.map(
                            f =>
                                progressRef.current[f] || {
                                    file: f,
                                    status: "pending",
                                    progress: 0,
                                }
                        )
                    );

                    // 更新当前文件信息
                    setCurrentFileName(batchMsg.file);
                    setCurrentFileProgress(percent);

                    if (batchMsg.fileProgress) {
                        setBytesProcessed(batchMsg.fileProgress.copied || 0);
                        setTotalBytes(batchMsg.fileProgress.total || 0);
                    }

                    if (
                        batchMsg.status === "error" &&
                        batchMsg.fileProgress?.error
                    ) {
                        setErrorModal(batchMsg.fileProgress.error);
                        setFailedItems(prev => {
                            const existing = prev.find(
                                item => item.file === batchMsg.file
                            );
                            if (existing) {
                                return prev.map(item =>
                                    item.file === batchMsg.file
                                        ? {
                                              file: batchMsg.file as string,
                                              error:
                                                  batchMsg.fileProgress
                                                      ?.error ??
                                                  "Unknown error",
                                          }
                                        : item
                                );
                            }
                            return [
                                ...prev,
                                {
                                    file: batchMsg.file as string,
                                    error:
                                        batchMsg.fileProgress?.error ??
                                        "Unknown error",
                                },
                            ];
                        });
                    }
                }
            } else if (batchMsg.type === "done") {
                if (batchMsg.status === "error") {
                    setStatus("error");
                    if (Array.isArray(batchMsg.results)) {
                        setFailedItems(
                            batchMsg.results
                                .filter(item => !item.success)
                                .map(item => ({
                                    file: item.source,
                                    error: item.error ?? "Unknown error",
                                }))
                        );
                    }
                } else {
                    setStatus(
                        batchMsg.status === "canceled" ? "canceled" : "done"
                    );
                }
                setOverallPercent(100);
            }
        }
        window.fsApi.onCopyBatchProgress(onProgress);
        return () => {
            // Wails Events.On listeners are process-lifetime; no remove API yet.
        };
    }, [open, srcs, dest]);

    // 取消操作
    const handleCancel = (): void => {
        const activeTaskId = taskIdRef.current ?? taskIdProp ?? taskId;
        if (!activeTaskId) return;
        setCanceling(true);
        void window.fsApi.cancelCopyBatch(activeTaskId);
    };

    // 关闭操作
    const handleClose = (): void => {
        if (status === "running" && !canceling) return;
        onClose();
        taskIdRef.current = null;
        requestSignatureRef.current = null;
    };

    return (
        <Dialog.Root
            open={open}
            onOpenChange={v => {
                if (!v) handleClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="cmd-dialog-overlay" />
                <Dialog.Content className="cmd-dialog-content">
                    <Dialog.Title className="cmd-dialog-title">
                        批量复制进度
                    </Dialog.Title>
                    <Dialog.Description className="cmd-sr-only">
                        显示当前批量复制任务的整体进度、每个文件的状态以及失败信息。
                    </Dialog.Description>
                    <div className="cmd-dialog-section">
                        <div className="cmd-progress-row">
                            <span>批次进度</span>
                            <span>{overallPercent}%</span>
                        </div>
                        <Progress.Root
                            value={overallPercent}
                            max={100}
                            className="cmd-progress"
                        >
                            <Progress.Indicator
                                className="cmd-progress__indicator"
                                style={{ width: `${overallPercent}%` }}
                            />
                        </Progress.Root>
                    </div>
                    {currentFileName && (
                        <div className="cmd-progress-panel">
                            <div className="cmd-progress-panel__title">
                                当前文件: {currentFileName}
                            </div>
                            <Progress.Root
                                value={currentFileProgress}
                                max={100}
                                className="cmd-progress cmd-progress--sm cmd-dialog-section"
                            >
                                <Progress.Indicator
                                    className="cmd-progress__indicator"
                                    style={{ width: `${currentFileProgress}%` }}
                                />
                            </Progress.Root>
                            <div className="cmd-text-xs cmd-text-link">
                                {bytesProcessed > 0 && totalBytes > 0 && (
                                    <span>
                                        {Math.round(
                                            (bytesProcessed / 1024 / 1024) * 100
                                        ) / 100}{" "}
                                        MB /{" "}
                                        {Math.round(
                                            (totalBytes / 1024 / 1024) * 100
                                        ) / 100}{" "}
                                        MB
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="cmd-progress-list">
                        <div className="cmd-progress-list__title">文件进度</div>
                        {fileProgressList.map(fp => (
                            <div
                                key={fp.file}
                                className="cmd-progress-list__item"
                            >
                                <div className="cmd-progress-list__row">
                                    <span
                                        className="cmd-progress-list__name"
                                        title={fp.file}
                                    >
                                        {fp.file}
                                    </span>
                                    <span>
                                        {fp.status === "done" && (
                                            <span className="cmd-text-success">
                                                完成
                                            </span>
                                        )}
                                        {fp.status === "error" && (
                                            <span className="cmd-text-danger">
                                                失败
                                            </span>
                                        )}
                                        {fp.status === "running" && (
                                            <span className="cmd-text-link">
                                                进行中
                                            </span>
                                        )}
                                        {fp.status === "pending" && (
                                            <span className="cmd-text-muted">
                                                等待
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <Progress.Root
                                    value={fp.progress}
                                    max={100}
                                    className="cmd-progress cmd-progress--sm"
                                >
                                    <Progress.Indicator
                                        className={progressIndicatorClass(
                                            fp.status
                                        )}
                                        style={{
                                            width: `${fp.progress}%`,
                                            height: "100%",
                                        }}
                                    />
                                </Progress.Root>
                            </div>
                        ))}
                    </div>
                    {failedItems.length > 0 && status !== "running" && (
                        <div className="cmd-dialog-section cmd-text-sm cmd-text-danger">
                            <div className="cmd-font-semibold cmd-dialog-section">
                                失败条目 ({failedItems.length})
                            </div>
                            <ul className="cmd-error-list">
                                {failedItems.map(item => (
                                    <li
                                        key={`${item.file}-${item.error}`}
                                        className="cmd-error-list__item"
                                        title={`${item.file}: ${item.error}`}
                                    >
                                        {item.file}: {item.error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="cmd-dialog-footer">
                        {status === "running" && !canceling && (
                            <button
                                type="button"
                                className="cmd-btn cmd-btn--warning"
                                onClick={handleCancel}
                            >
                                取消
                            </button>
                        )}
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="cmd-btn cmd-btn--secondary"
                                onClick={handleClose}
                                disabled={status === "running" && !canceling}
                            >
                                {status === "running"
                                    ? canceling
                                        ? "正在取消"
                                        : "后台执行"
                                    : "关闭"}
                            </button>
                        </Dialog.Close>
                    </div>
                    {status === "canceled" && (
                        <div className="cmd-text-center cmd-text-warning cmd-status-label">
                            已取消
                        </div>
                    )}
                    {status === "done" && (
                        <div className="cmd-text-center cmd-text-success cmd-status-label">
                            全部完成
                        </div>
                    )}
                    {status === "error" && (
                        <div className="cmd-text-center cmd-text-danger cmd-status-label">
                            部分文件复制失败
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
            <Dialog.Root
                open={!!errorModal}
                onOpenChange={v => !v && setErrorModal(null)}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className="cmd-dialog-overlay cmd-dialog-overlay--raised" />
                    <Dialog.Content className="cmd-dialog-content cmd-dialog-content--sm cmd-dialog-content--raised">
                        <Dialog.Title className="cmd-dialog-title cmd-dialog-title--danger">
                            复制错误
                        </Dialog.Title>
                        <div className="cmd-dialog-section cmd-text-sm cmd-text-danger cmd-break-all">
                            {errorModal}
                        </div>
                        <div className="cmd-dialog-footer">
                            <button
                                type="button"
                                className="cmd-btn cmd-btn--danger"
                                onClick={() => setErrorModal(null)}
                            >
                                确认
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </Dialog.Root>
    );
};

export default BatchCopyProgressModal;
