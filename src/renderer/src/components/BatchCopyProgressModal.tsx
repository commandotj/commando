import React, { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Progress from "@radix-ui/react-progress";

interface BatchCopyProgressModalProps {
    open: boolean;
    srcs: string[];
    dest: string;
    taskId?: string | null;
    onClose: () => void;
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

const BatchCopyProgressModal: React.FC<BatchCopyProgressModalProps> = ({
    open,
    srcs,
    dest,
    taskId: taskIdProp,
    onClose,
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
    const [failedItems, setFailedItems] = useState<Array<{ file: string; error: string }>>([]);

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
        function onProgress(_: unknown, msg: unknown): void {
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
                        status:
                            fileHasError
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
        // @ts-ignore: electron API
        window.electron?.ipcRenderer?.on("copy-batch-progress", onProgress);
        return () => {
            // @ts-ignore: electron API
            window.electron?.ipcRenderer?.removeListener(
                "copy-batch-progress",
                onProgress
            );
        };
    }, [open, srcs, dest]);

    // 取消操作
    const handleCancel = (): void => {
        const activeTaskId = taskIdRef.current ?? taskIdProp ?? taskId;
        if (!activeTaskId) return;
        setCanceling(true);
        // @ts-ignore: electron API
        window.fsApi.cancelCopyBatch(activeTaskId);
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
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
                <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-xl p-6 focus:outline-none">
                    <Dialog.Title className="text-lg font-bold mb-4">
                        批量复制进度
                    </Dialog.Title>
                    <Dialog.Description className="sr-only">
                        显示当前批量复制任务的整体进度、每个文件的状态以及失败信息。
                    </Dialog.Description>
                    <div className="mb-4">
                        <div className="flex justify-between mb-1">
                            <span>批次进度</span>
                            <span>{overallPercent}%</span>
                        </div>
                        <Progress.Root
                            value={overallPercent}
                            max={100}
                            className="w-full bg-gray-200 rounded h-3 overflow-hidden"
                        >
                            <Progress.Indicator
                                className="bg-blue-500 h-3 transition-all duration-300"
                                style={{ width: `${overallPercent}%` }}
                            />
                        </Progress.Root>
                    </div>
                    <div className="max-h-48 overflow-y-auto mb-4 border border-gray-100 dark:border-gray-700 rounded p-2 bg-gray-50 dark:bg-gray-900">
                        <div className="mb-2 font-semibold text-sm">
                            文件进度
                        </div>
                        {fileProgressList.map(fp => (
                            <div key={fp.file} className="mb-2">
                                <div className="flex justify-between text-sm">
                                    <span
                                        className="truncate max-w-xs"
                                        title={fp.file}
                                    >
                                        {fp.file}
                                    </span>
                                    <span>
                                        {fp.status === "done" && (
                                            <span className="text-green-600">
                                                完成
                                            </span>
                                        )}
                                        {fp.status === "error" && (
                                            <span className="text-red-600">
                                                失败
                                            </span>
                                        )}
                                        {fp.status === "running" && (
                                            <span className="text-blue-600">
                                                进行中
                                            </span>
                                        )}
                                        {fp.status === "pending" && (
                                            <span className="text-gray-400">
                                                等待
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <Progress.Root
                                    value={fp.progress}
                                    max={100}
                                    className="w-full bg-gray-100 rounded h-2 overflow-hidden mt-1"
                                >
                                    <Progress.Indicator
                                        className={
                                            fp.status === "error"
                                                ? "bg-red-400"
                                                : fp.status === "done"
                                                  ? "bg-green-400"
                                                  : "bg-blue-400"
                                        }
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
                        <div className="mb-4 text-sm text-red-600 dark:text-red-400">
                            <div className="font-semibold mb-1">
                                失败条目 ({failedItems.length})
                            </div>
                            <ul className="space-y-1 max-h-24 overflow-y-auto">
                                {failedItems.map(item => (
                                    <li
                                        key={`${item.file}-${item.error}`}
                                        className="truncate"
                                        title={`${item.file}: ${item.error}`}
                                    >
                                        {item.file}: {item.error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        {status === "running" && !canceling && (
                            <button
                                className="px-4 py-2 bg-yellow-500 text-white rounded"
                                onClick={handleCancel}
                            >
                                取消
                            </button>
                        )}
                        <Dialog.Close asChild>
                            <button
                                className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50"
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
                        <div className="text-center text-yellow-600 mt-2">
                            已取消
                        </div>
                    )}
                    {status === "done" && (
                        <div className="text-center text-green-600 mt-2">
                            全部完成
                        </div>
                    )}
                    {status === "error" && (
                        <div className="text-center text-red-600 mt-2">
                            部分文件复制失败
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
            {/* 错误确认弹窗 */}
            <Dialog.Root
                open={!!errorModal}
                onOpenChange={v => !v && setErrorModal(null)}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-60 bg-black/40" />
                    <Dialog.Content className="fixed z-60 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-sm p-6 focus:outline-none">
                        <Dialog.Title className="text-lg font-bold mb-4 text-red-600">
                            复制错误
                        </Dialog.Title>
                        <div className="mb-4 text-sm text-red-500 break-all">
                            {errorModal}
                        </div>
                        <div className="flex justify-end">
                            <button
                                className="px-4 py-2 bg-red-500 text-white rounded"
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
