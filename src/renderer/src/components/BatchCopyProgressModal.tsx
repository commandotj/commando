import React, { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Progress from "@radix-ui/react-progress";

interface BatchCopyProgressModalProps {
    open: boolean;
    srcs: string[];
    dest: string;
    onClose: () => void;
}

type FileProgress = {
    file: string;
    status: "pending" | "running" | "done" | "error";
    progress: number; // 0-100
    error?: string;
};

type BatchStatus = "running" | "done" | "canceled" | "error";

const BatchCopyProgressModal: React.FC<BatchCopyProgressModalProps> = ({
    open,
    srcs,
    dest,
    onClose,
}) => {
    const [taskId, setTaskId] = useState<string | null>(null);
    const [fileProgressList, setFileProgressList] = useState<FileProgress[]>(
        []
    );
    const [status, setStatus] = useState<BatchStatus>("running");
    const [canceling, setCanceling] = useState(false);
    const progressRef = useRef<Record<string, FileProgress>>({});

    // 发起批量复制请求
    useEffect(() => {
        if (!open) return;
        setFileProgressList(
            srcs.map((f) => ({ file: f, status: "pending", progress: 0 }))
        );
        setStatus("running");
        setCanceling(false);
        setTaskId(null);
        progressRef.current = {};
        // 发起请求
        (async () => {
            try {
                // @ts-ignore: electron API
                const id = await window.fsApi.copyBatch(srcs, dest);
                setTaskId(id);
            } catch {
                setStatus("error");
            }
        })();
    }, [open, srcs, dest]);

    // 监听进度事件
    useEffect(() => {
        if (!open) return;
        function onProgress(_: unknown, msg: any): void {
            if (!msg || !msg.taskId || msg.taskId !== taskId) return;
            if (msg.type === "progress") {
                const percent =
                    msg.fileProgress &&
                    typeof msg.fileProgress.copied === "number" &&
                    typeof msg.fileProgress.total === "number"
                        ? Math.floor(
                              (msg.fileProgress.copied /
                                  msg.fileProgress.total) *
                                  100
                          )
                        : msg.fileProgress && msg.fileProgress.error
                          ? 0
                          : 100;
                progressRef.current[msg.file] = {
                    file: msg.file,
                    status:
                        msg.status === "error"
                            ? "error"
                            : percent === 100
                              ? "done"
                              : "running",
                    progress: percent,
                    error: msg.fileProgress && msg.fileProgress.error,
                };
                setFileProgressList(
                    srcs.map(
                        (f) =>
                            progressRef.current[f] || {
                                file: f,
                                status: "pending",
                                progress: 0,
                            }
                    )
                );
            } else if (msg.type === "done") {
                setStatus(msg.status === "canceled" ? "canceled" : "done");
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
    }, [open, srcs, taskId]);

    // 取消操作
    const handleCancel = (): void => {
        if (!taskId) return;
        setCanceling(true);
        // @ts-ignore: electron API
        window.fsApi.cancelCopyBatch(taskId);
    };

    // 关闭操作
    const handleClose = (): void => {
        if (status === "running" && !canceling) return;
        onClose();
    };

    // 总进度百分比
    const total = srcs.length;
    const overallPercent =
        total === 0
            ? 0
            : Math.floor(
                  (fileProgressList.filter((fp) => fp.status === "done")
                      .length /
                      total) *
                      100
              );

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(v) => {
                if (!v) handleClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
                <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-xl p-6 focus:outline-none">
                    <Dialog.Title className="text-lg font-bold mb-4">
                        批量复制进度
                    </Dialog.Title>
                    <div className="mb-4">
                        <div className="flex justify-between mb-1">
                            <span>总进度</span>
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
                    <div className="max-h-64 overflow-y-auto mb-4">
                        {fileProgressList.map((fp) => (
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
                                {fp.error && (
                                    <div className="text-xs text-red-500 mt-1">
                                        {fp.error}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
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
                                关闭
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
                            发生错误
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default BatchCopyProgressModal;
